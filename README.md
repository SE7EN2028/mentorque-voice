# AI Mock Interview Platform

Full-stack, voice-native mock interview platform. Candidates take a live, dynamic voice
interview with an AI interviewer and get a structured feedback report afterward.

This is **Phase 1** — authentication is live. Interviews, AI, voice, and the dashboard are not
built yet; Dashboard and Interview Setup are placeholder pages that prove routing and session
state work.

## Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Frontend   | React + Vite + TypeScript + Tailwind CSS           |
| Backend    | Node.js + Express + TypeScript                     |
| Database   | PostgreSQL (Neon) + Prisma                         |
| Auth       | JWT in an httpOnly cookie, bcrypt password hashing |
| Validation | Zod schemas shared between client and server       |
| Monorepo   | npm workspaces                                     |
| Deploy     | Vercel (client) · Render (server) · Neon (db)      |

## Project structure

```
apps/
  client/       React + Vite frontend
  server/       Express API
packages/
  shared/       Types + Zod schemas shared between client and server
  db/           Prisma schema + client
```

## Prerequisites

- Node.js 20+
- A free [Neon](https://neon.tech) Postgres project — **required starting this phase**, auth
  needs a real database to sign up and log in against

## Setup

```bash
npm install
npm run setup
```

Then fill in `packages/db/.env` with your Neon connection strings (see below), and run the
first migration:

```bash
npm run db:migrate
npm run dev
```

`npm run setup` copies each `.env.example` to `.env`, generates a random `JWT_SECRET`, builds
the shared package, and generates the Prisma client. It's safe to re-run — existing `.env`
files and an already-generated secret are never overwritten.

Once running:

- Client: http://localhost:5173
- Server: http://localhost:4000/api/health

### Connecting a real database

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy both the **pooled** and **direct** connection strings from the Neon dashboard
3. Paste them into `packages/db/.env` as `DATABASE_URL` and `DIRECT_URL`
4. Run `npm run db:migrate` to create the `users` table

## Scripts

| Command               | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `npm run dev`         | Run client, server, and shared package in watch mode together   |
| `npm run build`       | Build shared, server, and client for production                 |
| `npm run lint`        | Lint the whole repo                                             |
| `npm run format`      | Format the whole repo with Prettier                             |
| `npm run db:generate` | Regenerate the Prisma client                                    |
| `npm run db:migrate`  | Create/apply a Prisma migration in development                  |
| `npm run db:push`     | Push the Prisma schema to the database without a migration file |

## Auth

- `POST /api/auth/signup` — name, email, password, target job role, experience level
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` — used on page load to restore the session from the cookie

The JWT lives in an httpOnly, `SameSite` cookie — never in `localStorage` — so it isn't
readable from JavaScript. No email verification or password reset in this phase.

## Roadmap

- **Phase 0** — repo scaffold, no features
- **Phase 1** (this phase) — auth (signup/login, JWT), route protection, placeholder Dashboard
  and Interview Setup pages
- **Phase 2+** — interview setup, conversation engine, LiveKit voice layer, feedback reports,
  real dashboard
