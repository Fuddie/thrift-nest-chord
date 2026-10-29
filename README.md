# Thrift Nest on Chord

**Role preference: Analytics Engineering**

Thrift Nest is an online thrift clothing business owned by a friend of mine and sells through Instagram and WhatsApp. The owner spends time repeating product details and tracking purchase requests across chats; my Chord agent answers item enquiries and saves a confirmed, unpaid request in PostgreSQL. The owner would consider paying if it saved time and reduced missed sales or order errors, but I have not measured those benefits yet. I left out payments, stock reservation, Instagram updates, dispatch and reminders.

- [Try the simulator](https://chat.tsglabs.dev/c/TjEWRNfXvhPO0UxU3kzbeZLI)
- [Watch the demo](https://www.loom.com/share/fb9b9580a6564d639bbef2b03889834c)
- [Submission and field notes](docs/SUBMISSION.md)

## What it does

Chord runs the conversation and skill. Three custom tools call a Cloudflare Worker to look up an item, save an unpaid pending request and retrieve it. Supabase hosts PostgreSQL, and I use Supabase SQL Editor or DBeaver to verify saved records. The demo does not use real customer data or live payments. Only payment secures an item; a pending request never reserves stock.

The agent sometimes asks for a second confirmation. Testing also exposed a false save confirmation and a simulator reply failure. [Field notes](docs/FIELD_NOTES.md) explain what I checked and what remains unresolved. No time savings or sales uplift has been measured.

## Try it

1. Use a fresh fictional reference such as DEMO-REVIEW001. Ask about TN-DEMO-105. The fixture is NGN 13,200 with a 36-inch waist.
2. Confirm an unpaid pending request. If it asks for another yes, confirm again.
3. Run [DEMO_QUERIES.sql](docs/DEMO_QUERIES.sql) on the same hosted database. Match the actual order ID, item, amount and pending/unverified status.
4. Repeat the request. Expect one record with the same ID. Try sold TN-DEMO-002 and check that no request is created for it.

Check that the reference has no existing records before testing creation. Reuse it for retries. A log saying Ok does not prove a saved record; inspect SQL. The separate local screenshot-analysis database is not connected to the agent.

## Deploy

Use a dedicated Supabase test project, Cloudflare account and Chord exercise account. In Supabase SQL Editor, run these complete files in order:

1. api/supabase_01_tables.sql
2. api/supabase_02_operations.sql
3. api/supabase_03_checks.sql, which rolls back temporary test writes
4. api/supabase_04_catalogue.sql

For your own deployment, choose a unique Worker name in wrangler.supabase.toml. In PowerShell, from this folder:

```powershell
npx.cmd wrangler@4 login
npx.cmd wrangler@4 secret put API_TOKEN --config wrangler.supabase.toml
npx.cmd wrangler@4 secret put SUPABASE_URL --config wrangler.supabase.toml
npx.cmd wrangler@4 secret put SUPABASE_SECRET_KEY --config wrangler.supabase.toml
npx.cmd wrangler@4 deploy --config wrangler.supabase.toml
```

Enter secrets privately. API_TOKEN is a random demo-service bearer token; use it in each Chord connection. SUPABASE_URL is the project's exact HTTPS origin. SUPABASE_SECRET_KEY must start sb_secret_ and stays only in Worker secrets. Do not put it in Chord, Git or screenshots.

Set the deployed origin in api/openapi.json before importing it into Chord. Configure Authorization: Bearer YOUR_API_TOKEN for each tool and publish the skill. Details are in [CHORD_SETUP.md](docs/CHORD_SETUP.md) and [POSTGRES_CONNECTION.md](docs/POSTGRES_CONNECTION.md).

The existing API is https://thrift-nest-demo-api.fuddiebiola.workers.dev . For its code-only update, use the same account/name and run only the deploy command; keep existing remote secrets. **The final resource-handling changes pass local tests but still need deployment and a simulator check.**

## Check the code

Use Node.js >=22.13 with node:sqlite available. The latest local run used Node 24.

```powershell
npm.cmd test
```

All 20 local tests pass: nine SQLite service tests and eleven Worker tests using simulated PostgreSQL HTTP responses. The latter cover authentication, request mapping, error handling, oversized streams and response cleanup. Actual hosted SQL checks and simulator results are listed in [ACCEPTANCE.md](docs/ACCEPTANCE.md). Load, sustained memory use, pool saturation and hosted lost-response tests were not run.

## Data and resource handling

Each product has one item ID. Each pending request is unique by customer/item. Prices are integer kobo with NGN currency, not floating-point amounts. Measurements keep their units; missing values are not zero and unknown stock is not available.

The database locks the customer/item during creation, rechecks price and stock and returns an existing request on retry. The Worker uses HTTP, with no application database pool or growing cache. It limits streamed input/output and clears its upstream timer. Aborted writes remain uncertain until a lookup confirms their outcome. See [RESOURCE_REVIEW.md](docs/RESOURCE_REVIEW.md) for findings, limits and the deployment check.

Current entry point: api/worker_supabase.js with wrangler.supabase.toml. The earlier D1 files are kept for build history and are not used by the PostgreSQL deployment. The skill source is skills/order-assistant/SKILL.md; Chord labels its selected file SKILL (1).md. The owner handover is [GO_LIVE_NOTE.md](docs/GO_LIVE_NOTE.md).

## AI use

ChatGPT/Codex helped with the skill, code, tests, troubleshooting and writing. I configured and deployed the service, connected Chord, ran the conversations and database checks, and recorded the demo. Expected and observed results are documented separately.
