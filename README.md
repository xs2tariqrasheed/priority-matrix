# Priority matrix

Create items, label them **P/V** (Pain killer / Vitamin) and **S/L** (Short / Long focus), and see them in a 2×2 matrix.

- **Client:** React + Vite + Ant Design (TypeScript)
- **Server:** Node + Express + SQLite via better-sqlite3 (TypeScript)

## Run it

Requires Node 20+.

```bash
npm install          # installs concurrently at the root
npm run install:all  # installs server + client deps
npm run seed         # optional: loads your 30 starting items
npm run dev          # API on :3001, web on :5174
```

Open http://localhost:5173. Vite proxies `/api` to the Express server.

Re-seed from scratch: `npm --prefix server run seed -- --force`

## Features

- Add, edit, delete items (title, area, category, P/V, S/L, notes)
- Each quadrant's **Add** button pre-selects its labels
- Drag an item into another quadrant to relabel it
- Mark items done; toggle **Show done** to see them
- Filter by area, search by title/category/notes
- Items grouped by area inside each quadrant

## API

| Method | Path           | Body                                                        |
|--------|----------------|-------------------------------------------------------------|
| GET    | /api/items     |                                                             |
| GET    | /api/items/:id |                                                             |
| POST   | /api/items     | `{ title, area, impact, focus, category?, notes?, done? }`  |
| PATCH  | /api/items/:id | any subset of the above                                     |
| DELETE | /api/items/:id |                                                             |

`impact` is `"P"` or `"V"`, `focus` is `"S"` or `"L"`. Bodies are validated with zod; errors return `400` with an `issues` list.

## Layout

```
server/src/
  index.ts    Express app
  routes.ts   /api/items routes + error handler
  db.ts       SQLite schema + repository
  types.ts    zod schemas + Item type
  seed.ts     starting data
client/src/
  App.tsx                       state, filters, matrix layout
  api.ts                        fetch wrapper
  labels.ts                     P/V/S/L names, colors, quadrant copy
  components/Quadrant.tsx       drop target + grouped list
  components/ItemRow.tsx        draggable row
  components/ItemFormModal.tsx  create/edit form
```

The SQLite file is `server/data.sqlite` (override with `DB_PATH`). Types are duplicated in `server/src/types.ts` and `client/src/types.ts`; move them to a shared package if the model grows.
