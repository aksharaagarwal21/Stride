# Submission

| Item                         | Link / location                                                                                                      | Status                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Public GitHub repository     | https://github.com/aksharaagarwal21/Stride                                                                           | Done                                                                                         |
| Database schema / ER diagram | [docs/architecture.md](architecture.md#data-model) · migrations in `apps/api/prisma/migrations`                      | Done                                                                                         |
| API documentation            | [docs/api.md](api.md)                                                                                                | Done                                                                                         |
| README                       | [README.md](../README.md)                                                                                            | Done                                                                                         |
| Web app URL                  | https://stride-j1ec.onrender.com                                                                                     | Live (Render free tier: sleeps after 15 min idle; the first visit can take ~30–60 s to wake) |
| Backend (API) URL            | https://stride-j1ec.onrender.com/api — e.g. [`/api/health/ready`](https://stride-j1ec.onrender.com/api/health/ready) | Live (same service and origin as the web app)                                                |
| Android APK                  | _pending EAS build_                                                                                                  | Not yet built                                                                                |
| 5-minute screen recording    | _to be recorded_ — follow [docs/demo-script.md](demo-script.md)                                                      | Not yet recorded                                                                             |

## Verification performed

| Check                                                                                                 | Result              |
| ----------------------------------------------------------------------------------------------------- | ------------------- |
| API integration tests (Vitest + Supertest, real PostgreSQL)                                           | 37 passed           |
| Shared unit tests                                                                                     | 8 passed            |
| Browser smoke test (Playwright: register → project/task CRUD → filters/dashboard → logout)            | passed              |
| TypeScript (shared, api, web, mobile)                                                                 | passed              |
| ESLint                                                                                                | passed              |
| Web production build                                                                                  | passed              |
| Expo Doctor                                                                                           | 21/21 checks passed |
| Android JS bundle (`expo export --platform android`)                                                  | passed              |
| Live site: browser smoke test against https://stride-j1ec.onrender.com                                | passed              |
| Live API: mobile bearer flow (register → project/task → update → dashboard → logout → token rejected) | passed              |
| Android runtime on a device/emulator                                                                  | not yet run         |

Hosting: Render (Docker web service, region Singapore) + Neon PostgreSQL (Singapore), both free tiers. Deployed from the `build/stride` branch.
