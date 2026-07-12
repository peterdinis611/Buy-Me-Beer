# Buy Me Beer 🍺☕

A [Buy Me a Coffee](https://www.buymeacoffee.com) / Buy Me a Beer clone for creators.

**Stack:** Express.js · TypeScript · EJS · Tailwind CSS · **Drizzle ORM + SQLite** · Stripe (optional)

## Features

### Core
- Creator signup & login with sessions
- Public profile page (`/yourname`)
- **Buy me a coffee** & **Buy me a beer** tip tiers + custom amount
- Supporter messages & **supporter wall** (public messages)
- Creator dashboard with earnings & history
- Profile settings (bio, avatar, prices, theme)
- **Explore** page listing creators (`/explore`)

### Auth (v2)
- Email verification (link logged to console in dev)
- Forgot / reset password
- Change password in dashboard
- Rate limiting on auth & support routes
- Zod input validation

### Creator tools (v2)
- **Funding goal** with progress bar
- Social links (website, Twitter/X, GitHub)
- **Membership tiers** (CRUD at `/dashboard/tiers`)
- Stripe webhooks for payment confirmation

### Payments
- **Demo payment mode** (no Stripe keys needed)
- **Stripe Checkout** when `STRIPE_SECRET_KEY` is set

## Quick start

```bash
cd buy-me-beer
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:3000**

### Demo account (auto-seeded)

| | |
|---|---|
| Page | http://localhost:3000/demo |
| Email | demo@buy-me-beer.local |
| Password | demo1234 |

## Environment

Copy `.env.example` and configure:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3000`) |
| `SESSION_SECRET` | Session signing secret |
| `DATABASE_PATH` | SQLite file path (default `data/app.db`) |
| `BASE_URL` | Public URL for email links & Stripe |
| `AUTO_VERIFY_EMAIL` | `true` to skip verification in dev |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Database

SQLite via Drizzle ORM. Migrations run automatically on startup.

```bash
npm run db:generate   # generate migration from schema changes
npm run db:push       # push schema directly (dev)
npm run db:studio     # Drizzle Studio UI
```

Legacy `data/db.json` is migrated automatically on first run if SQLite is empty.

## Stripe (production)

1. Create a [Stripe](https://stripe.com) account
2. Add keys to `.env` (see above)
3. Point webhook to `POST /webhooks/stripe`
4. Restart the server — payments redirect to Stripe Checkout

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Tailwind watch + Express with hot reload |
| `npm run build` | Compile TS + minify CSS |
| `npm start` | Run production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |

## Project structure

```
buy-me-beer/
├── src/
│   ├── server.ts          # Entry + migrations on boot
│   ├── app.ts             # Express app
│   ├── routes/            # auth, dashboard, pages, support, webhook
│   ├── db/
│   │   ├── schema.ts      # Drizzle schema
│   │   ├── index.ts       # SQLite client
│   │   ├── queries.ts     # DB operations
│   │   └── migrate.ts     # Migrations + seed
│   ├── lib/validation.ts  # Zod schemas
│   ├── services/          # stripe, email
│   └── styles/input.css   # Tailwind source
├── drizzle/               # SQL migrations
├── views/                 # EJS templates
├── public/css/            # Compiled Tailwind
└── data/app.db            # SQLite database (auto-created)
```

## License

MIT
