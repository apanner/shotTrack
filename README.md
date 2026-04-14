# shotTrack — vendor shot tracking (Next.js + SQLite / Turso)

Production-oriented app for **outsource vendor tracking**: projects, shots, **stages** (`temp` → `wip` → `tech_check` → `final`), **bids** (admin-only), Excel-style **paste import**, and **role-based access**.

## Roles

- **Admin**: sees **all shots** in a project and **bid (days)** columns; can create projects, import rows, create users.
- **Vendor**: sees **only shots assigned** to their user (`assignedUserId`); **bids are never returned** by the API.

## Data & hosting (important)

- **Local dev**: uses **libSQL** with a file under `./data/shottrack.db` (no native `better-sqlite3` build required).
- **Vercel (serverless)**: you **cannot** rely on a writable SQLite file on the filesystem. Use **[Turso](https://turso.tech/)** (or another hosted libSQL/Postgres) and set:
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN` (if required)

One database for the team is correct: **authorization is enforced in API routes** (vendors are scoped to assigned shots; JWT identifies the user).

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random string, **≥ 32 characters** (e.g. `openssl rand -hex 32`) |
| `DATABASE_PATH` | Optional; default `./data/shottrack.db` |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Production (Vercel) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used only by `npm run db:seed` |

**Do not commit `.env` or real passwords.** Change default passwords after first login.

## Setup (local)

```bash
npm install
mkdir -p data
set JWT_SECRET=your-32-plus-char-secret
npx drizzle-kit push
set ADMIN_USERNAME=apanner
set ADMIN_PASSWORD=your-password
npx tsx scripts/seed.ts
npm run dev
# Open http://localhost:3001
```

## Excel / paste import

On the dashboard (admin), paste **tab-separated** data (copy from Excel). Header row should include at least **`code`** or **`shot`**. Optional columns: `sequence`, `description`, `stage`, `status`, `priority`, `due`, `bid`, `assignee` (username).

## API highlights

- `POST /api/auth/login` — sets `httpOnly` cookie `shottrack_auth`
- `GET /api/projects`, `GET /api/shots?projectId=...`
- `PATCH /api/shots/[id]` — update stage (vendors: own shots only)
- `POST /api/import/paste` — admin only
- `POST /api/admin/users` — admin only

## Deploy on Vercel

1. Import this repo in [Vercel](https://vercel.com) (**root** = repo root; no subfolder).
2. **Environment variables** (Production):

   | Name | Value |
   |------|--------|
   | `JWT_SECRET` | Random string, ≥ 32 characters |
   | `TURSO_DATABASE_URL` | From [Turso](https://turso.tech/) |
   | `TURSO_AUTH_TOKEN` | Turso token (if required) |

   Do **not** set `DATABASE_PATH` on Vercel (use Turso only).

3. **Deploy**, then run `drizzle-kit push` / seed against your Turso DB from your machine if needed.

## Legacy static demo

The earlier single-file prototype lives in `legacy-ui/` (localStorage only, no multi-user).

## Security checklist

- Long random `JWT_SECRET` in production
- HTTPS in production (Vercel provides TLS)
- Rotate vendor passwords; use strong passwords for new users (min 8 chars in UI)
- Turso/Vercel: restrict DB tokens; rotate if leaked
