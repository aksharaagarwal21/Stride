# Stride — requirements checklist

Source of truth: `Intern_Task_Full_Stack_Developer.pdf` (Full Stack Developer Task: Project Management System, Web + Mobile).

Legend: `[x]` implemented and verified · `[~]` implemented, verification needs a device or an external account · `[ ]` not done yet.
"Verified" means covered by the automated tests (API integration, browser smoke) or checked by running the app.

## 1. Authentication

- [x] Register (full name, email, password)
- [x] Login
- [x] Logout (server-side session revocation)
- [x] Unique email (trimmed + lower-cased; case variants rejected with 409)
- [x] Passwords hashed with bcrypt (cost 12), never stored or returned in plain text
- [x] Stay logged in until logout or token expiration (cookie / SecureStore + session TTL)
- [~] One account works on web and Android (same endpoints; cookie/bearer parity is integration-tested; on-device check pending)

## 2. Projects (web)

- [x] Create, view details, edit, delete, list owned projects
- [x] Fields: name, description, status (Not Started / In Progress / Completed), start date, end date, created date

## 3. Tasks

- [x] Create, edit, delete, mark completed, view tasks under a project
- [x] Fields: name, description, priority (Low / Medium / High), status (Pending / In Progress / Completed), due date, created date

## 4. Dashboard (per authenticated user)

- [x] Total Projects · Total Tasks · Completed Tasks · Pending Tasks · Projects In Progress (server aggregates, per user)

## 5. Search and filtering

- [x] Search projects by name · filter projects by status
- [x] Search tasks by name · filter tasks by status · filter tasks by priority (combinable)

## 6. Mobile app (Android required)

- [x] Same backend and database; no separate mobile backend
- [~] Register / login / logout with the same account as the web
- [~] Dashboard
- [~] All projects and the tasks under each project
- [~] Create, edit, delete tasks
- [~] Mark completed; change status and priority
- [~] Search tasks; filter by status and priority
- [~] Changes on one platform appear on the other after a refresh (pull-to-refresh)
- [~] Token in secure device storage (Expo SecureStore → Android Keystore)
- [~] Expired token → back to login with a clear message
- [~] No network → clear message, no crash or blank screen

Mobile status: typecheck, Expo Doctor (21/21) and a full Android Metro/Hermes bundle pass. Running on a device or emulator is still to do (none is available on the build machine).

## Technical requirements

- [x] Web: React, responsive (checked at 1440 px and 390 px), component structure, form validation, loading indicators, error handling
- [~] Mobile: React Native (Expo), navigation, validation, loading + pull-to-refresh, error handling, secure token storage
- [x] Backend: Express REST API, route organisation, middleware, error handling, structured logging, CORS for the web origin
- [x] Database: PostgreSQL, relational design, foreign keys, normalised (task ownership derived through projects)

## Security

- [x] bcrypt password hashing
- [x] Protected APIs require authentication (JWT + auth middleware + active session)
- [x] Ownership: users only see/modify/delete their own projects and tasks (tested on every endpoint)
- [x] Backend validation of every request (required fields, email format, real dates, empty strings, enums, unknown fields)
- [x] No sensitive data in API responses (explicit response mappers; tested)
- [x] SQL-injection safety (Prisma query builder only; tested with quote-laden search input)
- [x] Rate limiting on authentication endpoints (tested: 429)

## Required endpoints

- [x] `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- [x] `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/{id}`
- [x] `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/{id}`
- [x] `GET /api/dashboard`

## Documentation

- [x] Setup instructions (backend, web, mobile) — README
- [x] Environment variables — README
- [x] Database setup — README
- [x] API documentation — [api.md](api.md)
- [x] Running the mobile app against the deployed backend — README

## Submission

- [x] Public GitHub repository
- [x] Database schema / ER diagram — [architecture.md](architecture.md)
- [x] API documentation
- [x] README
- [ ] Deployment URL for web and backend — needs a hosting login
- [ ] Android APK or Expo distribution link — needs an Expo login for the EAS cloud build
- [ ] 5-minute screen recording — to be recorded ([demo-script.md](demo-script.md))

## Bonus

- [x] Docker support (production image + Compose)
- [x] Integration tests (37 API tests) + browser smoke test
- [x] Pagination
- [x] Sorting
- [x] Shared types/validation across web, mobile and backend
- [x] CI pipeline (GitHub Actions)
