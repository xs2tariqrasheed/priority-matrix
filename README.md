# Priority matrix

Plan your work on a 2×2 matrix (**P/V** = Pain killer / Vitamin, **S/L** = Short / Long focus), give each task a deadline, allocated time, time spent and progress, then review the week in **Reports**. Multi-user with sign-in; every user sees their own tasks plus the epics other people have shared with them.

- **Client:** React 19 + Vite + Ant Design 6 (TypeScript), three dark themes
- **Server:** Node 20 + Express 5 + PostgreSQL via `pg` (TypeScript), cookie sessions

## Setup

Requires Node 20+ and a PostgreSQL database (Supabase or local).

```bash
npm install          # installs concurrently at the root
npm run install:all  # installs server + client deps
```

### 1. Database

Create `server/.env` (copy `server/.env.example`) and fill in the connection string. The Supabase string can be pasted as-is with its `[YOUR-PASSWORD]` placeholder; put the real password in `DATABASE_PASSWORD` and it is URL-encoded for you.

```ini
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.hqhvjfzpxrkomsgtgmcm.supabase.co:5432/postgres
DATABASE_PASSWORD=your-password
```

> **Supabase and IPv6.** The "direct" host (`db.<ref>.supabase.co`) only resolves to an IPv6 address. If your network has no IPv6 route (most home and office connections), the server fails with `ENETUNREACH`. Use the **Session pooler** string instead (Supabase → Project Settings → Database → Connection string → *Session pooler*), which looks like
> `postgresql://postgres.hqhvjfzpxrkomsgtgmcm:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`.

For a local Postgres:

```ini
DATABASE_URL=postgresql://you@localhost:5432/priority_matrix
DATABASE_SSL=disable
```

Tables (`users`, `sessions`, `items`, `settings`, `epic_members`, `item_logs`) are created automatically the first time the server starts. Row-level security is switched on so Supabase's public REST API cannot read them; the app connects as the table owner and is unaffected.

### 2. Users

There is no self-service signup. Create users from the command line (the password is prompted for, hidden, when `--password` is omitted):

```bash
npm run add-user -- --email you@example.com --name "Your Name"
npm run add-user -- --list
npm run set-password -- --email you@example.com                 # change a password (prompts)
npm run set-password -- --email you@example.com --password '...'  # or pass it inline
```

### 3. Optional starting data

```bash
npm run seed -- --email you@example.com            # 30 starter tasks; skipped if the user already has tasks
npm run seed -- --email you@example.com --force    # replace the user's tasks
```

### 4. Run

```bash
npm run dev          # API on :3001, web on :5174
```

Open http://localhost:5174 and sign in. Vite proxies `/api` to the Express server, so the session cookie is same-origin.

## Features

- **Two views** of the same tasks: the 2×2 matrix (drag a task to another quadrant to relabel it) and a sortable list. Click any task to open its detail panel; edit, mark done, or delete from there.
- **Epics and tasks.** Break a task down by adding tasks under it (the **Add task** button in its detail panel, or the **+** on its list row); it then becomes an **epic**. Tasks have every field a task has and go one level deep only. The list view shows them as a tree under their epic (collapsible), and the matrix nests them under the epic when they share a quadrant and area. An epic's progress is the average of its tasks' progress (done counts as 100 %) and can't be edited directly; its allocated and spent time stay its own. Move a task between epics, or out of one, with the *Epic* field in the edit form. Deleting an epic deletes its tasks.
- **Sharing epics.** In an epic's (or any top-level task's) detail panel, the *People* section invites someone by email address or user id. They get the invitation in the app (the bell in the header, checked every 30 s and when the window regains focus), not by email, and can accept or reject it; someone who rejected can be invited again. Members have every privilege the owner has for now: they see the epic and all its tasks in their own matrix, edit them, add and delete tasks, invite or remove people, and can leave. Removing a member (or leaving) unassigns their tasks.
- **Pick, assign, unassign.** A task inside a shared epic has an *Assignee* row: *Pick up* takes it yourself, *Assign* hands it to the owner or another member, *Unassign* clears it. Assignees show as initials on the task's row; shared epics show a people count. The weekly budget counts only your own work: tasks assigned to you, plus unassigned tasks in your own matrix.
- **Activity log.** The *Activity* button in every task's detail panel lists who did what and when: created, edited (which fields), marked done or reopened, moved, picked up, assigned, unassigned, and, on an epic, invitations sent, accepted, rejected or withdrawn, members removed or leaving, and tasks deleted or moved out. An epic's log includes its tasks' entries.
- **Deadline, time & progress per task.** *Allocated* is the time budgeted, *Time spent* is what you actually worked (it may exceed the allocation), and *Progress* (0–100 %) is tracked separately. The quick editor on a task's time chip changes all three without opening the form.
- **Date range** in the header, shared by Tasks and Reports. Defaults to **This week** (Monday–Sunday); quick chips for This week / **Next 3 days** (today plus the next two days) / Next week, arrows to step, and a calendar picker with presets for anything else. Tasks are in range when their deadline falls inside it (or, for completed tasks, when they were completed inside it).
- **Show** menu: keep *overdue* open tasks visible whatever the range, include tasks with *no deadline*, and reveal *completed* tasks so they can be reopened.
- **Sort** by deadline (nearest first, undated last, done at the bottom), title, area, progress, allocated, time spent or date added. List column headers drive the same sort.
- **Mark done / Mark undone** buttons with a confirmation step (no checkboxes). Completion time is recorded.
- **Reports**: overall progress, completed vs total, overdue count, time spent vs allocated, a per-area breakdown, and clickable overdue and completed lists, all for the selected range and filters.
- **Weekly budget** card ("Available this week"): editable weekly hours with allocated, done, remaining and unallocated/overbooked totals. It counts only the tasks that book time in the selected range — due in it, or completed in it — so overdue carry-over and later weeks never inflate it, and the area, label and search filters don't narrow it. A range that isn't a whole week gets a pro-rated share of the weekly hours (three days of a 29 h week = 12 h 30 m).
- **Status bar** under the list view: totals the *Allocated* column the way a spreadsheet does. Click a cell, drag or Shift-click for a range, ⌘/Ctrl-click to add one, ↑/↓ (with Shift to extend) to move, Esc to clear, or *Select column* for all of them; the bar shows sum, cell count, average and time spent for the selection, and the whole visible column when nothing is selected.
- **Areas**: Company, Academia, Job and Family are suggested; type any other area when adding a task.
- **Three dark themes** (Graphite, Midnight, Ember) from the paint icon in the header; the choice is remembered per browser.
- **Sign-in only** authentication with HttpOnly session cookies (30 days), scrypt password hashes and login throttling.

## API

All routes except `/api/health` and `/api/auth/login` need a session cookie and operate on the items the signed-in user can see: their own, and every item of an epic they are an accepted member of.

| Method | Path               | Body                                                                                          |
|--------|--------------------|-----------------------------------------------------------------------------------------------|
| POST   | /api/auth/login    | `{ email, password }` → `{ user }` + cookie                                                   |
| POST   | /api/auth/logout   |                                                                                               |
| GET    | /api/auth/me       | → `{ user }`                                                                                  |
| GET    | /api/items         |                                                                                               |
| GET    | /api/items/:id     |                                                                                               |
| POST   | /api/items         | `{ title, area, impact, focus, category?, notes?, done?, allocatedMinutes?, spentMinutes?, progress?, deadline?, parentId? }` |
| PATCH  | /api/items/:id     | any subset of the above                                                                       |
| DELETE | /api/items/:id     |                                                                                               |
| GET    | /api/settings      | → `{ weeklyMinutes }`                                                                         |
| PATCH  | /api/settings      | `{ weeklyMinutes }`                                                                           |
| GET    | /api/items/:id/members | → `{ owner, members: [{ user, status, invitedBy, invitedAt, respondedAt }] }` (top-level items) |
| POST   | /api/items/:id/members | `{ user }` — an email address or a numeric user id; invites them                          |
| DELETE | /api/items/:id/members/:userId | removes a member, withdraws an invitation, or leaves (your own id)                |
| PUT    | /api/items/:id/assignee | `{ userId }` — pick up (your id), assign (a member's id) or unassign (`null`)           |
| GET    | /api/items/:id/logs | → activity entries, newest first; an epic's include its tasks'                              |
| GET    | /api/invitations   | → your pending invitations                                                                    |
| POST   | /api/invitations/:epicId/accept | accept an invitation                                                             |
| POST   | /api/invitations/:epicId/reject | reject an invitation                                                             |

`impact` is `"P"` or `"V"`, `focus` is `"S"` or `"L"`, minutes are in 15-minute steps, `progress` is 0–100 and `deadline` is `YYYY-MM-DD` or `null`. `parentId` puts the item inside an epic (another top-level item of yours) or `null`; nesting deeper than one level, moving an epic under another, or setting an epic's `progress` returns `400`, and the epic's stored `progress` is recalculated whenever one of its tasks changes. Setting `done: true` stamps `completedAt`; `done: false` clears it. Items also carry `owner`, `assignee` and `memberCount` (accepted members of the item's epic). A task inside an epic belongs to the epic's owner whoever created it; moving a task to the top level makes it the mover's, and its assignee is cleared unless they are one of the new epic's people. Only tasks inside an epic can be assigned, only the epic's owner and accepted members can be assignees, and a top-level item with members can't be moved into an epic. Bodies are validated with zod; errors return `400` with an `issues` list.

## Production

```bash
npm run build   # client → client/dist, server → server/dist
npm start       # serves the API and, when client/dist exists, the built client on one port
```

Set `NODE_ENV=production` (or `COOKIE_SECURE=true`) when serving over HTTPS so the session cookie is marked Secure. If the client is served from another origin, set `CLIENT_ORIGIN`; behind a reverse proxy set `TRUST_PROXY=true`. All options are listed in `server/.env.example`.

## Layout

```
server/src/
  index.ts           Express app, static client in production
  env.ts             .env loading, DATABASE_URL / TLS resolution
  db.ts              pg pool, schema migration, connection hints
  repo.ts            items + settings repositories (owned or shared with the user)
  sharing.ts         epic members and invitations
  logs.ts            activity log writes and reads
  auth.ts            scrypt passwords, sessions, requireAuth, login throttle
  routes.ts          /api/auth, /api/items, /api/settings, error handler
  types.ts           zod schemas + shared types
  seed.ts            starter tasks for a user
  scripts/add-user.ts
client/src/
  App.tsx            auth gate + workspace state (items, filters, drawer)
  theme.tsx          the three palettes; drives CSS variables and Ant Design tokens
  auth.tsx           session state (me / login / logout)
  filters.ts         date-range scope, budget scope, filters and sorting
  tree.ts            epic roll-ups (progress from tasks) and the list's tree rows
  people.ts          names, initials, "is this mine" for shared items
  lib/selection.ts   spreadsheet-style cell selection for the list view
  reports.ts         report aggregation
  dates.ts           week ranges, deadline urgency, formatting (Monday-first)
  components/
    AppShell.tsx     header: nav, date range, theme, account
    TasksPage.tsx    weekly budget + filter bar + matrix / list
    ReportsPage.tsx  KPIs, by-area table, overdue and completed lists
    ItemDrawer.tsx   task detail / edit / create side panel
    ItemForm.tsx     task form (deadline picker, time & progress)
    Sharing.tsx      an epic's People section and a task's Assignee row
    ActivityLog.tsx  the Activity button and log
    InvitationsBell.tsx  header bell: accept or reject invitations
    UserAvatar.tsx   initials badge and the row's assignee / shared marker
    ListView.tsx     sortable table with selectable Allocated cells
    StatusBar.tsx    sticky footer totalling the selected cells
    Quadrant.tsx, ItemRow.tsx   matrix cells and rows
    TimeEditor.tsx, TimeFields.tsx   quick editor for allocated / spent / progress
    DateRangeBar.tsx, FilterBar.tsx, ThemeSwitcher.tsx, LoginPage.tsx
```

Types are duplicated in `server/src/types.ts` and `client/src/types.ts`; move them to a shared package if the model grows.


### Commands

npm run add-user -- --email you@example.com --name "Your Name"
npm run dev

## Deploying to Vercel

The repo deploys as a single Vercel project: the React client is built to static
assets served by the CDN, and the Express server runs as one serverless function
mounted at `/api`. Both are on the same origin, so the session cookie keeps
working unchanged.

Layout:

- `vercel.json` — install/build commands, `client/dist` as the static output, and
  rewrites sending `/api/*` to the function and everything else to `index.html`.
- `api/index.mjs` — the function entry; re-exports the Express app from
  `server/dist/app.js`, which the build command produces.
- `server/src/app.ts` — builds and exports the app (no `listen`), so the same code
  runs locally and on Vercel. `server/src/index.ts` is the local entry that
  migrates and listens.

Environment variables to set on the Vercel project (Production + Preview):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **Session pooler** connection string |
| `DATABASE_PASSWORD` | database password, if `DATABASE_URL` still contains `[YOUR-PASSWORD]` |
| `TRUST_PROXY` | `true` — Vercel terminates TLS in front of the function |
| `PG_POOL_MAX` | `2` — serverless instances should hold very few connections |
| `SKIP_MIGRATIONS` | optional; `true` once the schema exists, to skip the DDL check on cold starts |

`NODE_ENV=production` is set by Vercel, which turns on secure cookies.

The schema migration is idempotent and runs at most once per function instance,
on the first `/api` request after a cold start.
