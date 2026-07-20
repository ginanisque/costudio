# Costudio — OpenAI Build Week submission draft

## Category

**Work & Productivity**

## Tagline

From creative concept to confident price: one collaborative workspace for independent fashion teams.

## Short description

Costudio connects the work fashion teams normally split across moodboards, AI tools, spreadsheets, costing calculators, and client records. Designers can develop a collection together, generate press and campaign material with GPT-5.6, attach palettes and fabrics, and transfer the collection directly into a production-aware costing workflow. Costudio then combines material prices, wastage, labour time, overheads, and salary to calculate COGS and viable selling prices.

## Project description

Independent designers often do excellent creative work but lose margin because design decisions and business decisions live in separate tools. Fabric choices are copied manually into spreadsheets, labour is underestimated, overheads are forgotten, and selling prices are based on intuition.

Costudio turns that fragmented process into one connected workflow:

1. A designer creates a profile and collection brief.
2. GPT-5.6 Terra produces collection copy, product descriptions, social content, inspiration, and production-ready visual prompts.
3. Collaborators join a Supabase Realtime room to share messages, navigation, palettes, fabrics, and catalogue selections.
4. The designer sends the collection into Costing Studio through a versioned same-origin handoff.
5. Costing Studio imports the product name and fabrics without inventing prices. The maker adds real supplier prices, quantities, wastage, time, overheads, and salary.
6. Costudio calculates COGS, break-even targets, wholesale/direct/boutique pricing, and saves the product alongside clients, measurements, inventory, and orders.

The key product idea is that AI creativity should not stop at an attractive image. Costudio carries creative intent into the operational decisions that determine whether a fashion business is sustainable.

## How GPT-5.6 is used

The Supabase Edge Function calls `gpt-5.6-terra` through the Responses API for:

- professional designer biographies;
- press-ready collection titles and descriptions;
- product-listing improvements;
- inspiration development;
- social media packs; and
- fashion image prompt generation from collection context and references.

Terra was selected because these were previously latency- and cost-sensitive mini-model tasks. The migration preserves that role and explicitly uses `reasoning.effort: none` as the baseline. `gpt-image-1` remains responsible for image generation.

## How Codex was used

Codex helped turn two working but disconnected applications into one submission-ready platform. It:

- audited the PHP costing app and React design app;
- identified the deployment and product-story gaps;
- consolidated the latest costing code into the platform;
- designed and implemented the versioned Design-to-Costing handoff;
- unified branding and navigation;
- replaced production WebSocket dependence with Supabase Realtime;
- migrated text generation from `gpt-4o-mini` Chat Completions to GPT-5.6 Terra on the Responses API;
- created the Supabase Edge Function and secure configuration boundaries;
- removed copied production credentials from the submission tree;
- ran production builds, lint checks, PHP syntax checks, and inline JavaScript compilation; and
- prepared deployment, README, and demo guidance.

Important architectural decisions—retaining the mature PHP costing backend, selecting Supabase instead of rewriting the whole system for Vercel, and mapping the former mini workload to Terra—were reviewed in the Codex session rather than applied as blind rewrites.

## Three-minute demo script

### 0:00–0:20 — Problem and promise

“Independent fashion designers create in one tool and cost in another. That disconnect leads to repeated data entry, forgotten labour and overhead, and underpriced products. Costudio connects creative development to commercial reality.”

Show the landing page and its Design/Costing choices.

### 0:20–0:55 — Collaborative Design Studio

Open an existing sample collection. Show its profile, collection brief, palette, and fabrics. Briefly open the Collaboration card and show the same room in a second window receiving a message or palette.

Say: “Supabase Realtime lets a small team share creative decisions. GPT-5.6 Terra, called securely through a Supabase Edge Function and the Responses API, develops the collection copy, campaign content, and visual prompts.”

### 0:55–1:20 — GPT-5.6 result

Generate or show a saved collection description or prompt set. Keep loading/typing out of the recording.

Say: “The model receives the designer’s actual collection context and is instructed to preserve intent and avoid invented details.”

### 1:20–1:45 — The connected workflow

Select **Continue to Costing Studio**. Show the imported-success notice, product name, and fabric rows.

Say: “This is the bridge most creative tools miss. Costudio transfers creative facts, but deliberately leaves prices and quantities blank for the maker’s real data.”

### 1:45–2:20 — Costing and business value

Show prepared material prices, production time, hourly rate, COGS, recommended prices, and break-even calculation. Save the product and show it on the dashboard.

Say: “Costudio includes salary, overheads, material wastage, and production time, so pricing reflects a sustainable business rather than guesswork.”

### 2:20–2:45 — Codex implementation

Show the repository structure, README, or architecture table.

Say: “Codex helped consolidate the newest PHP costing system and React studio, implement the handoff, migrate collaboration to Supabase Realtime, move AI calls to GPT-5.6 on the Responses API, secure credentials, and validate the production builds.”

### 2:45–2:58 — Close

“Costudio helps independent fashion teams move from inspiration to a product they can confidently produce, price, and sell.”

## Suggested sample collection

- Designer: Amina Bello
- Collection: Lagos After Rain — 2027
- Category: Clothing / Apparel
- Inspiration: reflective streets, tropical dusk, and the geometry of city movement
- Palette: deep teal, wet asphalt, hibiscus coral, warm gold
- Fabrics: Cotton Twill, Lightweight Linen, Recycled Satin
- Product to cost: Lagos After Rain — Structured Wrap Dress
- Fabric price: use realistic local supplier prices
- Quantity: 2.5 metres
- Wastage: 10%
- Production time: design 1h, pattern 2h, cutting 1h, sewing 4h, finishing/QC 1.5h

## Final submission checklist

- [ ] Project is deployed and the judge URL works in a private browser window.
- [ ] Supabase status reports `hasKey: true` and `gpt-5.6-terra`.
- [ ] Design collaboration works in two browser windows.
- [ ] Design-to-Costing handoff works on the deployed origin.
- [ ] Public YouTube video is under three minutes.
- [ ] Voiceover explicitly explains Codex and GPT-5.6 usage.
- [ ] Repository contains README, deployment instructions, and no secrets.
- [ ] Public repository has an appropriate license, or private repository is shared with `testing@devpost.com` and `build-week-event@openai.com`.
- [ ] `/feedback` Codex Session ID is added to the Devpost form.
- [ ] Category is **Work & Productivity**.
- [ ] Submission is submitted, not left as a draft.
