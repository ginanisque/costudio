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

### Prepare before recording

- Sign in with the demo account and keep the password out of the recording.
- Save one complete designer profile and one generated collection.
- Keep one finished costing with realistic materials, labour, overhead, and pricing ready.
- Keep one client order with a due date and production tasks ready.
- Upload a small pattern or PDF tech sheet to its production pack.
- Close unrelated tabs and notifications. Set browser zoom so the full interface is legible.
- Do not wait for AI generation on camera. Show the saved result, then explain how it was produced.

### 0:00–0:18 — The problem and promise

**On screen:** Open the Costudio landing page, then enter the shared Workspace.

**Say:**

“Independent fashion businesses often design in one tool, calculate costs in a spreadsheet, keep measurements in a notebook, and send production files through scattered messages. Costudio connects that entire journey—from sketch to customer—in one creative workspace.”

### 0:18–0:42 — One workspace and one source of truth

**On screen:** Briefly show the Workspace sidebar, task board, team members, and shared business identity. Do not open every menu.

**Say:**

“The team signs in once and shares one business workspace. Business details, currency, branding, orders, deadlines, tasks, and collaborators are available across every studio. The workspace gives a small fashion team a clear operational view without forcing them into enterprise software.”

### 0:42–1:15 — AI-assisted design with real creative context

**On screen:** Open Design. Show the saved designer profile and collection, then move quickly through the selected palette, fabric swatches, reference sketches, and generated gallery. Pause on the best generated collection images.

**Say:**

“In Design Studio, the designer builds a reusable profile, selects colours and fabrics, uploads sketches or style references, and describes the collection. GPT-5.6 develops the writing and production-aware visual direction through a secure Supabase Edge Function, while image generation turns that context into collection concepts. The result is saved and reusable—not a disposable chat response.”

### 1:15–1:38 — From creative decision to viable price

**On screen:** Open Costing from Design or use a prepared imported product. Show materials, wastage, production stages, hourly rate, COGS, and recommended selling prices.

**Say:**

“Costudio then carries the product into costing. It preserves the creative facts but asks the maker for real supplier prices, consumption, wastage, labour time, salary, and overhead. That produces COGS, break-even information, and viable direct, wholesale, and boutique prices instead of pricing by guesswork.”

### 1:38–2:05 — Client, order, measurement, and workflow tracking

**On screen:** Open Clients, select a prepared customer, show measurements, then open the order with its due date, payment status, and assigned production stages. Return briefly to the Workspace task board to show the deadline/task connection.

**Say:**

“The commercial workflow stays connected to the customer. A client can have measurements, an individual design, orders, deposits, and delivery notes. Each order has design, patternmaking, sewing, finishing, and custom tasks that can be assigned to team members. Due dates flow back to the shared task board, so everyone can see progress and responsibility.”

### 2:05–2:32 — Production handoff anywhere in the world

**On screen:** Open Production. Show the connected-folder status, the four-step handoff, an order attachment, selected pattern/tech-sheet files, and the Share Production Pack dialog. Do not expose a real private share URL in the video.

**Say:**

“Production Handoff closes the final gap. The studio can connect a pattern folder, keep reusable master patterns, attach approved designs, measurements, specifications, and tech sheets to an order, and send one secure, expiring production pack to a collaborator or an external manufacturer—even when production is in another country.”

### 2:32–2:48 — Why Codex matters

**On screen:** Return to the Workspace or briefly show the repository README—not raw source code for more than a few seconds.

**Say:**

“Codex helped transform separate design and costing applications into this deployable product: one authentication system, shared Supabase data, secure OpenAI calls, cross-studio handoffs, collaborative tasks, CRM, and production sharing, all validated and deployed on Vercel.”

### 2:48–2:58 — Close

**On screen:** Finish on the Workspace with “From sketch to customer” visible.

**Say:**

“Costudio gives independent fashion teams the connected infrastructure to create confidently, price sustainably, produce clearly, and deliver professionally—from sketch to customer.”

### If something fails while recording

- If generation is slow, show the saved collection and say, “Here is the result generated from the saved collection context.”
- If a page reloads, continue speaking while it loads; do not apologize on camera.
- If folder permissions appear, choose the prepared demo folder and continue.
- If the native share window is unpredictable, stop at the populated Share Production Pack dialog and explain that it creates expiring links.
- Record in sections if necessary, then join them. The final video should feel continuous, but it does not need to be captured in one take.

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
- [ ] Workspace members, assignments, messages, and task updates work with the demo account.
- [ ] Design-to-Costing handoff works on the deployed origin.
- [ ] Production contains at least one order-attached file and the Share Production Pack dialog opens.
- [ ] Public YouTube video is under three minutes.
- [ ] Voiceover explicitly explains Codex and GPT-5.6 usage.
- [ ] Repository contains README, deployment instructions, and no secrets.
- [ ] Public repository has an appropriate license, or private repository is shared with `testing@devpost.com` and `build-week-event@openai.com`.
- [ ] `/feedback` Codex Session ID is added to the Devpost form.
- [ ] Category is **Work & Productivity**.
- [ ] Submission is submitted, not left as a draft.
