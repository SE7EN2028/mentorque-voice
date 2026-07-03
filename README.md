# MentorQ

Full-stack, voice-native AI mock interview platform. Candidates take a live, dynamic voice
interview with an AI interviewer tailored to their resume and target role, then get a detailed,
deterministic-and-LLM feedback report immediately after.

## What it does

- Sign up with a target job role and experience level, optionally upload a resume (PDF)
- Start a mock interview (Behavioral, Technical, System Design, or HR/Culture Fit) with an
  optional job description for extra context
- Talk to the AI interviewer over a live voice call (LiveKit) — it asks follow-ups, adjusts
  difficulty, and adapts to what you actually say, not a fixed script
- Get a structured feedback report right after: overall score, a 6-dimension breakdown
  (communication, technical knowledge, problem solving, confidence, depth of knowledge, STAR
  structure), topic coverage, difficulty progression, strengths, weaknesses, and concrete
  next steps — the numeric scores are computed deterministically from the conversation, not
  invented by the LLM
- Review past sessions, track score trends, and manage your profile from a dashboard

## Stack

| Layer           | Choice                                             |
| --------------- | -------------------------------------------------- |
| Frontend        | React 19 + Vite + TypeScript + Tailwind CSS v4     |
| Backend API     | Node.js + Express 5 + TypeScript                   |
| Voice worker    | Node.js + LiveKit Agents (Node SDK)                |
| Conversation AI | Google Gemini 2.5 Flash (`@google/genai`)          |
| Speech-to-text  | Deepgram                                           |
| Text-to-speech  | Cartesia (default) or Google Gemini TTS            |
| Database        | PostgreSQL (Neon) + Prisma                         |
| Auth            | JWT in an httpOnly cookie, bcrypt password hashing |
| Validation      | Zod schemas shared between client and server       |
| Monorepo        | npm workspaces                                     |

## Project structure

```
apps/
  client/              React + Vite frontend (all pages, the design system, voice-room UI)
  server/               Express REST API (auth, sessions, uploads, reports)
  agent-worker/         LiveKit voice agent process (STT → conversation engine → TTS)
packages/
  shared/               Types + Zod schemas shared across every app
  db/                   Prisma schema + generated client
  interview-engine/     The conversation engine: blueprints, prompt builder, LLM provider
                         abstraction, guardrails, difficulty controller
  interview-session/    Session lifecycle orchestration — the single place start/message/end
                         run, called identically by the REST API (text mode) and the voice
                         worker (voice mode)
  feedback-engine/      Generates the post-interview report: deterministic scoring +
                         LLM-written qualitative feedback, independent of LiveKit/Express/UI
```

## Prerequisites

- Node.js 20+
- A free [Neon](https://neon.tech) Postgres project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)
- A [LiveKit Cloud](https://livekit.io) project (URL + API key/secret) — needed for live voice
  interviews
- A [Deepgram](https://deepgram.com) API key — speech-to-text for the voice agent
- A [Cartesia](https://cartesia.ai) API key (default), or a Google AI Studio API key with
  Gemini TTS access — text-to-speech for the voice agent

The web app (signup/login/dashboard/session history/reports) works without LiveKit/Deepgram/TTS
credentials configured — only starting an actual live voice interview needs those.

## Setup

```bash
npm install
npm run setup
```

Then fill in real credentials in each `.env` file (see below), and run the first migration:

```bash
npm run db:migrate
npm run dev
```

`npm run setup` copies each `.env.example` to `.env` if missing (and reconciles in any new keys
if the file already exists), generates a random `JWT_SECRET`, and builds every package the apps
depend on. It's safe to re-run at any time — existing `.env` files and an already-generated
secret are never overwritten, only missing keys are appended.

Once running:

- Client: http://localhost:5173
- Server: http://localhost:4000/api/health

### Connecting a real database

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy both the **pooled** and **direct** connection strings from the Neon dashboard
3. Paste them into `DATABASE_URL`/`DIRECT_URL` in **both** `packages/db/.env` and
   `apps/server/.env` (the server queries Prisma directly in-process, so it needs its own copy
   in its own env file — each app's `.env` is only loaded from that app's own directory)
4. Run `npm run db:migrate` to apply every migration

### Enabling live voice interviews

The voice agent worker (`apps/agent-worker`) is a separate process from the web server, started
on its own:

```bash
npm run setup:voice   # builds the agent-worker package
npm run dev:voice     # runs it, connects to LiveKit and waits for a room to join
```

Fill in `LIVEKIT_URL`/`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` in **both** `apps/server/.env`
(issues the join token) and `apps/agent-worker/.env` (joins the room), plus
`GEMINI_API_KEY`, `DEEPGRAM_API_KEY`, and `CARTESIA_API_KEY` in `apps/agent-worker/.env`.

TTS provider is picked by `TTS_PROVIDER` in `apps/agent-worker/.env` — `cartesia` (default,
used for both development and demos) or `google` (Gemini TTS, needs `GOOGLE_API_KEY`; note
Gemini's free tier caps TTS at 3 requests/minute, easily exhausted mid-interview).

## Scripts

| Command                | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Run the client, server, and every backend package in watch mode |
| `npm run dev:voice`    | Run the LiveKit voice agent worker (separate process, opt-in)   |
| `npm run build`        | Build every package and app for production                      |
| `npm run setup:voice`  | Build only the agent-worker package                             |
| `npm run lint`         | Lint the whole repo                                             |
| `npm run format`       | Format the whole repo with Prettier                             |
| `npm run format:check` | Check formatting without writing                                |
| `npm run db:generate`  | Regenerate the Prisma client                                    |
| `npm run db:migrate`   | Create/apply a Prisma migration in development                  |
| `npm run db:push`      | Push the Prisma schema to the database without a migration file |

## API overview

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/sessions`, `GET /api/sessions`, `GET /api/sessions/:id`, `PATCH /api/sessions/:id`,
  `DELETE /api/sessions/:id`
- `POST /api/sessions/:id/token` — issues a LiveKit join token for a voice interview
- `GET /api/sessions/:id/report` — the structured feedback report (404 until the interview ends,
  409 while it's still being generated)
- `POST /api/uploads/resume` — extracts text from an uploaded PDF resume
- `POST /api/interviews/:sessionId/start`, `POST /api/interviews/:sessionId/message`,
  `POST /api/interviews/:sessionId/end` — text-mode conversation turns (used internally by the
  same engine the voice worker drives; not the primary UI flow, which is voice-only)

The JWT lives in an httpOnly, `SameSite` cookie — never in `localStorage`. No email verification
or password reset in this version.

## Deployment

Designed for platform-as-a-service targets, no containers: Vercel (client), Render or similar
(server + agent-worker as two separate services), Neon (database). Each service reads its
config from the same environment variables documented in its `.env.example` — set those in the
hosting platform's environment variable settings rather than shipping a `.env` file.
