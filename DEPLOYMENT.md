# Shared-hosting + Supabase deployment

This is the recommended Build Week deployment. The website serves the landing page, compiled Design Studio, and the current PHP Costing Studio. Supabase runs live collaboration and server-side OpenAI calls.

## 1. Create and link Supabase

Create a Supabase project, then copy its project reference from the project URL.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

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
