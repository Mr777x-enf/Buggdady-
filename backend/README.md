# Backend operations

## Database migration

The backend uses `node-pg-migrate`. From the `backend` directory, apply pending
migrations using `DATABASE_URL` from `backend\.env`:

```powershell
npm run migrate -- up --envPath .\.env
```

The AI service has a separate migration directory. Apply it separately and use
the AI service database configuration from `ai-service\.env`. Use its own
migration-history table so its older timestamp does not conflict with the
already-applied backend migrations:

```powershell
npm run migrate -- up --migrations-dir ..\ai-service\migrations --migrations-table ai_pgmigrations --envPath ..\ai-service\.env
```

The new migration adds email-verification columns and the repository ingestion
state. It is additive and preserves existing users as verified. Existing
repositories start as `pending`; open an existing chat and choose **Index and
continue** to re-index that repository without changing its session ID or
removing its saved messages. The AI migration installs pgvector and creates
`code_chunks`; it is required before starting the AI service or indexing code.
Do not roll back this migration in production because it removes the verification
state and ingestion status.

## Email verification configuration

The existing Gmail OAuth2 mail transport is used. Configure these values in
`backend\.env`; never commit their values:

- `MAIL_USER` (or the existing fallback `EMAIL_USER`)
- `CLIENT_ID`
- `CLIENT_SECRET`
- `REFRESH_TOKEN`
- `FRONTEND_URL` (the site base URL used for verification links)

The AI service reads its settings only from `ai-service\.env`. Configure
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `GEMINI_API_KEY`
there for database access, embedding generation, and LLM responses.
`FRONTEND_URL` belongs in `backend\.env` and should be set to the deployed site
URL so verification links do not use the development default.

The Next.js frontend loads its own `frontend\.env`; set
`NEXT_PUBLIC_API_URL` there to the backend API base URL. The repository-root
`.env` is reserved for Docker Compose's `POSTGRES_USER`, `POSTGRES_PASSWORD`,
and `POSTGRES_DB` variables. Each service should be started with its own
directory as the working directory so it loads that service's environment.
