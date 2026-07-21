# Shared-hosting + Supabase deployment

This is the recommended Build Week deployment. The website serves the landing page, compiled Design Studio, and the current PHP Costing Studio. Supabase runs live collaboration and server-side OpenAI calls.

## 1. Create and link Supabase

Create a Supabase project, then copy its project reference from the project URL.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Open **Supabase Dashboard → SQL Editor**, paste the contents of
`supabase/migrations/202607200001_shared_business_platform.sql`, and click **Run**.
This is the PostgreSQL schema for shared business accounts. Do not paste
`costing/setup.sql` into Supabase; that file is only for MySQL/MariaDB.

Then run `supabase/migrations/202607200002_vercel_crm_operations.sql`. It adds
the Vercel-compatible Costing, inventory, client, order, measurement-template,
feedback, and Demo Admin tables protected by the same business RLS rules.

Finally run `supabase/migrations/202607210003_workspace_collaboration.sql`. It
adds owner/admin member management so an existing Costudio user can be added to
the registered business workspace and switch into it from Design Settings.

Run `supabase/migrations/202607210004_workspace_tasks.sql` to activate the
homepage task board and realtime workspace messages. Both tables use the same
business membership RLS boundary as Design, Costing, and CRM.

Run `supabase/migrations/202607210005_workspace_business_settings.sql` to add
the central business identity, contact, logo, currency, and unit defaults.

Run `supabase/migrations/202607210006_order_due_date_tasks.sql` to add order due
dates and link active order deadlines to the Workspace To do board.

If Costing's MySQL tables already existed before shared authentication was
added, run `costing/migrations/001_add_supabase_uid.sql` once in phpMyAdmin.
Fresh MySQL installations should use the updated `costing/setup.sql` instead.

Design, Costing, and Measurements authenticate through the same Supabase
account. Host `/design/` and `/costing/` on the same domain to also get automatic
single sign-on between the two browser apps.

## 2. Add server-only secrets

The OpenAI API key must only be stored as a Supabase secret. It must never use a `VITE_` prefix or be placed in browser code.

```powershell
npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
npx supabase secrets set OPENAI_TEXT_MODEL=gpt-5.6-terra
npx supabase secrets set APP_ORIGINS=https://YOUR_DOMAIN
```

Codex credits from Build Week are not API credits. The OpenAI API project used by this function needs its own API access.

## 3. Deploy the Edge Function

From the `costudio-2` directory:

```powershell
npx supabase functions deploy costudio-ai --no-verify-jwt
```

Smoke-test it:

```powershell
Invoke-RestMethod https://YOUR_PROJECT_REF.supabase.co/functions/v1/costudio-ai/api/status
```

The response should report `ok: true`, `hasKey: true`, and `model: gpt-5.6-terra`.

## 4. Configure and build Design Studio

Copy `design-src/.env.production.example` to `design-src/.env.production` and replace all placeholders with the Supabase project URL and publishable/anon key.

```powershell
cd design-src
npm ci
npm run build
```

Copy everything inside `design-src/dist/` into the website's `/design/` directory.

## 5. Publish the platform

Upload these paths while preserving their names:

```text
/index.html       shared landing page
/assets/          landing-page assets
/design/          compiled React app
/costing/         latest PHP Costing Studio
```

On the server, create `/costing/config/local.php` from `local.example.php` and add the MySQL credentials. Do not upload or commit that private file.

Import `costing/setup.sql` into the existing Costudio database if its newest tables have not already been applied.

## 6. Production checks

1. Open `/design/` and confirm Settings reports the API online with a key detected.
2. Open the same collaboration room in two browser windows and share a message or palette.
3. Create a collection, attach a fabric, and select **Continue to Costing Studio**.
4. Sign in to Costing. Confirm the product name and fabrics appear under **Cost a Product**.
5. Enter actual prices and production time, then save the product.
