# CLEAR Document Tracking

CLEAR is a full-stack document and requirement progress tracking system for a school environment. It gives students, professors, and administrators one role-aware workspace for submitting requests, reviewing decisions, forwarding endorsed documents, and tracking completion.

## Implemented capabilities

- Student authentication and role-aware dashboard
- Professor selection when a student submits a request
- Student request history with search, status filtering, and pagination
- Professor incoming-request queue with search, filtering, pagination, and valid next actions
- Administrator forwarded-document queue with processing, pickup, and completion actions
- Transactional document status changes with an immutable audit log
- Five-stage visual tracker: Submitted → Professor Review → Endorsed to Admin → Admin Processing → Ready for Pickup
- Optional Signed / Approved professor outcome recorded in history
- Server-sent events for live document detail updates
- Responsive CLEAR interface with desktop sidebar and mobile bottom navigation
- Server-side validation, role authorization, object-level access checks, CSRF protection, rate limiting, secure cookies, Helmet, and parameterized SQL
- MySQL 5.7-compatible schema with foreign keys and query indexes
- Explicit local demo-account seeding that is disabled unless opted in

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ React + Vite client                                         │
│ Auth context · role dashboards · tracker · history · forms   │
└──────────────────────────────┬───────────────────────────────┘
                               │ /api JSON + SSE
┌──────────────────────────────▼───────────────────────────────┐
│ Express API                                                  │
│ Auth middleware · CSRF · validation · rate limits            │
│ Controllers → services → repositories                       │
└──────────────────────────────┬───────────────────────────────┘
                               │ mysql2 prepared statements
┌──────────────────────────────▼───────────────────────────────┐
│ MySQL 5.7+                                                   │
│ users · documents · document_logs                            │
└──────────────────────────────────────────────────────────────┘
```

The project is a single deployable application. During development, Vite serves the React client on port `5173` and proxies `/api` to Express on port `3000`. In production, Express serves `client/dist` and the API from the same origin.

## Workflow

| Role | Allowed action | Result |
| --- | --- | --- |
| Student | Submit a request | Creates a `SUBMITTED` document and initial history event |
| Professor | Start review | Moves `SUBMITTED` to `UNDER_REVIEW` |
| Professor | Sign/approve | Moves a reviewable request to `SIGNED_APPROVED` |
| Professor | Endorse/forward | Moves the request to `ENDORSED_TO_ADMIN` |
| Administrator | Start processing | Moves `ENDORSED_TO_ADMIN` to `ADMIN_PROCESSING` |
| Administrator | Mark ready | Moves `ADMIN_PROCESSING` to `READY_FOR_PICKUP` |
| Administrator | Complete pickup | Moves `READY_FOR_PICKUP` to `COMPLETED` |

The professor can endorse directly from `SUBMITTED`, `UNDER_REVIEW`, or `SIGNED_APPROVED`. The API rejects invalid jumps, updates by an unassigned professor, student status changes, and administrator actions before endorsement. `SIGNED_APPROVED` is preserved as a separate audit state while the visual tracker keeps the requested five-stage path.

## Technology choices

- **Runtime:** Node.js 20.19+ (tested with Node 24)
- **API:** Node.js, Express 5, Zod validation
- **Database:** MySQL 5.7+ using `mysql2` prepared statements
- **Client:** React 19, React Router 7, Vite
- **Authentication:** Bcrypt password hashes plus signed JWTs in an HTTP-only cookie
- **Realtime:** Server-sent events for an open document page; queue screens refresh every 30 seconds
- **Styling:** Custom responsive CSS with the supplied lime, cream, and charcoal CLEAR visual direction

## Project structure

```text
.
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── api/                 # Fetch wrapper and API methods
│       ├── auth/                # Session provider and context
│       ├── components/          # Shell, cards, tracker, dialog, badges
│       ├── hooks/               # Document list loading and filtering
│       ├── pages/               # Role dashboards and document detail
│       ├── styles/              # Responsive visual system
│       └── utils/               # Presentation helpers
├── database/
│   └── schema.sql               # MySQL DDL
├── server/
│   ├── src/
│   │   ├── config/              # Environment validation
│   │   ├── controllers/         # HTTP request/response handlers
│   │   ├── db/                  # Pool, migration, and opt-in seed
│   │   ├── domain/              # Roles, statuses, and transition rules
│   │   ├── events/              # In-process document event bus
│   │   ├── middleware/          # Auth, CSRF, validation, errors
│   │   ├── repositories/        # Parameterized database queries
│   │   ├── routes/              # API route definitions
│   │   ├── services/            # Authentication and workflow logic
│   │   ├── utils/               # Cookies, errors, async wrapper
│   │   └── validators/          # Zod request schemas
│   └── test/                    # Unit and API tests
├── .env.example
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20.19 or newer
- npm 10 or newer
- MySQL 5.7 or newer, running locally or on a reachable server
- A MySQL user allowed to create the configured database and tables

The local machine already has Node.js and Laragon's MySQL 5.7 binary available in this workspace. The application does not assume a particular MySQL root password; set the credentials explicitly in `.env`.

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` and set at least:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   APP_ORIGIN=http://localhost:5173
   COOKIE_SECURE=false
   JWT_SECRET=<random string with at least 32 characters>
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=<your MySQL password>
   DB_NAME=clear_tracking
   ```

   Generate a development JWT secret with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

4. Create the database and tables:

   ```powershell
   npm run db:migrate
   ```

   The migration creates `DB_NAME` when it does not exist and applies `database/schema.sql` idempotently.

5. Optionally create local demo accounts. Demo seeding is deliberately opt-in:

   ```powershell
   $env:ALLOW_DEMO_SEED = "true"
   $env:DEMO_STUDENT_EMAIL = "student@tua.edu"
   $env:DEMO_STUDENT_PASSWORD = "<at least 10 characters>"
   $env:DEMO_PROFESSOR_EMAIL = "professor@tua.edu"
   $env:DEMO_PROFESSOR_PASSWORD = "<at least 10 characters>"
   $env:DEMO_ADMIN_EMAIL = "admin@tua.edu"
   $env:DEMO_ADMIN_PASSWORD = "<at least 10 characters>"
   npm run db:seed
   ```

   Do not use demo seeding in production. The seed command refuses to run unless `ALLOW_DEMO_SEED=true` and all three passwords are supplied.

   To show one-click role buttons on the login screen, set `DEMO_LOGIN_ENABLED=true` in `.env` and keep the same demo credentials in the `DEMO_*` variables. The server exposes that route only outside production; no demo passwords are bundled into the client.

6. Start the development servers:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:5173`. The API health endpoint is `http://localhost:3000/api/health`.

## Production build

Build the client, then run Express with the production environment:

```powershell
npm run build
$env:NODE_ENV = "production"
$env:APP_ORIGIN = "https://tracking.example.edu"
npm start
```

For production, set a strong `JWT_SECRET`, a least-privilege `DB_USER`, and `COOKIE_SECURE=true` (it is also enabled automatically when `NODE_ENV=production`). Terminate TLS at a reverse proxy and disable proxy buffering for the SSE endpoint.

## API contract

All protected endpoints use the `clear_session` HTTP-only cookie. Mutating requests also require the `clear_csrf` cookie value in the `X-CSRF-Token` header. The frontend handles this automatically.

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Create an 8-hour session |
| `POST` | `/api/auth/logout` | Authenticated | Clear session cookies |
| `GET` | `/api/auth/me` | Authenticated | Return the current sanitized user |
| `GET` | `/api/health` | Public | Check API and database connectivity |
| `GET` | `/api/professors` | Authenticated | List selectable professors |
| `GET` | `/api/documents` | Authenticated | List documents visible to the current role |
| `POST` | `/api/documents` | Student | Submit a document request |
| `GET` | `/api/documents/:id` | Owner, assigned professor, or admin after endorsement | Fetch one document |
| `GET` | `/api/documents/:id/history` | Same access rules | Fetch the chronological history log |
| `GET` | `/api/documents/:id/events` | Same access rules | Open the live SSE stream |
| `PATCH` | `/api/documents/:id/status` | Professor or admin | Apply a valid workflow transition |

### Submit a request

```json
{
  "professorId": 2,
  "title": "Certificate of good moral character",
  "description": "I need this certificate for an scholarship application."
}
```

### Change status

```json
{
  "status": "ENDORSED_TO_ADMIN",
  "remarks": "Reviewed and endorsed for administrative processing.",
  "version": 2
}
```

`version` is optional at the API boundary but should be sent by the UI. It prevents one reviewer from overwriting a newer update made in another session.

### List filters

`GET /api/documents?page=1&limit=10&search=certificate&status=UNDER_REVIEW`

Valid statuses are `SUBMITTED`, `UNDER_REVIEW`, `SIGNED_APPROVED`, `ENDORSED_TO_ADMIN`, `ADMIN_PROCESSING`, `READY_FOR_PICKUP`, and `COMPLETED`.

Successful responses use this shape:

```json
{
  "success": true,
  "message": "Documents retrieved.",
  "data": {}
}
```

Expected errors use this shape:

```json
{
  "success": false,
  "message": "Please correct the highlighted fields.",
  "code": "VALIDATION_ERROR",
  "errors": {}
}
```

## Database design

`users` stores identity, role, and a bcrypt password hash. `documents` stores the request, selected professor, current status, timestamps, and an optimistic-concurrency `version`. `document_logs` is append-only from the application perspective and stores the actor, previous state, new state, remarks, and timestamp for every transition.

The schema includes:

- Foreign keys for student, professor, document, and log actor relationships
- Role and status enumerations
- Indexes for each dashboard's common filters and ordering
- A history index ordered by document and timestamp
- InnoDB transactions and foreign-key enforcement

## Security and reliability decisions

- Passwords are hashed with bcrypt and are never returned by repositories or controllers.
- JWTs are signed with a configurable secret and stored in an HTTP-only, SameSite cookie.
- CSRF tokens are required for every state-changing request after login.
- Zod validates and bounds all request bodies, query filters, and route IDs.
- SQL uses `mysql2` prepared statements; user input is never concatenated into SQL.
- Document access is checked by student ownership, professor assignment, or administrator workflow scope.
- Invalid workflow transitions and stale versions return `409` instead of silently overwriting data.
- Login attempts are rate-limited and errors do not reveal whether an email exists.
- Helmet sets security headers; the API JSON body limit is 32 KB.
- SSE connections are authenticated, scoped to one document, given a heartbeat, and cleaned up on disconnect.
- Status updates and audit insertion run in the same database transaction.

## Testing and verification

Run the automated checks:

```powershell
npm run lint
npm test
npm run build
npm run check
```

The test suite covers:

- Role and transition rules
- Student, professor, and administrator object-level access
- Audit-log creation and version conflicts
- API authentication, CSRF, validation, role guards, and logout
- Consistent malformed JSON and unknown-route errors
- Required schema tables, statuses, foreign keys, and indexes

A separate local verification was performed against a disposable MySQL 5.7 instance: migration, opt-in seed, student submission, all professor states, all administrator states, persisted history, and student authorization denial all completed successfully. That disposable database was removed afterward.

## Assumptions and prototype boundaries

- “Document request” means a tracked request with title, description, selected professor, status, remarks, and history. Binary file upload/storage is not included because it was not part of the requested workflow.
- Accounts are provisioned by an administrator or the opt-in seed command. Self-registration, password reset, email verification, and SSO are outside this prototype.
- There is one shared administrator queue; forwarded documents are not assigned to individual administrators.
- SSE uses an in-process event bus, which is appropriate for the single Express process used here. A horizontally scaled deployment should replace it with Redis, a database notification layer, or another shared pub/sub service.
- The student tracker shows the exact five requested stages. `SIGNED_APPROVED` remains available as a distinct professor decision and is visible in the status badge and history.

## Design references

The supplied images in `img/` were used as visual direction for the lime/cream/charcoal CLEAR interface. They are not runtime dependencies and can be removed or replaced without changing the application.
