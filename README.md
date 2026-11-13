# Job Portal & Recruitment Management System â€” API

Express 5 + MongoDB (Mongoose 9) back end for the Sri Lankan job portal. ES modules, JWT auth
(bearer token or httpOnly cookie), bcrypt passwords, layered `routes â†’ controllers â†’ models`
structure with centralised error handling.

The authoritative endpoint contract for the front-end team lives in
[`../api-contract.md`](../api-contract.md).

## Stack

| Piece      | Choice                                    |
| ---------- | ----------------------------------------- |
| Runtime    | Node 20+                                  |
| Framework  | Express 5                                 |
| Database   | MongoDB via Mongoose 9                    |
| Auth       | JWT (`jsonwebtoken`) + bcrypt             |
| Uploads    | `multer` (CV files)                       |
| Validation | `express-validator`                       |
| Middleware | `helmet`, `cors`, `morgan`, `dotenv`, `express-rate-limit` |

## Quick start

```bash
cd Back-END
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run seed              # sample data (optional but recommended)
npm start                 # or: npm run dev  (nodemon)
```

Check it is alive:

```bash
curl http://localhost:5001/api/health
```

```json
{
  "success": true,
  "status": "ok",
  "database": "connected",
  "uptime": 42.7
}
```

## Environment variables

| Variable           | Required | Default                                        | Meaning                                    |
| ------------------ | -------- | ---------------------------------------------- | ------------------------------------------ |
| `PORT`             | no       | `5001`                                         | Port the API listens on                    |
| `MONGODB_URI`      | yes      | `mongodb://127.0.0.1:27017/job-portal`          | MongoDB connection string                  |
| `JWT_SECRET`       | yes      | temporary random secret                        | Secret used to sign JWTs (min 32 chars)   |
| `JWT_EXPIRES_IN`   | no       | `7d`                                           | Token lifetime                             |
| `CLIENT_ORIGIN`    | yes      | `http://localhost:5173`                        | Comma separated list of allowed origins    |
| `UPLOAD_DIR`       | no       | `uploads`                                      | Folder for uploaded CV files               |
| `MAX_CV_SIZE_MB`   | no       | `5`                                            | Maximum CV size in megabytes               |
| `NODE_ENV`         | no       | `development`                                  | `development` / `production`               |

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Pointing it at MongoDB

### Local `mongod`

A portable MongoDB needs no install and no admin rights:

```bash
mongod.exe --dbpath <empty-folder>\data --port 27017 --bind_ip 127.0.0.1
```

Then use `MONGODB_URI=mongodb://127.0.0.1:27017/job-portal`.

### MongoDB Atlas (free tier)

1. Create a free M0 cluster at <https://www.mongodb.com/atlas>.
2. **Database Access â†’ Add New Database User**: pick a username and password.
3. **Network Access â†’ Add IP Address**: allow your own IP.
4. **Connect â†’ Drivers** and copy the SRV string into `.env`:

   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/job-portal?retryWrites=true&w=majority
   ```

   URL-encode special characters in the password (`@` â†’ `%40`, `:` â†’ `%3A`).

### No database available?

The API still boots and answers `/api/health` with `"database": "disconnected"`. Database routes
answer `503` until MongoDB is reachable.

## Scripts

| Script          | What it does                                                  |
| --------------- | ------------------------------------------------------------- |
| `npm start`     | Start the API with `node index.js`                            |
| `npm run dev`   | Same, with nodemon reload                                     |
| `npm run seed`  | Insert the sample data (idempotent)                           |
| `npm run verify`| End-to-end smoke test against a reachable MongoDB (166 checks) |
| `npm run check` | Syntax-check every JavaScript file                            |

## Seed accounts

All seeded accounts use the password `Password123`.

| Role             | Email                        | Notes                          |
| ---------------- | ---------------------------- | ------------------------------ |
| admin            | `admin@jobportal.local`      | Full admin access              |
| employer         | `hr@ceylonsolutions.lk`      | Ceylon Solutions (Pvt) Ltd     |
| employer         | `hr@lankafinance.lk`         | Lanka Finance PLC              |
| employer         | `hr@serendibhealth.lk`       | Serendib Health Care           |
| employer         | `hr@sabaragamuwatrust.lk`    | Sabaragamuwa Education Trust   |
| employer         | `hr@lankainfra.lk`           | Lanka Infrastructure Engineering |
| employer         | `hr@southernsales.lk`        | Southern Sales Group           |
| seeker           | `nimal.perera@example.lk`    | Colombo                        |
| seeker           | `amali.fernando@example.lk`  | Kandy                          |
| seeker           | `ruwan.jayasinghe@example.lk`| Galle                          |
| seeker           | `hasini.w@example.lk`        | Kurunegala                     |

The seed also creates 6 job categories, all 25 Sri Lankan districts, 6 companies, 12 jobs spread
across categories, districts and statuses, 6 applications in different statuses, 4 saved jobs and
notifications. Running it twice never duplicates anything.

## Endpoints

Full request/response details are in [`../api-contract.md`](../api-contract.md).
Send the token as `Authorization: Bearer <token>`; the API also accepts an httpOnly session cookie.

### Health

| Method | Path             | Auth | Purpose                        |
| ------ | ---------------- | ---- | ------------------------------ |
| GET    | `/api/health`    | â€“    | Status, database state, uptime |

### Auth

| Method | Path                 | Auth | Purpose                                     |
| ------ | -------------------- | ---- | ------------------------------------------- |
| POST   | `/api/auth/register` | â€“    | Create a seeker or employer account         |
| POST   | `/api/auth/login`    | â€“    | Log in, returns a token                      |
| GET    | `/api/auth/me`       | bearer | The signed in user                          |

### Jobs

| Method | Path                    | Auth             | Purpose                                  |
| ------ | ----------------------- | ---------------- | ---------------------------------------- |
| GET    | `/api/jobs`             | â€“                | List approved jobs (search, filters, sort) |
| GET    | `/api/jobs/featured`    | â€“                | Up to six featured jobs                   |
| GET    | `/api/jobs/mine`        | employer         | Every job of the signed in employer       |
| GET    | `/api/jobs/saved`       | seeker           | The seeker's saved jobs                   |
| GET    | `/api/jobs/:id`         | â€“                | One job (owners and admins see drafts too) |
| POST   | `/api/jobs`             | employer         | Create a job (draft or pending)           |
| PATCH  | `/api/jobs/:id`         | owner or admin   | Update a job                              |
| DELETE | `/api/jobs/:id`         | owner or admin   | Delete a job                              |
| POST   | `/api/jobs/:id/save`    | seeker           | Save a job                                |
| DELETE | `/api/jobs/:id/save`    | seeker           | Unsave a job                              |

### Companies

| Method | Path                 | Auth     | Purpose                            |
| ------ | -------------------- | -------- | ---------------------------------- |
| GET    | `/api/companies`     | â€“        | List companies (search, pagination) |
| GET    | `/api/companies/:id` | â€“        | One company                        |
| PATCH  | `/api/companies/me`  | employer | Update the employer's own company   |

### Applications

| Method | Path                            | Auth                | Purpose                                  |
| ------ | ------------------------------- | ------------------- | ---------------------------------------- |
| POST   | `/api/applications`             | seeker              | Apply for a job                          |
| GET    | `/api/applications/mine`        | seeker              | The seeker's applications                |
| GET    | `/api/applications?jobId=`      | employer or admin   | Applicants for one of your jobs          |
| PATCH  | `/api/applications/:id/status`  | owner or admin      | Change the application status            |
| DELETE | `/api/applications/:id`         | seeker, owner, admin | Withdraw or remove an application       |

### CV

| Method | Path           | Auth              | Purpose                                  |
| ------ | -------------- | ----------------- | ---------------------------------------- |
| POST   | `/api/cv`      | seeker            | Upload a PDF or DOCX (multipart `file`)  |
| GET    | `/api/cv/mine` | seeker            | The seeker's CVs                         |
| GET    | `/api/cv/:id`  | owner, employer, admin | Download a CV file                 |
| DELETE | `/api/cv/:id`  | owner or admin    | Delete a CV and its file                 |

### Admin

| Method | Path                            | Auth  | Purpose                        |
| ------ | ------------------------------- | ----- | ------------------------------ |
| GET    | `/api/admin/overview`           | admin | Dashboard counts              |
| GET    | `/api/admin/pending-jobs`       | admin | Jobs waiting for approval     |
| GET    | `/api/admin/pending-employers`  | admin | Employers waiting for verification |
| GET    | `/api/admin/jobs`               | admin | Every job, filterable by status |
| POST   | `/api/admin/jobs/:id/approve`   | admin | Approve a job                  |
| POST   | `/api/admin/jobs/:id/reject`    | admin | Reject a job                   |
| PATCH  | `/api/admin/employers/:id/verify` | admin | Verify an employer          |
| GET    | `/api/admin/users`              | admin | List users (search, role)      |
| PATCH  | `/api/admin/users/:id`          | admin | Change role or suspend a user  |
| GET/POST/PATCH/DELETE | `/api/admin/categories[/:id]` | admin | Manage job categories      |
| GET/POST/PATCH/DELETE | `/api/admin/districts[/:id]`  | admin | Manage districts           |

### Reference and other

| Method | Path                      | Auth  | Purpose                              |
| ------ | ------------------------- | ----- | ------------------------------------ |
| GET    | `/api/categories`         | â€“     | Job categories                        |
| GET    | `/api/districts`          | â€“     | The 25 districts                      |
| POST   | `/api/contact`            | â€“     | Contact form (rate limited)           |
| GET    | `/api/notifications`      | bearer | The user's notifications and unread count |
| PATCH  | `/api/notifications/:id/read` | bearer | Mark one notification as read     |
| POST   | `/api/notifications/read-all` | bearer | Mark all as read                 |

## Response shape

Success:

```json
{ "success": true, "data": { } }
```

Single resources are exposed twice, so a client can read either:

```json
{ "success": true, "message": "Job created", "job": { }, "data": { } }
```

Lists add pagination metadata:

```json
{
  "success": true,
  "jobs": [],
  "data": [],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 42,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

Failure:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "details": [{ "field": "email", "message": "Please provide a valid email address" }]
  }
}
```

Status codes: `200` OK, `201` created, `400` validation, `401` missing/invalid token, `403` wrong
role or not the owner, `404` not found, `409` duplicate, `413` file too large, `429` rate limited,
`500` unexpected, `503` database unavailable.

## Project structure

```
Back-END/
â”œâ”€â”€ index.js                  # Express app, middleware wiring, startup and shutdown
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ config/               # env.js (variables), db.js (Mongo connection + state)
â”‚   â”œâ”€â”€ models/               # User, Company, Job, Application, CV, SavedJob, Notification, Category, District
â”‚   â”œâ”€â”€ controllers/          # auth, jobs, companies, applications, cv, admin, notifications, taxonomy, contact
â”‚   â”œâ”€â”€ routes/               # index.js and one router per resource
â”‚   â”œâ”€â”€ middleware/           # auth.js, validate.js, upload.js, notFound.js, errorHandler.js
â”‚   â”œâ”€â”€ validators/           # express-validator chains
â”‚   â””â”€â”€ utils/                # ApiError, jwt, password, pagination, response, serialize, notify, constants, districts
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ seed.js               # npm run seed
â”‚   â”œâ”€â”€ verify-api.js         # npm run verify
â”‚   â””â”€â”€ check-syntax.js       # npm run check
â”œâ”€â”€ uploads/                  # uploaded CV files (created automatically)
â”œâ”€â”€ .env.example
â”œâ”€â”€ .env
â””â”€â”€ package.json
```

## Troubleshooting

| Symptom                                  | Fix                                                             |
| ---------------------------------------- | --------------------------------------------------------------- |
| `503` on database routes                  | MongoDB is unreachable â€” check the startup log                   |
| `EADDRINUSE` on port 5001                | Another process owns the port; stop it or change `PORT`          |
| `403` on a job write                     | Job writes are employer-only, and only the owner or an admin may edit |
| `401` immediately after logging in        | The server restarted with a new `JWT_SECRET`; log in again      |
| CV upload answers `413`                  | The file is over `MAX_CV_SIZE_MB` (5 MB by default)              |
| CV upload answers `400`                  | Only `.pdf` and `.docx` files are accepted                       |
