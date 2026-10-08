# Stride API reference

One REST API serves both clients. Base path: `/api`. Every request and response body is JSON.

| Environment        | Base URL                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Local (`pnpm dev`) | `http://localhost:4000/api` (the web dev server proxies `http://localhost:5173/api` to it) |
| Deployed           | see [submission.md](submission.md)                                                         |

## Conventions

- **IDs** are UUIDs. A malformed id returns `400`; an id that does not exist **or belongs to another user** returns `404` (the API never reveals whether someone else's record exists).
- **Dates** (`startDate`, `endDate`, `dueDate`) are calendar days: `"YYYY-MM-DD"`. Impossible dates such as `2026-02-30` are rejected.
- **Timestamps** (`createdAt`, `updatedAt`) are ISO-8601 UTC strings.
- **Enums** use the exact values below; the UI labels are shown in brackets.
  - Project `status`: `NOT_STARTED` (Not Started), `IN_PROGRESS` (In Progress), `COMPLETED` (Completed)
  - Task `status`: `PENDING` (Pending), `IN_PROGRESS` (In Progress), `COMPLETED` (Completed)
  - Task `priority`: `LOW` (Low), `MEDIUM` (Medium), `HIGH` (High)
- **Unknown fields are rejected.** Bodies are validated with strict schemas from `packages/shared`, so fields such as `ownerId`, `userId` or (on update) `projectId` produce a `400`.
- **Request IDs:** every response carries `X-Request-Id`; send your own (8–64 chars, `[A-Za-z0-9-]`) to correlate logs.

## Authentication transports

Both transports issue the same JWT, backed by the same `auth_sessions` row, and pass through the same verification (signature, `HS256` only, issuer, audience, expiry, and an active, unrevoked session).

|                      | Web (browser)                                                                              | Mobile (Android)                                   |
| -------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| How to select        | default                                                                                    | send `X-Client-Platform: mobile` on register/login |
| Where the token goes | `Set-Cookie: stride_session=…; HttpOnly; SameSite=Lax; Path=/api` (`Secure` in production) | `token` field in the JSON response                 |
| How it is sent back  | the cookie, automatically                                                                  | `Authorization: Bearer <token>`                    |
| Client storage       | not readable by JavaScript                                                                 | Expo SecureStore (Android Keystore)                |
| CSRF protection      | writes must come from an allowed `Origin`                                                  | not needed (no ambient credential)                 |

The header only selects **where** the token travels; it never grants extra permissions.

**CSRF rule:** for `POST`/`PUT`/`DELETE`, a request whose `Origin` (or `Referer`) is not the server's own origin or listed in `CORS_ORIGINS` is rejected with `403 FORBIDDEN_ORIGIN`. A cookie-authenticated write with no `Origin` at all is also rejected. Native apps send neither the cookie nor an `Origin`, so they are unaffected.

**Rate limits:** `POST /auth/login` and `POST /auth/register` allow `AUTH_RATE_LIMIT_MAX` requests per IP per `AUTH_RATE_LIMIT_WINDOW_MINUTES` (defaults: 10 per 15 minutes). Successful logins do not count. Exceeding the limit returns `429 RATE_LIMITED` with standard `RateLimit` headers.

## Errors

Every error uses one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "fields": { "endDate": "End date cannot be before the start date." }
  }
}
```

`fields` is present only for field-level problems. Stack traces and database details are never returned.

| Status | `code`                | When                                                               |
| ------ | --------------------- | ------------------------------------------------------------------ |
| 400    | `VALIDATION_ERROR`    | invalid body, query or path parameter (see `fields`)               |
| 400    | `INVALID_JSON`        | body is not valid JSON                                             |
| 401    | `UNAUTHENTICATED`     | no session cookie or bearer token                                  |
| 401    | `INVALID_TOKEN`       | malformed token, wrong signature, issuer or audience               |
| 401    | `SESSION_EXPIRED`     | token or its session expired, or the session was revoked by logout |
| 401    | `INVALID_CREDENTIALS` | wrong email or password (same message for both)                    |
| 403    | `FORBIDDEN_ORIGIN`    | cross-site write blocked by the CSRF check                         |
| 404    | `NOT_FOUND`           | unknown route, or a record that does not exist / is not yours      |
| 409    | `EMAIL_TAKEN`         | registering an email that already exists (case-insensitive)        |
| 413    | `PAYLOAD_TOO_LARGE`   | body over 50 KB                                                    |
| 429    | `RATE_LIMITED`        | too many login/register attempts                                   |
| 500    | `INTERNAL_ERROR`      | unexpected failure (details only in server logs)                   |

---

## Health

| Method | Path                | Auth | Response                                                                     |
| ------ | ------------------- | ---- | ---------------------------------------------------------------------------- |
| GET    | `/api/health`       | none | `200 {"status":"ok"}` — process is up                                        |
| GET    | `/api/health/ready` | none | `200 {"status":"ok","database":"ok"}`, or `503` if PostgreSQL is unreachable |

## Auth

### `POST /api/auth/register`

```json
{ "fullName": "Ava Demo", "email": "Ava.Demo@stride.test", "password": "StrideDemo123!" }
```

- `fullName`: 1–100 characters after trimming.
- `email`: valid address, max 254 characters; trimmed and lower-cased before storage, so `AVA@x.com` and `ava@x.com` are the same account.
- `password`: at least 8 characters, not only spaces, at most 72 bytes in UTF-8 (bcrypt's limit — longer passwords are rejected rather than silently truncated).

`201 Created`:

```json
{
  "user": {
    "id": "9b1c…",
    "fullName": "Ava Demo",
    "email": "ava.demo@stride.test",
    "createdAt": "2026-10-08T18:05:15.756Z"
  },
  "expiresAt": "2026-10-09T06:05:15.756Z",
  "token": "eyJhbGciOiJIUzI1NiIs…"
}
```

`token` is present only with `X-Client-Platform: mobile`; web clients receive the cookie instead. Errors: `400`, `409 EMAIL_TAKEN`, `429`.

### `POST /api/auth/login`

```json
{ "email": "ava.demo@stride.test", "password": "StrideDemo123!" }
```

`200 OK` with the same body as register. Errors: `400`, `401 INVALID_CREDENTIALS`, `429`.

### `POST /api/auth/logout`

Revokes the session that sent the request (other sessions — e.g. the same user's phone — stay signed in) and clears the cookie. Always `204 No Content`, even if the session had already expired.

### `GET /api/auth/me`

`200 {"user": {…}}` for a valid session; `401` otherwise. Used by both apps on startup to confirm a stored session.

---

## Projects

All project routes require authentication and only ever touch the caller's projects.

### Project object

```json
{
  "id": "f49d14f6-3b16-4c0b-bce8-e8a4483a202b",
  "name": "Mobile banking redesign",
  "description": "Refresh onboarding and the payments flow.",
  "status": "IN_PROGRESS",
  "startDate": "2026-09-17",
  "endDate": "2026-11-01",
  "createdAt": "2026-10-08T18:05:15.756Z",
  "updatedAt": "2026-10-08T18:05:15.756Z",
  "taskCounts": { "total": 5, "completed": 1 }
}
```

### `GET /api/projects`

| Query    | Type                                                          | Default                                 | Notes                          |
| -------- | ------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| `search` | string ≤ 100                                                  | —                                       | case-insensitive match on name |
| `status` | project status                                                | —                                       |                                |
| `page`   | integer ≥ 1                                                   | `1`                                     |                                |
| `limit`  | integer 1–100                                                 | `20`                                    |                                |
| `sort`   | `createdAt` \| `name` \| `startDate` \| `endDate` \| `status` | `createdAt`                             | whitelisted                    |
| `order`  | `asc` \| `desc`                                               | `desc` for `createdAt`, otherwise `asc` |                                |

Filters combine (AND). Unknown query parameters return `400`.

`200 OK`:

```json
{
  "data": [{ "…": "project objects" }],
  "meta": { "page": 1, "limit": 20, "total": 4, "totalPages": 1 }
}
```

### `GET /api/projects/{id}`

`200 {"project": {…}}` · `400` malformed id · `404` not found / not yours.

### `POST /api/projects`

```json
{
  "name": "Website relaunch",
  "description": "New marketing site",
  "status": "NOT_STARTED",
  "startDate": "2026-10-01",
  "endDate": "2026-12-15"
}
```

`name` (1–120), `startDate` and `endDate` are required; `endDate` must not be before `startDate`. `description` (≤ 2000) defaults to `""`, `status` to `NOT_STARTED`. `201 {"project": {…}}`.

### `PUT /api/projects/{id}`

Send any subset of the create fields (at least one). Dates are checked against the stored values, so moving only `endDate` before the existing `startDate` is rejected. Project status is always set explicitly — it is not derived from task completion. `200 {"project": {…}}`.

### `DELETE /api/projects/{id}`

Deletes the project **and all of its tasks** (database cascade). `204` · `404`.

---

## Tasks

Tasks have no owner column; ownership is checked through the parent project (`project.ownerId`).

### Task object

```json
{
  "id": "0c7d…",
  "projectId": "f49d14f6-3b16-4c0b-bce8-e8a4483a202b",
  "project": { "id": "f49d14f6-…", "name": "Mobile banking redesign" },
  "name": "Draft payment confirmation states",
  "description": "",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "dueDate": "2026-10-10",
  "createdAt": "2026-10-08T18:05:15.756Z",
  "updatedAt": "2026-10-08T18:05:15.756Z"
}
```

### `GET /api/tasks`

| Query           | Type                                                         | Default                                            | Notes                                         |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------- |
| `search`        | string ≤ 100                                                 | —                                                  | case-insensitive match on name                |
| `projectId`     | UUID                                                         | —                                                  | must be one of your projects, otherwise `404` |
| `status`        | task status                                                  | —                                                  |                                               |
| `priority`      | task priority                                                | —                                                  |                                               |
| `page`, `limit` | integers                                                     | `1`, `20`                                          | `limit` ≤ 100                                 |
| `sort`          | `dueDate` \| `createdAt` \| `name` \| `priority` \| `status` | `dueDate`                                          | priority sorts Low < Medium < High            |
| `order`         | `asc` \| `desc`                                              | `desc` for `createdAt`/`priority`, otherwise `asc` |                                               |

Example: `GET /api/tasks?search=design&status=PENDING&priority=HIGH&sort=dueDate&order=asc&page=1&limit=15`

`200 {"data": [ …tasks ], "meta": { … }}` (same `meta` shape as projects).

### `GET /api/tasks/{id}`

`200 {"task": {…}}` · `400` · `404`.

### `POST /api/tasks`

```json
{
  "projectId": "f49d14f6-3b16-4c0b-bce8-e8a4483a202b",
  "name": "Write announcement",
  "description": "",
  "priority": "HIGH",
  "status": "PENDING",
  "dueDate": "2026-10-20"
}
```

`projectId`, `name` (1–160) and `dueDate` are required; `priority` defaults to `MEDIUM`, `status` to `PENDING`. Creating a task in someone else's project returns `404`. Due dates are not restricted to the project's date range (the assignment does not require it, and real tasks sometimes run late). `201 {"task": {…}}`.

### `PUT /api/tasks/{id}`

Any subset of `name`, `description`, `priority`, `status`, `dueDate` (at least one). Marking complete is `{"status": "COMPLETED"}`; reopening is `{"status": "PENDING"}`. `projectId` cannot be changed (`400`). `200 {"task": {…}}`.

### `DELETE /api/tasks/{id}`

`204` · `404`.

---

## Dashboard

### `GET /api/dashboard?today=YYYY-MM-DD`

`today` is optional — the client's local calendar day, so "overdue" matches what the user sees. Without it the server uses the current UTC date.

Counts are database aggregates over **all** of the caller's records, never a paginated subset.

```json
{
  "today": "2026-10-09",
  "metrics": {
    "totalProjects": 4,
    "totalTasks": 11,
    "completedTasks": 4,
    "pendingTasks": 5,
    "inProgressTasks": 2,
    "projectsInProgress": 2,
    "overdueTasks": 1
  },
  "activeProjects": [
    "…up to 5 projects that are not completed, in-progress first, then by end date"
  ],
  "upcomingTasks": ["…up to 6 incomplete tasks by due date; overdue ones first"]
}
```

| Metric               | Definition                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| Total Projects       | all projects you own                                                           |
| Total Tasks          | all tasks under those projects                                                 |
| Completed Tasks      | tasks with status `COMPLETED`                                                  |
| Pending Tasks        | tasks with status `PENDING` (In Progress tasks are **not** counted as pending) |
| Projects In Progress | projects with status `IN_PROGRESS`                                             |
| `inProgressTasks`    | tasks with status `IN_PROGRESS` (extra)                                        |
| `overdueTasks`       | incomplete tasks with `dueDate < today` (extra)                                |
