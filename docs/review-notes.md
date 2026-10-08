# Review notes

Short answers to the questions most likely to come up in the review session.

**Why this stack?**
TypeScript end to end lets the API, web and mobile apps share one set of Zod schemas and types (`packages/shared`), so a validation rule or an enum label is defined once. Express 5 is small and explicit; Prisma gives typed, parameterised queries and versioned migrations; PostgreSQL provides real foreign keys, enums, `date` columns and check constraints. React + Vite and Expo were the assignment's options; Expo Router and SecureStore cover navigation and keystore-backed storage without native code.

**How does one backend serve both apps?**
Both call the same `/api` endpoints. In production the Express service also serves the web build, so the browser calls `/api` on its own origin. The Android app calls the same host over HTTPS. Only the token transport differs: on register/login the web gets an HttpOnly cookie, and the app sends `X-Client-Platform: mobile` and receives the JWT in the body. Verification and permissions are identical for both.

**How is ownership enforced?**
The user id comes only from the verified session. Every project query includes `owner_id = userId`; every task query filters on `project.owner_id = userId`. Creating a task loads its project with that filter first. Strict schemas reject `ownerId`/`userId` fields and changing a task's project. Other users' records answer `404`, the same as records that don't exist. Integration tests check every endpoint with a second user.

**How does logout revoke a session?**
Each login inserts an `auth_sessions` row; the JWT carries its id (`sid`). Every authenticated request checks that the row exists, belongs to the token's user, and is not expired or revoked. Logout sets `revoked_at`, so the token is useless immediately even though its `exp` is in the future. Other sessions (e.g. the phone) are unaffected.

**How are the dashboard totals calculated?**
With database aggregates over all of the user's rows: two `COUNT`s on projects (all, and `IN_PROGRESS`) and one `GROUP BY status` on tasks joined through the user's projects. Pending means status `PENDING` only. Overdue uses the client's calendar day (`?today=`), so it matches what the user sees.

**How do changes appear on the other platform?**
Each write invalidates the cached lists, details and dashboard in that app. The other app re-reads from the API on refresh: pull-to-refresh, focus or foreground, reconnecting, or the web's Refresh button. There is no push channel; a refresh is the sync point.

**How are native tokens stored?**
In Expo SecureStore, which encrypts values with a key held in the Android Keystore. Android backup of those entries is disabled through the config plugin (`configureAndroidBackup`). An in-memory copy avoids reading the keystore on every request. Tokens are never written to AsyncStorage, logs or URLs. A 401 deletes the token; a network error does not.

**What trade-offs were made?**
Database-backed sessions instead of stateless JWTs (one lookup per request, but real logout). No refresh tokens (12-hour sessions). In-memory rate limiting (correct for one instance). Pessimistic updates (honest success messages). No offline writes on mobile (no conflict resolution needed). Project status is manual. The system font is used on Android. See [architecture.md](architecture.md#trade-offs).

**What would come next?**
Refresh-token rotation, a shared rate-limit store for multiple instances, offline task viewing via persisted query cache, push notifications for tasks due tomorrow, and an audit log.
