# Neolytix Role-Based Learning Dashboard

A small full-stack dashboard built with Next.js, NestJS, PostgreSQL, and
Prisma. It imports the supplied learning-platform dataset into relational
tables, authenticates users with an HttpOnly JWT cookie, and scopes analytics
by the logged-in user's role and region.

## Prerequisites

- Node.js 24 LTS and npm
- PostgreSQL 16 or newer
- `psql` (for the one-time demo admin-role update), or another PostgreSQL
  client

The frontend runs on `http://localhost:3000`; the backend defaults to
`http://localhost:8000`.

## Setup

### 1. Install dependencies

From the repository root:

```bash
cd backend
npm ci
cd ../frontend
npm ci
cd ..
```

### 2. Create a PostgreSQL database

Create an empty database, for example `neolytix_dashboard`, using `createdb`,
pgAdmin, or `psql`:

```bash
createdb -U postgres neolytix_dashboard
```

Create `backend/.env` with a connection string for that database and a private
JWT signing secret:

```dotenv
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/neolytix_dashboard?schema=public"
JWT_SECRET="replace-with-a-long-random-local-secret"
PORT=8000
```

Use your local PostgreSQL username and password. Keep real credentials private;
the `.env` file is excluded from version control.

### 3. Apply migrations and load the dataset

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

The seed script is safe to rerun: it upserts the supplied records and verifies
the inserted students, courses, and enrollments. Schema definitions and
migration history are under `backend/prisma/`.

### 4. Start the backend and frontend

Open a terminal for the backend:

```bash
cd backend
npm run start:dev
```

Open another terminal for the frontend:

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`. The frontend API proxies use
`http://localhost:8000` by default. If the backend runs at a different origin,
set `BACKEND_API_URL` in `frontend/.env.local`, then restart the frontend:

```dotenv
BACKEND_API_URL=http://localhost:8000
```

## Demo login credentials

The dataset seed does not create application users. Create these three demo
accounts through `http://localhost:3000/sign-up` (the signup form always
creates a manager). Use the exact emails and passwords below; choose any region
for the Admin account, and the specified region for each manager.

| Role          | Email                            | Password              | Signup region |
| ------------- | -------------------------------- | --------------------- | ------------- |
| Admin         | `admin@neolytix.local`         | `NeolytixAdmin2026` | NULL          |
| North Manager | `north-manager@neolytix.local` | `NorthManager2026`  | North         |
| South Manager | `south-manager@neolytix.local` | `SouthManager2026`  | South         |

After creating the Admin account, promote it in PostgreSQL. For example, in
PowerShell, set the local PostgreSQL password for the command and remove it
afterwards:

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -h localhost -U postgres -d neolytix_dashboard -c "UPDATE users SET role = 'admin', region = NULL WHERE email = 'admin@neolytix.local';"
Remove-Item Env:PGPASSWORD
```

Adjust the PostgreSQL username, password, host, or port if your local setup
differs. The login page is `http://localhost:3000/login`. These are local
assessment demo credentials, not production accounts.

## Data model

The Prisma schema models the imported data relationally:

- **Student** has a stable string ID, name, region, and join date. A student
  may have many enrollments.
- **Course** has a stable string ID and descriptive fields such as title,
  category, level, instructor, and duration. A course may have many
  enrollments.
- **Enrollment** joins one student to one course and stores enrollment date,
  completion status, optional grade, rating, and fee paid. A unique
  `(student_id, course_id)` constraint prevents duplicate student/course
  enrollment records.
- **User** stores a unique email, bcrypt password hash, role, and optional
  region. Application users are separate from the imported student records.

The source dataset nests enrollments under students. The seed script
normalizes that structure into `students`, `courses`, and `enrollments`, while
foreign keys preserve the relationships.

## Authentication and authorization

Login verifies the password with bcrypt and sets a signed JWT in an
HttpOnly, SameSite=Lax cookie. The analytics routes require that cookie.

The NestJS `AuthGuard` verifies the token, then reloads the account's current
role and region from PostgreSQL. The analytics service uses this database
identity for authorization; it does not trust a client-provided role or
region.

- **Admin:** may view all regions or request one supported region.
- **Manager:** must have an assigned region and can only see that region. Any
  requested region filter is ignored for a manager.
- Unsupported roles and managers without a region are denied access.

Signup intentionally creates manager accounts only. Admin assignment is an
administrative operation, demonstrated above for the local assessment setup.

## Dashboard and insights

The dashboard includes:

1. **Revenue by course category** — the required bar chart. Revenue is
   calculated as the sum of enrollment `fee_paid` values, grouped by course
   category. It uses `GET /analytics/revenue-by-category`.
2. **Monthly revenue** — an additional trend chart grouped by enrollment
   month. `GET /analytics/revenue-by-month` accepts an optional `year` filter
   and returns all 12 months with zero revenue for months with no enrollments,
   including upcoming months. Admins can also filter it by region.

Both endpoints use the same backend scope policy. The category widget and the
monthly trend are different insights, not role-specific versions of a widget.
The monthly chart supports year selection for Admins and Managers; its region
selector is only shown to Admins.

Example requests (include the authenticated `access_token` cookie):

```text
GET /analytics/revenue-by-category
GET /analytics/revenue-by-category?region=North
GET /analytics/revenue-by-month
```

For a Manager, a request such as `?region=North` cannot change the effective
region from the one assigned to that account.

## Project structure

```text
backend/
  prisma/          Prisma schema, migrations, source data, and seed script
  src/
    analytics/     Revenue endpoints, SQL aggregation, and filters
    auth/          Signup, login, JWT cookie, and authentication guard
    prisma/        Shared Prisma/PostgreSQL provider
    main.ts        NestJS bootstrap and global validation
frontend/
  app/
    (auth)/        Login and signup routes with shared auth layout
    api/           Same-origin proxies to the backend
    dashboard/     Dashboard page
  components/
    analytics/     Revenue chart widgets
    auth/          Reusable authentication form components
```

The Next.js route handlers proxy authenticated requests to NestJS so the
HttpOnly cookie remains unavailable to client-side JavaScript. Authorization
and data filtering are enforced by the backend.

## Tests and checks

Backend:

```bash
cd backend
npm run build
npm run lint
npm test
npm run test:e2e
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

Analytics unit and end-to-end tests cover region scoping, manager filter
overrides, authentication requirements, and monthly year filtering.

## Working with AI

AI tools were used to help implement and refine the data model, API, chart
components, tests, and documentation. I reviewed the generated code and
validated the role-scoping behavior with unit and end-to-end tests.

One issue caught during review was that grouping monthly revenue only by
existing enrollment records omitted months with no enrollments (the chart
stopped at the last populated month). The query was corrected to generate a
complete calendar-month series and return zero revenue for missing months.
