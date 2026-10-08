# Submission

| Item                         | Link / location                                                                                 | Status           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| Public GitHub repository     | https://github.com/aksharaagarwal21/Stride                                                      | Done             |
| Database schema / ER diagram | [docs/architecture.md](architecture.md#data-model) · migrations in `apps/api/prisma/migrations` | Done             |
| API documentation            | [docs/api.md](api.md)                                                                           | Done             |
| README                       | [README.md](../README.md)                                                                       | Done             |
| Web app URL                  | _pending deployment_                                                                            | Not yet deployed |
| Backend (API) URL            | _pending deployment_ — the API is served from the web app's origin under `/api`                 | Not yet deployed |
| Android APK                  | _pending EAS build_                                                                             | Not yet built    |
| 5-minute screen recording    | _to be recorded_ — follow [docs/demo-script.md](demo-script.md)                                 | Not yet recorded |

## Verification performed

| Check                                                                                      | Result              |
| ------------------------------------------------------------------------------------------ | ------------------- |
| API integration tests (Vitest + Supertest, real PostgreSQL)                                | 37 passed           |
| Shared unit tests                                                                          | 8 passed            |
| Browser smoke test (Playwright: register → project/task CRUD → filters/dashboard → logout) | passed              |
| TypeScript (shared, api, web, mobile)                                                      | passed              |
| ESLint                                                                                     | passed              |
| Web production build                                                                       | passed              |
| Expo Doctor                                                                                | 21/21 checks passed |
| Android JS bundle (`expo export --platform android`)                                       | passed              |
| Android runtime on a device/emulator                                                       | not yet run         |

This file is updated with the real URLs once the deployment and the APK build are done.
