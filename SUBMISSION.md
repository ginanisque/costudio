# Costudio — OpenAI Build Week submission

## Category

**Work & Productivity**

## Tagline

**From sketch to customer.** One collaborative operating workspace for independent fashion teams.

## Live project

- **Application:** https://costudio-bice.vercel.app/
- **Repository:** https://github.com/ginanisque/costudio
- **Demo email:** `demo@ginani.net`
- **Demo password:** `costudio-demo2026`

The demo account is persistent so judges can save work and see the same information across every Costudio module.

## Short description

Costudio connects the work fashion teams normally split across sketchbooks, AI tools, spreadsheets, costing calculators, client records, task boards, and production messages. Designers can create collections using their own fabrics, colours, model references, and sketches; save the results to a Portfolio; calculate viable prices; manage clients, measurements, payments, and orders; assign production stages; and securely hand patterns and technical files to collaborators or manufacturers. GPT-5.6 provides the creative intelligence, while one shared Workspace carries the work from sketch to customer.

## Project description

Independent designers often produce excellent creative work but lose time, context, and margin because design decisions and business decisions live in separate systems. Fabrics are copied manually into spreadsheets, labour and overheads are underestimated, measurements are kept in notebooks, deadlines disappear into messages, and overseas producers receive incomplete files.

Costudio turns that fragmented process into one connected, persistent workflow:

1. The business signs in once and enters a shared Workspace with common branding, currency, contact details, collaborators, messages, and tasks.
2. A designer creates a reusable profile and collection brief, then adds colour palettes, fabric swatches, selected models, sketches, and style references.
3. GPT-5.6 develops collection writing, product copy, inspiration, social content, and detailed multimodal prompts. Image generation turns that direction into collection concepts.
4. Generated looks are saved into a persistent Portfolio, where collections can be reopened, selected, exported, and presented as clean catalogues without internal IDs or model-reference names.
5. A collection or individual client design moves into Costing Studio. Costudio preserves creative facts but asks the maker for real supplier prices, quantities, wastage, labour time, salary, and overhead.
6. Costudio calculates COGS, break-even targets, and viable direct, wholesale, and boutique selling prices.
7. The same workspace manages clients, measurements, orders, deposits, balances, delivery dates, and individual designs attached to a customer.
8. Each order can be divided into Design, Patternmaking, Sewing, Finishing, and Other tasks, assigned to team members, and tracked on the shared task board.
9. Production Handoff connects approved designs, patterns, measurements, specifications, and tech sheets to the order, then creates a controlled production pack for a collaborator or external manufacturer.

The central idea is that AI creativity should not end with an attractive image. Costudio carries creative intent through pricing, customer management, teamwork, production, and delivery.

## Key features

### One business workspace

- One Supabase authentication session for Workspace, Design, Costing, Portfolio, Measurements, Clients, Orders, and Production.
- Shared business settings for name, logo, address, email, phone numbers, and default currency.
- Workspace member roles, team messages, shared task board, assignments, due dates, and progress stages.
- A focused sidebar that makes every studio reachable without separate logins or duplicated setup.

### AI-assisted Design Studio

- Persistent designer profiles and saved collections.
- Colour palettes and uploaded fabric swatches.
- Uploaded sketches and previous style concepts to guide generation.
- Model-reference images and multimodal visual prompting.
- GPT-5.6-generated biographies, collection direction, descriptions, inspiration, product copy, and social packs.
- Collection image gallery with selection, downloading, editing, Portfolio storage, and catalogue export.
- Individual client designs attachable to client records and orders.

### Commercial intelligence

- Design-to-Costing handoff without invented prices.
- Material, labour, time, wastage, salary, and overhead calculations.
- COGS, break-even, wholesale, direct-to-consumer, and boutique price guidance.
- Clients, measurement histories, orders, payment status, deposits, notes, and due dates.

### Production coordination

- Assignable Design, Patternmaking, Sewing, Finishing, and custom order tasks.
- Order deadlines surfaced on the shared Workspace task board.
- Reusable pattern files plus order-specific specifications and tech sheets.
- Private Supabase Storage with expiring signed links for production packs.
- A practical handoff for remote collaborators or manufacturers, including production outside the designer's country.

## How GPT-5.6 is used

The Costudio Supabase Edge Function calls `gpt-5.6-terra` through the OpenAI Responses API for:

- professional designer profiles;
- collection titles, descriptions, and creative direction;
- product descriptions;
- inspiration development;
- social campaign packs; and
- detailed fashion image prompts grounded in collection data and uploaded references.

The prompt workflow can include fabric images, the collection palette, designer sketches or style concepts, and selected model-reference images. The resulting visual prompt is then passed to `gpt-image-2`. When references are available, Costudio uses the image-edit path; otherwise it uses image generation.

Terra was selected to balance intelligence, responsiveness, and cost for interactive creative work. The application uses `reasoning.effort: "none"` as its low-latency baseline and explicit verbosity controls. The model can be changed through the server-side `OPENAI_TEXT_MODEL` secret.

The OpenAI key is stored only in Supabase Edge Function Secrets. It is never exposed in the Vite application, browser storage, or repository.

## How Codex was used

Codex was the engineering collaborator used to turn separate Design and Costing applications into the unified Costudio prototype. It supported product reasoning, codebase analysis, implementation, debugging, validation, and deployment preparation.

Codex helped to:

- audit both applications and preserve the mature garment-costing logic;
- design the shared Workspace and single-authentication architecture;
- implement Supabase schemas, migrations, persistence, Realtime features, and row-level security;
- build the secure Supabase Edge Function and migrate text generation to GPT-5.6 and the Responses API;
- connect Design to Costing while preventing AI-generated commercial figures;
- make designer profiles, collections, generated images, and Portfolio records persistent;
- connect clients, measurements, individual designs, orders, payments, deadlines, and production tasks;
- add team assignments and progress tracking across Design, Patternmaking, Sewing, Finishing, and custom work;
- build Production Handoff using private files and expiring signed links;
- fix live authentication, schema-cache, saving, export, navigation, scrolling, and responsive-layout problems;
- remove internal image IDs and model-reference names from customer-facing catalogue output;
- validate production builds and deploy the application through GitHub and Vercel; and
- prepare the README, deployment documentation, submission narrative, and video demonstration.

Codex was used as a transparent development collaborator, not as a claimed runtime feature.

## Architecture

| Layer | Technology | Role |
|---|---|---|
| Landing and authentication | HTML, CSS, JavaScript | Public introduction and one account entry point |
| Shared Workspace | HTML, CSS, JavaScript | Overview, tasks, messages, business settings, Portfolio, and Production |
| Design Studio | React, TypeScript, Vite | Profiles, collections, references, AI generation, gallery, and exports |
| Costing and CRM | HTML, CSS, JavaScript | Garment costing, clients, measurements, orders, and assignments |
| Platform backend | Supabase Auth, Postgres, RLS, Realtime | Shared identity, persistence, permissions, and collaboration |
| File layer | Supabase Storage | Brand assets, collection images, patterns, tech sheets, and production packs |
| AI layer | Supabase Edge Function | Secure GPT-5.6 and image-generation requests |
| Deployment | GitHub and Vercel | Source control and live static application |

## Three-minute demo script

### Prepare before recording

- Sign in before recording with the persistent demo account.
- Save one complete designer profile and generated collection.
- Confirm the collection appears in Portfolio and opens correctly.
- Prepare one finished costing with realistic materials, labour, overhead, and pricing.
- Prepare one client order with measurements, a due date, payment status, and assigned production tasks.
- Upload a small pattern or PDF tech sheet to its production pack.
- Close unrelated tabs and notifications. Use 80–90% browser zoom if necessary, but keep text legible.
- Do not wait for image generation on camera. Show a saved result and explain how it was created.

### 0:00–0:18 — The problem and promise

**On screen:** Open the Costudio landing page, then enter the Workspace.

**Say:**

“Independent fashion businesses often design in one tool, calculate costs in a spreadsheet, keep measurements in a notebook, and send production files through scattered messages. Costudio connects that entire journey—from sketch to customer—in one creative workspace.”

### 0:18–0:40 — One workspace and one source of truth

**On screen:** Show the Workspace sidebar, task board, business identity, and members. Do not open every menu.

**Say:**

“The team signs in once and shares one business workspace. Business details, currency, branding, orders, deadlines, tasks, and collaborators are available across every studio. It gives a small fashion team one operational view without forcing them into disconnected tools or enterprise software.”

### 0:40–1:12 — AI-assisted design with the designer's context

**On screen:** Open Design. Show the saved designer profile and collection, then the palette, fabric swatches, sketches, selected models, and strongest generated images.

**Say:**

“In Design Studio, the designer creates a reusable profile, selects colours and fabrics, and uploads sketches, style concepts, and model references. GPT-5.6 develops the writing and detailed visual direction through a secure Supabase function. Image generation then produces collection concepts from that context. The work is saved and reusable—not a disposable chat response.”

### 1:12–1:27 — Portfolio and presentation

**On screen:** Open Portfolio, select the saved collection, and briefly show the clean catalogue or PDF preview.

**Say:**

“Saved collections live in Portfolio, where the designer can reopen the work, select images, and create a customer-facing catalogue without exposing internal IDs or reference-model names.”

### 1:27–1:52 — From creative decision to viable price

**On screen:** Open a prepared Costing product. Show materials, wastage, production time, COGS, and selling prices.

**Say:**

“Costudio carries the design into costing. It preserves the creative facts but asks the maker for real supplier prices, consumption, wastage, labour time, salary, and overhead. It then calculates COGS, break-even information, and viable direct, wholesale, and boutique prices instead of pricing by guesswork.”

### 1:52–2:17 — Customer and production workflow

**On screen:** Open a client, show measurements and the prepared order, then its due date, payment status, and assigned stages. Return briefly to the Workspace task board.

**Say:**

“The work remains connected to the customer. Each client can have measurements, an individual design, orders, deposits, and delivery notes. An order becomes assignable design, patternmaking, sewing, finishing, and custom tasks. Its deadline appears in the shared Workspace, making progress and responsibility visible.”

### 2:17–2:40 — Production Handoff

**On screen:** Open Production. Show an order attachment, pattern or tech-sheet file, and the Share Production Pack dialog. Do not expose a real private URL.

**Say:**

“Production Handoff closes the final gap. The studio can attach approved designs, measurements, patterns, specifications, and tech sheets to the order and send one secure, expiring production pack to a collaborator or an external manufacturer—even in another country.”

### 2:40–2:53 — Why Codex matters

**On screen:** Return to Workspace or briefly show the repository README.

**Say:**

“Codex helped transform separate applications into this deployable product: one authentication system, shared Supabase data, secure GPT-5.6 calls, persistent portfolios, costing handoffs, CRM, task assignments, and production sharing, all validated and deployed on Vercel.”

### 2:53–3:00 — Close

**On screen:** Finish on the Workspace with “From sketch to customer” visible.

**Say:**

“Costudio helps independent fashion teams create confidently, price sustainably, produce clearly, and deliver professionally—from sketch to customer.”

### If something fails while recording

- If generation is slow, show the saved collection and say, “Here is the result generated from the saved collection context.”
- If a page reloads, continue speaking while it loads; do not apologize on camera.
- If browser folder permissions appear, choose the prepared demo folder and continue.
- If native sharing is unpredictable, stop at the populated Share Production Pack dialog and explain the expiring link.
- Record in short sections if necessary and join them afterward.

## Suggested demo data

- Designer: Eunice Grace
- Business: Ginani Apparel
- Collection: Imare — 2027
- Category: Luxury clothing / apparel
- Palette: emerald, black, warm stone, and soft neutral
- References: uploaded Ginani sketches, fabric swatches, and selected models
- Product to cost: Imare Structured Evening Dress
- Fabric quantity: 2.5 metres
- Wastage: 10%
- Production time: design 1h, patternmaking 2h, cutting 1h, sewing 4h, finishing/QC 1.5h
- Client order: include measurements, deposit, delivery deadline, assigned team member, and production pack

## Final submission checklist

- [ ] Live project opens correctly in a private browser window.
- [ ] Demo credentials work and are included in the judging instructions.
- [ ] Saved designer profile, collection, gallery, and Portfolio are visible.
- [ ] GPT-5.6 status is available and the OpenAI key remains server-side.
- [ ] Design-to-Costing handoff works on the deployed site.
- [ ] Prepared costing shows realistic COGS and selling prices.
- [ ] Client order includes measurements, due date, payment state, and assigned production tasks.
- [ ] Workspace task board shows the prepared order workflow.
- [ ] Production contains an order-attached file and Share Production Pack opens.
- [ ] Public demo video is no longer than three minutes.
- [ ] Voiceover explicitly explains both GPT-5.6 and Codex usage.
- [ ] Repository README prominently explains GPT-5.6 and Codex usage.
- [ ] Repository contains deployment instructions and no private secrets.
- [ ] Repository has an appropriate licence, or required judges have private access.
- [ ] Codex Session ID from `/feedback` is added to the Devpost form.
- [ ] Category is **Work & Productivity**.
- [ ] Submission is submitted rather than left as a draft.
