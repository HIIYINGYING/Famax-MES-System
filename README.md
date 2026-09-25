# FAMAX MES

FAMAX MES is a manufacturing operations workspace for customer orders, production planning, shop-floor execution, inventory, procurement, and quality.

## Workspace

The repository is a Bun 1.4 and Turborepo monorepo. The active applications use Next.js 16, React 19, and Tailwind CSS 4. Shared application and service code lives in `packages/`.

| App | Local URL | Purpose |
| --- | --- | --- |
| `apps/marketing` | `http://localhost:3001` | Product site |
| `apps/web` | `http://localhost:3000` | Main MES workspace |
| `apps/docs` | `http://localhost:3002` | Operations guides |
| `apps/platform` | `http://localhost:3003` | Platform administration |
| `apps/partner` | `http://localhost:3004` | Partner workspace |
| `apps/api` | `http://localhost:4000` | NestJS and Fastify API |

## Start locally

Install [Bun 1.4](https://bun.sh/docs/installation) if it is not on your machine yet. In PowerShell, the official installer is `powershell -c "irm bun.sh/install.ps1|iex"`; then open a new terminal and check `bun --version`.

```powershell
Copy-Item .env.example .env
bun install
bun run dev
```

The workspace command starts each app and the API through Turbo. You can also run `npm run dev` after `bun install`; the root script resolves Turbo from the installed workspace binaries. Do not use `npm install` to resolve this Bun workspace.

For a fully connected local database and authentication flow, start PostgreSQL 17 with `docker compose -f infra/docker-compose.yml up -d`, configure `DATABASE_URL` and `BETTER_AUTH_SECRET` in `.env`, then generate and apply Drizzle migrations:

```powershell
bun run db:generate
bun run db:migrate
```

Register the account that should manage MES roles, then grant it administrator access once:

```powershell
bun run db:promote-admin admin@example.com
```

Sign in with that account and use **Administration → Users & access** to assign the other workspace roles. The command only changes the matching existing account; it does not create an account or change its password.

Without a database configured, the main web app opens in a local demo workspace. API health and database-backed operations report that the database is unavailable instead of returning fabricated records.

## Services and deployment

- Database: PostgreSQL 17 through Drizzle ORM and postgres.js (`packages/db`).
- Authentication: Better Auth email/password with admin and organization plugins (`packages/auth`).
- Email: Resend + React Email (`packages/email`).
- Flags: GrowthBook with a JSON offline fallback (`packages/flags`).
- AI: OpenRouter through the Vercel AI SDK (`packages/ai`).
- Logs: structured logging with optional `@vigor/observability` Rootprint adapter and HTTP ingest fallback (`packages/observability`).
- WhatsApp: opt-in only Cloud API notifications (`packages/whatsapp`).
- CLI and MCP: `famax-mes health`, `famax-mes work-orders`, and `famax-mes mcp`; the API exposes authenticated Streamable HTTP MCP at `/api/v1/mcp`.
- Next.js applications deploy separately to Vercel; the API and PostgreSQL service deploy on Railway using `infra/`.

See `.env.example` for all supported configuration. Secrets stay in local environment files and deployment secret stores; do not commit them.
