# Costudio

Costudio is a collaborative operating workspace for independent fashion teams. It connects the creative work of developing a collection with the commercial work of costing, pricing, client management, and production planning.

The root page is the working environment rather than a marketing page. Its
sidebar connects Design, Costing, Measurements, Clients, and Orders, while the
overview provides a shared task board and realtime team updates.

## The problem

Small fashion teams commonly design in one set of tools and calculate costs in disconnected spreadsheets. Creative decisions such as fabrics and collection structure are copied manually, context gets lost, and products are often underpriced.

## The Costudio workflow

1. Create a designer profile and collection in **Design Studio**.
2. Develop palettes, fabrics, imagery, catalogue assets, and campaign content.
3. Invite collaborators into a live room to share messages and creative decisions.
4. Select **Continue to Costing Studio** to transfer the collection title, category, palette, and fabrics.
5. Add supplier prices, quantities, wastage, production time, overheads, and salary.
6. Calculate COGS, wholesale, direct-to-consumer, and boutique prices.
7. Save the product and manage clients, measurements, and orders.

Collaboration is business-wide: the realtime room is identified by the
registered `@business-name`, and workspace owners or admins can add existing
Costudio users with designer, costing, measurements, member, or admin roles.

## Architecture

| Area | Technology | Purpose |
|---|---|---|
| Platform landing page | HTML/CSS | Shared Costudio entry point |
| Design Studio | React, TypeScript, Vite | Collection development and portfolio tools |
| Design production services | Supabase Edge Functions + Realtime | GPT-5.6 calls and live rooms without a Node host |
| Design local server | Express, WebSocket, MySQL | Local development and optional persistence |
| Costing Studio | HTML/CSS/JavaScript | Cost and pricing workflow |
| Costing API | PHP 8, PDO, MySQL | Session auth, products, CRM, and orders |
| Studio handoff | Versioned browser-storage contract | Transfers a design draft between same-origin modules |

Shared authentication uses Supabase Auth. A business registered as, for
example, **Ginani Apparel** receives one protected workspace for Design,
Costing, clients, and Measurements. Apply
`supabase/migrations/202607200001_shared_business_platform.sql` in the Supabase
SQL Editor before registering the first account. Do not run `costing/setup.sql`
in Supabase; it is the MySQL schema for the PHP costing compatibility layer.

`/auth.html` is the single account entry point. Design, Costing, and the Client
CRM redirect there when signed out and reuse the same Supabase session when
signed in; individual studios do not maintain separate accounts.

### Competition demo

Costudio uses one shared Supabase login for Workspace, Design, Costing,
Measurements, Clients, and Orders. Judges can choose **Use demo** on
`/auth.html` to enter the persistent demonstration workspace with:

- Email: `demo@ginani.net`
- Password: `costudio-demo2026`

Create this user once in **Supabase Dashboard > Authentication > Users > Add
user**, mark it confirmed, and use `Costudio Demo` as its business/display name.
The database trigger creates its business workspace automatically. The demo
account receives starter tasks and sample CRM records without deleting saved
work. Rotate or remove the public password after judging.

On Vercel, Costing and CRM use `costing/supabase-data.js` and Supabase RLS
directly. PHP, MySQL configuration, SQL setup files, and editable source are
excluded from the public deployment through `.vercelignore`.

The handoff transfers creative facts, not invented prices. Costing Studio creates blank price and quantity fields so the maker remains responsible for real supplier and production data.

## Project structure

```text
costudio-2/
|-- index.html          # Platform landing page
|-- assets/             # Platform media
|-- design/             # Production build served at /design/
|-- design-src/         # Editable React + Express source
`-- costing/            # Costing UI, PHP APIs, and database schema
```

## Local setup

### Design Studio

```powershell
cd design-src
npm ci
Copy-Item env.example .env
npm run server
npm run dev
```

Add `OPENAI_API_KEY` and a strong `JWT_SECRET` to `design-src/.env`. The Vite development server runs at `http://localhost:8080/design/` and proxies `/api` and `/ws` to the Express server. Production uses Supabase; see `DEPLOYMENT.md`.

Build the deployable Design Studio with `npm run build`, then copy the contents of `design-src/dist/` into `design/`.

### Costing Studio

1. Create a MySQL database and import `costing/setup.sql`.
2. Copy `costing/config/local.example.php` to `costing/config/local.php`.
3. Add local database credentials to `local.php`. This file is ignored by Git.
4. Serve the repository with PHP/Apache and open `/costing/`.

## Demo flow

Authentication is required so judging changes persist in the same recoverable
workspace. The public demo credentials above are shown only on the shared login
page; individual modules never ask for a second login.

1. Open the Costudio landing page and choose **Design a Collection**.
2. Create or load a collection and attach at least one fabric.
3. Show the Collaboration card and copy the room invitation link.
4. Select **Continue to Costing Studio**.
5. Costing Studio opens Materials with the collection and fabrics already imported.
6. Enter material prices and quantities, then show Time and Pricing.
7. Save the priced product and show it on the dashboard.

## Verification

From `design-src/`, run `npm run build` and `npm run lint`. The production build passes. Lint reports advisory React hook/Fast Refresh warnings but no errors.

## OpenAI Build Week implementation

- **GPT-5.6:** `gpt-5.6-terra` runs fashion collection copy, product copy, inspiration, social strategy, and visual prompt generation through the Responses API. Terra preserves the former mini-model's latency/cost role, with reasoning explicitly set to `none` for the baseline migration.
- **Image generation:** `gpt-image-1` creates collection visuals from GPT-5.6-authored production prompts.
- **Codex:** Codex was used to audit and consolidate the two applications, implement the versioned Design-to-Costing handoff, migrate production collaboration to Supabase Realtime, build the Edge Function, secure configuration, validate both apps, and prepare deployment documentation.
- **Key security:** The OpenAI key is stored only in Supabase Edge Function secrets and is never exposed to the React bundle.

The production architecture follows the official GPT-5.6 guidance by using the Responses API and preserving the old lightweight model role instead of blindly replacing every model with the flagship tier.

## Current boundaries

- Design, Costing, and CRM share one Supabase session; competition mode creates that session anonymously.
- Production collaboration requires Supabase configuration; local collaboration can use the Express/WebSocket server.
- The cross-studio handoff requires both modules to be served from the same web origin.

These boundaries keep the hackathon prototype deployable while leaving a clear path toward shared organizations, permissions, and a unified API gateway.
