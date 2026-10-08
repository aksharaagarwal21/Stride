# Five-minute demo script

Goal: show one account on the web and on Android, a task created on one platform appearing on the other, and the main engineering decisions. Use only synthetic data.

**Before recording**

- Deployed web app open in a browser; Android phone (or emulator) with the Stride APK installed, both on the deployed backend.
- A fresh test account, e.g. `demo.reviewer@stride.test` / `Demo-pass-123`, already registered on the web, or registered live in the first step.
- Screen recorder capturing the browser and the phone (scrcpy or the emulator window works well side by side).
- Close unrelated tabs and notifications.

| Time      | Platform      | What to do                                                                                                                                                                                             | What to say                                                                                                                                      |
| --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:35 | Web           | Show the login page, sign in (or register). Land on Overview.                                                                                                                                          | "Stride is one Express API and one PostgreSQL database serving a React web app and a native Android app. The web session is an HttpOnly cookie." |
| 0:35–1:15 | Web           | Create the project "Launch plan" (In Progress, dates). Open it, create the task "Write announcement" (High, due in 3 days).                                                                            | "Every field is validated by the same Zod schema on the client and the server."                                                                  |
| 1:15–1:55 | Android       | Open the app, sign in with the same account. Go to Projects → Launch plan, or the Tasks tab. Pull down to refresh: "Write announcement" appears.                                                       | "Same account, same API. The token is stored in Expo SecureStore — the Android Keystore — not plain storage."                                    |
| 1:55–2:35 | Android → Web | On the phone, open the task and set status to In Progress and priority to Medium, save. Mark another task completed with the round checkbox. Switch to the web and press Refresh (or refocus the tab). | "Writes go straight to the API; the web picks them up on refresh. The dashboard totals change because they are server aggregates."               |
| 2:35–3:20 | Web           | Overview: point at the five metrics. My Tasks: search "write", filter status + priority together, show "no match" vs. "no tasks" states, sort.                                                         | "Pending counts only Pending — In Progress is separate. Filters combine on the server, with pagination."                                         |
| 3:20–4:00 | Web + Android | Web: edit the project, then Delete and read the confirmation ("…and its N tasks"). Android: turn on airplane mode, pull to refresh: offline banner, cached data. Turn it back off and Retry.           | "Deletes cascade to tasks. Offline, the app labels cached data and doesn't pretend edits were saved."                                            |
| 4:00–4:35 | Web           | Briefly show `docs/architecture.md` (ER diagram, session sequence).                                                                                                                                    | "Ownership is enforced in every query through the project owner. Logout revokes the database session, so a copied token stops working."          |
| 4:35–5:00 | Web           | Show the GitHub repo: README, CI, docs/submission.md with the web URL, API URL and APK link. Log out on the web.                                                                                       | "Everything needed to run it locally or against the deployed backend is in the README."                                                          |

**Optional extra (if time allows):** after logging out on the phone, show that a protected request with the old token fails (`401`) using the API reference examples.
