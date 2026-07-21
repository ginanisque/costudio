# Costudio

**From sketch to customer.**

Costudio is a collaborative operating workspace for independent fashion businesses. It connects collection design, accurate garment costing, customer measurements, orders, team tasks, and production handoff in one shared business workspace.

- **Live app:** [costudio-bice.vercel.app](https://costudio-bice.vercel.app/)
- **Repository:** [github.com/ginanisque/costudio](https://github.com/ginanisque/costudio)
- **Demo email:** `demo@ginani.net`
- **Demo password:** `costudio-demo2026`

The demo account is intentionally shared for competition judging. Its password should be changed or the account removed after judging.

## The problem

Small fashion teams often sketch in one tool, cost garments in spreadsheets, keep measurements in notebooks, discuss production in chat, and send technical files separately. Information is repeatedly copied, creative intent gets lost, deadlines are missed, and products can be underpriced.

Costudio turns those disconnected activities into one traceable workflow—from the first design idea to the finished garment delivered to the customer.

## What Costudio does

### Shared Workspace

- Uses one Supabase account across Workspace, Design, Costing, Measurements, Clients, Orders, Portfolio, and Production.
- Stores business-wide defaults such as name, logo, address, contact details, and currency once.
- Provides a ClickUp-style task board, team messages, due dates, assignments, and progress tracking.
- Lets workspace owners add registered collaborators and manage their roles.

### Design Studio

- Saves reusable designer profiles and collections.
- Accepts collection descriptions, colour palettes, fabric swatches, model references, and sketches or style concepts.
- Uses GPT-5.6 to develop designer copy, collection direction, product descriptions, inspiration, social content, and detailed image prompts.
- Generates collection visuals with the selected creative references and saves usable results into the collection gallery.
- Supports individual client designs that can be attached to a client or order.
- Produces portfolio and printable catalogue outputs without exposing internal IDs or model-reference names.

### Costing Studio

- Receives design and material context through the Design-to-Costing handoff.
- Calculates material, labour, overhead, wastage, COGS, wholesale, direct-to-consumer, and boutique pricing.
- Keeps real supplier prices and quantities under the maker's control; AI does not invent commercial figures.

### Clients, Measurements, and Orders

- Maintains client details, measurement records, individual designs, order history, payment status, and delivery dates.
- Adds order due dates to the shared task workflow.
- Breaks an order into assignable Design, Patternmaking, Sewing, Finishing, and Other tasks so production progress can be tracked.

### Production Handoff

- Packages designs, patterns, specifications, tech sheets, and supporting files for a collaborator or external producer.
- Connects files to the relevant order instead of leaving production instructions scattered across messages.
- Uses private Supabase Storage and time-limited signed links for controlled sharing.

## How GPT-5.6 is used

Costudio uses `gpt-5.6-terra` in its Supabase Edge Function through the OpenAI Responses API. The model can be changed with the server-side `OPENAI_TEXT_MODEL` secret.

GPT-5.6 powers:

- designer-profile writing;
- collection descriptions and creative direction;
- inspiration and mood development;
- product descriptions;
- social campaign copy; and
- multimodal production-prompt creation from fabrics, palettes, sketches, style references, and model-reference images.

The Edge Function currently uses `reasoning.effort: "none"` for responsive interactive generation and explicit text verbosity controls. This follows OpenAI's guidance to establish a low-latency baseline and raise reasoning effort only where evaluation shows it adds value. Image rendering is handled separately by `gpt-image-2`, using image edits when visual references are supplied and image generation otherwise.

The OpenAI API key is stored only in Supabase Edge Function Secrets. It is never placed in the Vite bundle, browser storage, or the repository.

Official references: [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model) · [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)

## How Codex was used

Codex was the engineering collaborator used to turn separate Design and Costing applications into the unified Costudio prototype. It helped with product reasoning, codebase analysis, implementation, debugging, validation, and deployment preparation.

Specifically, Codex was used to:

- audit the existing applications and preserve the mature costing logic;
- design and implement the shared Workspace and single-authentication experience;
- create Supabase schemas, migrations, row-level security policies, and persistence flows;
- build the Supabase Edge Function and migrate AI text generation to GPT-5.6 and the Responses API;
- secure OpenAI access behind server-side secrets and configure allowed origins;
- implement the Design-to-Costing handoff and persistent collection Portfolio;
- connect clients, measurements, individual designs, orders, due dates, and assignable production tasks;
- build Production Handoff with private files and expiring signed links;
- diagnose live deployment, authentication, schema-cache, saving, export, navigation, and responsive-layout issues;
- improve the catalogue/PDF experience and remove internal metadata from customer-facing output; and
- prepare the repository, deployment guidance, competition narrative, and demo flow.

Codex is a development tool used to build and refine Costudio; it is not presented as a hidden runtime feature of the product. Learn more at [OpenAI Codex](https://developers.openai.com/codex/).

## Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Public entry | HTML, CSS, JavaScript | Landing page and shared sign-in entry |
| Workspace | HTML, CSS, JavaScript | Overview, tasks, messages, settings, portfolio, and production |
| Design Studio | React, TypeScript, Vite | Profiles, collections, references, AI generation, gallery, and export |
| Costing and CRM | HTML, CSS, JavaScript | Costing, clients, measurements, orders, and workflow |
| Identity and data | Supabase Auth, Postgres, RLS, Realtime | One session, persistent business data, collaboration, and access control |
| Files | Supabase Storage | Logos, collection assets, patterns, tech sheets, and handoff files |
| AI gateway | Supabase Edge Function | Secure GPT-5.6 and image-generation requests |
| Hosting | Vercel | Static application deployment |

The deployed application talks directly to Supabase through row-level security. Legacy PHP/MySQL files remain as compatibility material but are excluded from the Vercel deployment.

## Security and persistence

- One Supabase Auth session is reused by every Costudio module.
- Business data is scoped to a shared workspace and protected with row-level security.
- OpenAI credentials remain in server-side Supabase secrets.
- Production assets use a private storage bucket and signed, expiring download URLs.
- The Edge Function validates allowed browser origins through `APP_ORIGINS`.
- The public demo uses a real persistent account so judges can save and revisit work.

## Project structure

```text
costudio/
|-- index.html                 # Public landing page
|-- auth.html                  # Shared authentication
|-- workspace/                 # Collaborative workspace application
|-- design/                    # Built Design Studio served at /design/
|-- design-src/                # React/TypeScript Design Studio source
|-- costing/                   # Costing, CRM, measurements, and orders
|-- supabase/
|   |-- functions/costudio-ai/ # Secure OpenAI Edge Function
|   `-- migrations/            # Shared platform migrations 001-008
|-- assets/                    # Shared brand and landing-page assets
|-- DEPLOYMENT.md              # Deployment instructions
`-- SUBMISSION.md              # Competition description and demo script
```

## Setup

### 1. Configure Supabase

Create a Supabase project, then run the SQL files in `supabase/migrations/` in numerical order from `001` through `008`. Do not rerun an earlier migration after a later one has succeeded unless its file explicitly says it is repeatable.

Create a confirmed user in Supabase Authentication, or use the normal Costudio registration flow. To reproduce the judging shortcut, create the demo user shown above.

### 2. Configure the AI function

Log in to the Supabase CLI, link the project, add the required secrets, and deploy the function:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set OPENAI_API_KEY=YOUR_KEY
npx supabase secrets set OPENAI_TEXT_MODEL=gpt-5.6-terra
npx supabase secrets set APP_ORIGINS=https://YOUR_DOMAIN
npx supabase functions deploy costudio-ai
```

The CLI login token is stored on the developer's computer, so normal users never see this process and it does not need to be repeated for every visitor.

### 3. Configure and build Design Studio

Create `design-src/.env.production` from `design-src/env.example` and set the public Supabase URL, anon key, and Edge Function URL. Never put `OPENAI_API_KEY` in this file.

```powershell
cd design-src
npm ci
npm run build
```

Copy the generated contents of `design-src/dist/` into `design/` before deploying the static site. See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete production checklist.

## Competition demo flow

1. Open the [live app](https://costudio-bice.vercel.app/) and briefly explain the “From sketch to customer” promise.
2. Choose **Sign in**, use the demo credentials, and enter the shared Workspace.
3. Show business settings, the task board, and the single sidebar connecting all studios.
4. Open Design, load or create a designer profile and collection, then show fabrics, palette, model/style references, and generated looks.
5. Open Portfolio to demonstrate that the saved collection remains reusable and exportable.
6. Send a design into Costing, enter real material and production inputs, and show the calculated selling prices.
7. Open a client and demonstrate measurements, an order due date, and assigned production tasks.
8. Show Production Handoff attaching patterns, technical files, and order context for a collaborator or manufacturer.
9. Return to Workspace to show the connected tasks and progress—the full journey from sketch to customer.

## Verification

From `design-src/`:

```powershell
npm run build
npm run lint
```

The production build is deployed to Vercel. Supabase migrations, Auth, database persistence, Storage, and the `costudio-ai` Edge Function provide the shared backend.

## Prototype boundaries and next steps

- AI-generated fashion imagery is a creative concept tool; exact fabric texture, garment construction, and model likeness still require human review.
- External manufacturers currently receive secure handoff files rather than a dedicated supplier portal.
- The next product stage would add approval history, richer role permissions, production notifications, supplier accounts, and automated test coverage across the complete order lifecycle.

Costudio's core value is already demonstrable: creative decisions, commercial calculations, customer records, and production work remain connected instead of being rebuilt in separate tools.
