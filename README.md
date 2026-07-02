# AI Mock Interview Platform

Full-stack, voice-native mock interview platform. Candidates take a live, dynamic voice
interview with an AI interviewer and get a structured feedback report afterward.

This is **Phase 0** — repository scaffold only. No auth, interviews, AI, or voice yet.

## Stack

| Layer    | Choice                                        |
| -------- | --------------------------------------------- |
| Frontend | React + Vite + TypeScript + Tailwind CSS      |
| Backend  | Node.js + Express + TypeScript                |
| Database | PostgreSQL (Neon) + Prisma                    |
| Monorepo | npm workspaces                                |
| Deploy   | Vercel (client) · Render (server) · Neon (db) |

## Project structure

```
apps/
  client/       React + Vite frontend
  server/       Express API
packages/
  shared/       Types shared between client and server
  db/           Prisma schema + client
```

## Prerequisites

- Node.js 20+
- A free [Neon](https://neon.tech) Postgres project (only needed starting Phase 1 — Phase 0 runs without one)

## Setup

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` copies each `.env.example` to `.env`, builds the shared package, and generates
the Prisma client. It's safe to re-run — existing `.env` files are never overwritten.

Once running:

- Client: http://localhost:5173
- Server: http://localhost:4000/api/health

The landing page calls the health endpoint on load and shows a live connection indicator — the
fastest way to confirm the whole pipeline (client → server → shared types) is wired correctly.

### Connecting a real database

Phase 0 ships with no models, so the placeholder values `npm run setup` writes into
`packages/db/.env` are enough to get `npm run dev` running. To connect a real Neon project
(needed starting Phase 1):

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy both the **pooled** and **direct** connection strings from the Neon dashboard
3. Paste them into `packages/db/.env` as `DATABASE_URL` and `DIRECT_URL`

## Scripts

| Command               | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `npm run dev`         | Run client, server, and shared package in watch mode together |
| `npm run build`       | Build shared, server, and client for production               |
| `npm run lint`        | Lint the whole repo                                           |
| `npm run format`      | Format the whole repo with Prettier                           |
| `npm run db:generate` | Regenerate the Prisma client                                  |
| `npm run db:push`     | Push the Prisma schema to the database                        |

## Roadmap

- **Phase 0** (this phase) — repo scaffold, no features
- **Phase 1** — auth (signup/login, JWT)
- **Phase 2+** — interview setup, conversation engine, LiveKit voice layer, feedback reports, dashboard
