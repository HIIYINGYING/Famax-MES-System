# Vercel projects

Create one Vercel project for each Next.js app and set its Root Directory to the matching `apps/<name>` directory. Use Bun 1.4.2 for installation and the app-local `build` script for builds. Set the required environment variables for Better Auth and the API per environment. Configure each `BETTER_AUTH_URL`, `APP_URL`, and `AUTH_TRUSTED_ORIGINS` to the deployed hostnames.

The NestJS API and PostgreSQL 17 service deploy through Railway (`railway.toml` and `api.Dockerfile`). Attach a persistent PostgreSQL volume, set `DATABASE_URL` and `BETTER_AUTH_SECRET` as Railway secrets, and leave credential values out of Git.
