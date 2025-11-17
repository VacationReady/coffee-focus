# Coffee Focus

An authenticated productivity cockpit for tracking focus sessions, sticky notes, and project rituals. Built with Next.js App Router, NextAuth, Prisma, PostgreSQL, and SWR-powered client interactions.

## Requirements

- Node.js 18+
- PostgreSQL database
- npm (ships with Node)

## Environment

Copy the example env file and fill in the secrets:

```bash
cp .env.example .env.local
```

`DATABASE_URL`, `NEXTAUTH_SECRET`, and the OAuth credentials (e.g. GitHub) must be set before running migrations or the app.

## Setup

```bash
npm install
npx prisma migrate dev
npm run seed:user
```

- `npx prisma migrate dev` applies the latest Prisma schema to your local database.
- `npm run seed:user` creates a demo user for local login.

## Development

```bash
npm run dev
```

Visit http://localhost:3000 and sign in with the seeded credentials.

## Quality & Verification

```bash
npm run lint
```

Run this before committing to ensure the project satisfies the lint rules enforced in CI.
