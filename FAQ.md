# Mess Management System: Panel Interview FAQ

Answers are based on our actual code. File names are given so you can open the code if a panelist asks.

---

## 1. Project overview

**Q: What is your project?**
A web application for managing a hostel/college mess. It shows a 30-day meal calendar (Breakfast, Lunch, Dinner), lets staff manage menu items and the weekly schedule, and lets students rate and comment on meals. Admins manage users and roles.

**Q: What problem does it solve?**
Menus are usually on paper or WhatsApp, and feedback gets lost. This gives one place to see the menu, give structured feedback (1 to 5 rating plus comment) and manage who can change what.

**Q: Who are the users?**
Three roles (defined in `api/models.py`):
- **reader** is the default for every new sign-in. They can view the menu and give feedback.
- **contributer** (spelled this way in the code) can also manage the daily menu schedule.
- **admin** can do everything, including viewing users, changing roles and deleting users.

**Q: What is the high-level architecture?**
A three-tier architecture with a cloud deployment:
```
React SPA (Vite)  --HTTPS + Firebase ID token-->  FastAPI (Python)  --SQLAlchemy-->  PostgreSQL
        |                                               |
        +---- Firebase Auth (Google sign-in) <----------+  (token verified with firebase-admin)
```
All of it is hosted on Azure App Service and provisioned with Terraform.

---

## 2. Technology stack and "why this choice?"

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 7, Material UI 7, Emotion, Tailwind CSS 4, dayjs |
| Auth | Firebase Authentication (Google sign-in), `firebase` JS SDK, `firebase-admin` |
| Backend | Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic, psycopg2-binary, python-dotenv |
| Database | PostgreSQL 13 |
| Infrastructure | Terraform (azurerm), Azure App Service (Linux), Azure PostgreSQL Flexible Server |
| CI/CD | GitHub Actions (Python 3.14 for the API, Node 24 for the frontend), `azure/webapps-deploy` |
| Tooling | ESLint 9 and typescript-eslint, npm, pip |

**Q: Why React with TypeScript?**
React's component model suits our UI (calendar, feedback wall, user table). TypeScript catches type errors at build time. `tsc -b` runs before `vite build`, so type errors fail the build.

**Q: Why Vite and not Create React App?**
Vite has a fast dev server and fast builds, and CRA is deprecated. We use `@vitejs/plugin-react` and `@tailwindcss/vite`.

**Q: You use both Material UI and Tailwind. Why?**
MUI gives ready-made accessible components (dialogs, drawer, date pickers, icons). Tailwind gives quick utility-class layout and spacing. They overlap a little, and a single design system would be cleaner. We would say that honestly if asked.

**Q: Why FastAPI instead of Flask or Django?**
- It has automatic interactive docs at `/docs` and `/redoc`.
- Pydantic validates requests and responses, for example the rating must be 1 to 5.
- Dependency injection (`Depends`) keeps auth and database access clean.
- Type hints keep the code readable.

**Q: Why PostgreSQL (relational) and not MongoDB?**
Our data is relational: menu items, schedule entries that reference them with foreign keys, users, and feedback that references users. We also need constraints (unique indexes, CHECK on rating) and native ENUM types. Postgres gives us these.

**Q: Why Firebase Authentication instead of building our own login?**
Writing password storage, reset and session logic is risky. Firebase gives Google sign-in and signed JWT ID tokens. We then only need to verify tokens on the backend.

**Q: Why Azure and Terraform?**
Azure had free or student tiers (the App Service plan is F1 free). Terraform describes the infrastructure as code (`IaC/main.tf`), so it is repeatable and reviewable instead of clicked together in a portal.

---

## 3. Authentication and authorization

**Q: Walk us through the login flow.**
1. The user clicks "Sign in with Google". The frontend calls `signInWithPopup` (`app/src/contexts/AuthContext.tsx`).
2. Firebase returns a signed ID token (a JWT).
3. The frontend calls `POST /users/sync`. `authFetch` in `app/src/utils/api.ts` adds `Authorization: Bearer <token>` automatically.
4. The backend verifies the token with `firebase_admin.auth.verify_id_token` (`api/auth.py`).
5. If the user is not in our `users` table, it is created with role `reader`. Otherwise the name and email are refreshed.
6. The frontend stores the returned database user (including role) and shows the UI for that role.

**Q: Authentication vs authorization. Where is each done?**
- **Authentication** (who are you?) is done in `get_current_user`, which verifies the Firebase token and returns 401 if it is invalid.
- **Authorization** (what may you do?) is done in the endpoints using `get_current_db_user`, which loads our DB user and checks its role. It returns 403 if the role is not allowed.

**Q: Can a user make themselves an admin?**
No. New users are always `reader`. Only an admin can call `PUT /users/{user_id}/role`, and the check is on the server. The frontend also hides admin screens (`isAdmin` in `App.tsx`), but that is only for UX, not security.

**Q: Why store users in your own database if Firebase already has them?**
Firebase does not know our roles or our feedback relationships. We link them through the unique `firebase_uid` column.

**Q: What happens when an admin deletes a user?**
`DELETE /users/{user_id}` deletes the Firebase account (best effort, errors are logged) and the DB row. Their feedback stays, but its `user_id` becomes NULL (`ON DELETE SET NULL`), so ratings are not lost.

---

## 4. Database design

**Q: Describe your tables.**
- `menu_items` holds the food item: name, description, `is_vegetarian`, calories.
- `daily_menu` is the weekly schedule. Each row is `day` (enum) + `meal_type` (enum) + `item_id` (FK to `menu_items`, `ON DELETE CASCADE`).
- `users` holds `firebase_uid` (unique), email (unique), name and `role` (enum).
- `feedback` holds user, rating (CHECK 1 to 5), comment, `meal_date`, and `meal_type`. A NULL `meal_type` means feedback for the whole day.

**Q: How do you stop duplicate data?**
- `daily_menu` has `UNIQUE (day, meal_type, item_id)`, so the same item cannot be scheduled twice for the same slot.
- `feedback` has two partial unique indexes: one per (user, date, meal type) and one per (user, date) where meal type is NULL. This gives one feedback per user per meal slot.
- The API checks first and returns 400 or 409, and it also catches `IntegrityError` to handle race conditions.

**Q: Why use PostgreSQL ENUM types?**
They restrict values to valid ones (`Breakfast/Lunch/Dinner`, Monday to Sunday, and the three roles) at the database level, not just in Python.

**Q: What are the triggers in `db/database.sql`?**
A `BEFORE UPDATE` trigger function `update_modified_column()` keeps `updated_at` current on `menu_items` and `daily_menu`.

**Q: Why is the menu a weekly repeating schedule?**
`daily_menu` stores a day of the week, not a date. `GET /calendar/` then builds the next 30 days by mapping each date to its weekday. This is simple and needs no data entry for every date. The limitation is that there are no one-off menus for a festival day.

**Q: Why an ORM (SQLAlchemy) instead of raw SQL?**
It protects against SQL injection through parameterized queries, maps tables to Python classes, and handles relationships and `joinedload`. The schema itself is written in plain SQL (`db/database.sql`, `db/migrations/`).

**Q: How do you handle schema changes?**
Manual, idempotent SQL migration scripts in `db/migrations/` (`ADD COLUMN IF NOT EXISTS`, safe to run more than once). We have no automated migration tool such as Alembic yet.

---

## 5. Backend API

**Q: List the main endpoints.**
- **Menu items:** `POST/GET /menu-items/`, `GET/PUT/DELETE /menu-items/{id}`
- **Schedule:** `POST/GET /daily-menu/`, `GET /daily-menu/by-day/{day}`, `DELETE /daily-menu/{id}`
- **Calendar:** `GET /calendar/` (next 30 days)
- **Feedback:** `POST/GET /feedback/`, `PUT /feedback/{id}`
- **Users:** `POST /users/sync`, `GET/PUT /users/me`, `GET /users/` (admin), `PUT /users/{id}/role` (admin), `DELETE /users/{id}` (admin)
- **Health:** `GET /`

**Q: What business rules does feedback have?**
- The rating must be 1 to 5 (validated by Pydantic and by a DB CHECK).
- The date cannot be in the future.
- The date cannot be older than 13 days ("last 2 weeks"). This is checked with `FeedbackCreate`'s validator, and again on edit.
- A user can edit only their own feedback (403 otherwise), and the meal slot cannot be changed.
- There is one feedback per user per meal slot (409 otherwise).
- "Today" is computed in IST (UTC+05:30) in `today_ist()` because the server may run in UTC.

**Q: How does the API validate input?**
Pydantic schemas in `api/schemas.py` (types, `max_length`, `ge/le` bounds, enums, custom validators). Invalid input gets an automatic 422 response.

**Q: How do you manage database connections?**
`get_db()` in `api/database.py` is a FastAPI dependency. It opens a SQLAlchemy session per request and always closes it in `finally`.

**Q: How are secrets and configuration handled?**
Environment variables loaded with `python-dotenv`: `DATABASE_URL` and `FIREBASE_CREDENTIALS_PATH`. The Firebase service-account JSON is not committed. The frontend reads `VITE_*` variables.

**Q: What status codes do you use?**
200 OK, 204 No Content (deletes), 400 (business rule), 401 (bad or missing token), 403 (wrong role or not the owner), 404 (not found), 409 (duplicate feedback), 422 (validation).

---

## 6. Frontend

**Q: How is the frontend structured?**
- `App.tsx` has the app shell, tabs and drawer. The active tab is stored in the URL hash.
- `components/` has `CalendarView`, `MenuItemsList`, `FeedbackWall`, `ManageUsers`, `ProfileDialog` and `Login`.
- `contexts/AuthContext.tsx` uses React Context to share `currentUser`, `dbUser`, `loginWithGoogle` and `logout`.
- `utils/api.ts` has `authFetch`, a wrapper around `fetch` that adds the base URL and the Bearer token.

**Q: How is state managed?**
Local state with `useState` and `useEffect`, plus React Context for auth. The app is small enough that Redux is not needed.

**Q: How does the frontend know the API URL?**
`VITE_API_BASE_URL` is set at build time, and it falls back to `http://localhost:8000` for local development.

**Q: How do you show or hide features by role?**
The frontend reads `dbUser.role`, for example `isAdmin` in `App.tsx`. The real enforcement is on the backend.

---

## 7. Deployment, CI/CD and infrastructure

**Q: How is it deployed?**
Two GitHub Actions workflows in `.github/workflows/`, both manual (`workflow_dispatch`):
- **API:** installs Python 3.14 dependencies, uploads an artifact, and deploys to the Azure Web App `messapi`. Azure's Oryx builds it (`api/.deployment`).
- **Frontend:** builds the Vite app with Node 24, deploys only `app/dist` to the Web App `messapp1`, and serves it with `pm2 serve ... --spa`.

**Q: What does `--spa` do in the pm2 command?**
It serves `index.html` for unknown routes, so client-side routing keeps working on refresh.

**Q: What does Terraform create?**
A resource group, storage account, Linux App Service plan (F1), two Linux Web Apps (API and React), a PostgreSQL Flexible Server (`B_Standard_B1ms`, version 13), a database, and a firewall rule that allows Azure services.

**Q: How do you run it locally?**
See `readme.md`:
1. Install the tools with Scoop (Python 3.14, Node 24, PostgreSQL, Terraform).
2. Start Postgres and run `db/database.sql`.
3. In `api/`, create a virtualenv and run `pip install -r requirements.txt`.
4. Create `.env` with `DATABASE_URL` and `FIREBASE_CREDENTIALS_PATH`.
5. Start the API with `uvicorn main:app --reload`.
6. In `app/`, run `npm install` and then `npm run dev` (port 5173).

---

## 8. Known limitations and what we would improve

Panels like honesty. These are real gaps in the code, so name them before they find them.

**Q: What are the weaknesses of your system?**

1. **Some endpoints are not role-protected.** Menu-item create, update and delete (`/menu-items/`) have no auth dependency in `api/main.py`. Anyone who knows the URL can change them. *Fix:* add `get_current_db_user` and a role check, as `/daily-menu/` already does.
2. **CORS is limited to `http://localhost:5173`.** The deployed frontend's origin must be added, or made configurable through an environment variable.
3. **Terraform state and variables are committed to git.** `IaC/terraform.tfstate` and `terraform.tfvars` can contain secrets. *Fix:* remove them from git, add them to `.gitignore`, use a remote backend (Azure Storage), and rotate any exposed credentials.
4. **No automated tests.** We tested manually. *Fix:* `pytest` with FastAPI `TestClient` for the API, and Vitest with React Testing Library for the frontend.
5. **Dependencies are not pinned in `api/requirements.txt`.** Builds could change over time. *Fix:* pin versions or use a lock file.
6. **No migration tool.** *Fix:* use Alembic.
7. **Debug logging in the frontend.** `app/src/firebase.ts` logs the Firebase config to the console. We would remove it. (Firebase web keys are not secret, but the logging is still noise.)
8. **The 30-day calendar has no per-date overrides.** It is only a weekly pattern.
9. **The role name is misspelled** (`contributer`). It is consistent across the DB, API and UI, but changing it now needs a migration.
10. **Manual CI/CD trigger only.** We would trigger on push to `main`, after tests pass.
11. **Pagination is basic.** It uses `skip` and `limit` with a default of 100.

**Q: What would you build next?**
Per-date menu overrides and holiday menus, a feedback analytics dashboard (average rating per meal), notifications, tests and CI gating, and moving secrets into Azure Key Vault.

---

## 9. Security

**Q: How is the app secured?**
- Firebase-signed JWTs are verified server-side on protected routes.
- Role checks are done on the server (403).
- SQLAlchemy parameterizes queries, so there is no SQL injection from our code.
- Pydantic validates all input.
- The service-account key and `.env` files are kept out of the repo.

**Q: What is the biggest security gap you know of?**
Unprotected menu-item write endpoints, and the committed Terraform state (see section 8).

**Q: Where is the JWT verified, and what does it contain?**
`auth.verify_id_token(token)` in `api/auth.py`. It checks the signature, expiry and audience against our Firebase project, and returns claims such as `uid`, `email` and `name`.

---

## 10. Teamwork and process questions

**Q: How did you divide the work?**
*Fill this in as a team:* frontend, backend and API, database, and DevOps (Terraform and CI/CD).

**Q: How did you collaborate?**
Git and GitHub with a shared repo and commit history (for example, "Authentication Header Added", "UI and Database changes", and the `chore(ci)` commits for the deployment pipeline).

**Q: What was the hardest problem you faced?**
*Fill this in.* Good candidates from our code:
- Making feedback unique per meal slot when `meal_type` can be NULL. We solved it with two partial unique indexes.
- Syncing Firebase users with our own DB.
- Getting the SPA to deploy and route correctly on Azure with pm2.
- Time zones. We use IST for the feedback window.

**Q: What did you learn?**
*Fill this in.* Example points: JWT-based auth, relational modeling, infrastructure as code, and CI/CD.

---

## 11. Quick-fire answers

| Question | Answer |
|---|---|
| Frontend port (dev)? | 5173 |
| API port (dev)? | 8000 (Uvicorn default) |
| API docs URL? | `/docs` (Swagger) and `/redoc` |
| Default role for a new user? | `reader` |
| Feedback window? | Last 13 days (about 2 weeks), not future dates |
| Rating range? | 1 to 5 |
| Calendar length? | 30 days from today |
| Auth provider? | Firebase (Google sign-in) |
| ORM? | SQLAlchemy |
| Validation library? | Pydantic |
| Build command (frontend)? | `tsc -b && vite build` |
| Hosting? | Azure App Service (Linux) |
| IaC tool? | Terraform |
