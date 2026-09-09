# Admin Access Setup

The admin panel lives at **`/admin`** (redirects to **`/admin/dashboard`**).
It is visible in the sidebar only for users with the `admin` role, and the
`/admin/*` routes are also protected by `src/middleware.ts`.

## Grant yourself admin (Supabase SQL editor)

1. Sign up / sign in once so your user exists in `auth.users`.
2. Open Supabase → SQL Editor and run:

```sql
-- Find your user id
select id, email from auth.users where email = 'you@example.com';

-- Make sure the admin role exists
insert into user_roles (name, description, is_default)
values ('admin', 'Administrator', false)
on conflict (name) do nothing;

-- Assign it (replace USER_ID)
insert into user_role_assignments (user_id, role_id)
select 'USER_ID', id from user_roles where name = 'admin'
on conflict do nothing;
```

> Table/column names must match your schema (`user_roles`, `user_role_assignments`).
> Adjust if your migration used different names.

3. Sign out and sign back in, then open `/admin`.

## What lives where

| Page | Route |
|---|---|
| Dashboard | `/admin/dashboard` |
| AI providers / models / quotas / usage | `/admin/ai-providers`, `/admin/ai-models`, `/admin/ai-quotas`, `/admin/ai-usage` |
| Users / roles / devices / credits | `/admin/users`, `/admin/users/roles`, `/admin/users/devices`, `/admin/users/credits` |
| Billing / invoices / payments / ledger | `/admin/billing`, `/admin/billing/invoices`, `/admin/billing/payments`, `/admin/billing/credit-ledger` |
| Audit log | `/admin/audit-log` |

## AI provider keys (free tier)

Keys are read from `.env.local` (see `.env.example`). At least one is
recommended; with none configured the app falls back to the offline local
draft provider and the research page shows a setup hint:

- `GEMINI_API_KEY` / `GOOGLE_AI_STUDIO_API_KEY` — https://aistudio.google.com/apikey
- `MISTRAL_API_KEY` — https://console.mistral.ai/
- `DEEPSEEK_API_KEY` — https://platform.deepseek.com/
- `OPENROUTER_API_KEY` — https://openrouter.ai/keys

Check live status any time (no login needed): `GET /api/ai/health`.
