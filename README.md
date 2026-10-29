# Thrift Nest on Chord

**Role preference: Analytics Engineering**

Thrift Nest is an online thrift clothing business owned by a friend of mine, selling through Instagram and WhatsApp. Its owner reports repeated product questions and purchase requests scattered across chat histories; this Chord agent retrieves catalogue details and records one confirmed, unpaid pending request in PostgreSQL. A reliable shared record could reduce repeated administrative work and missed follow-ups, which the owner identified as reasons to consider paying, although savings and willingness to pay have not been quantified. I deliberately excluded payments, stock reservation, Instagram synchronisation, delivery automation and outbound reminders.

## Demo and scope

- Agent: Thrift Nest Order Assistant; latest inspected skill v8 on 29 October 2026.
- Simulator: https://chat.tsglabs.dev/c/TjEWRNfXvhPO0UxU3kzbeZLI
- Recording: https://www.loom.com/share/fb9b9580a6564d639bbef2b03889834c
- API: https://thrift-nest-demo-api.fuddiebiola.workers.dev
- Final backend: Supabase PostgreSQL, queried independently through Supabase SQL Editor and DBeaver.

Chord runs the conversation and skill. Three custom HTTP operations connect through a Cloudflare Worker to a restricted PostgreSQL RPC: product lookup, pending-request creation and pending-request retrieval. This is a hosted mock business system containing fictional operational data, not the owner's production stock or sales. The separate local Instagram screenshot analysis database is not connected or synchronised.

Verified examples and failures are in docs/ACCEPTANCE.md. The candidate reported completing the recording; the assistant could not access the Loom video. Code repository: https://github.com/Fuddie/thrift-nest-chord . The extra confirmation and a simulator no-answer incident remain documented limitations. No production-readiness, time-saving or sales-uplift claim is made.

## Reproduce

1. Open the simulator with exercise access. Use a fresh fictional reference, e.g. DEMO-REVIEW001. Ask for TN-DEMO-105's price and waist measurement. Expected fixture: NGN13,200, waist36 inches.
2. Explicitly confirm an unpaid pending request. The observed flow sometimes asks for a second confirmation; respond once more if requested.
3. Use docs/DEMO_QUERIES.sql against the SAME hosted project to match the saved order ID, customer, item, amount and pending/unverified status. Repeat the request and check that exactly one matching record remains.
4. Try sold TN-DEMO-002. Expected: no new request. Record actual observations instead of assuming the expected outcome passed.

A simulator reference may already exist from a previous recording. Check first and choose a new fictional reference for creation; do not delete evidence. API logs saying Ok are runtime outcomes, not proof of an HTTP success response or a database write.

## Deploy the PostgreSQL API

Prerequisites: a Supabase test project, Cloudflare Worker access and Chord exercise access. On a new Supabase project run these full scripts in order in SQL Editor:

1. api/supabase_01_tables.sql: tables and four base fixtures.
2. api/supabase_02_operations.sql: the three permitted database operations.
3. api/supabase_03_checks.sql: database checks whose temporary writes roll back.
4. api/supabase_04_catalogue.sql: fourteen additional fictional fixtures, including TN-DEMO-105.

Open Windows PowerShell in this project folder. Set a unique Worker name in wrangler.supabase.toml for your own deployment, then:

```powershell
npx.cmd wrangler@4 login
npx.cmd wrangler@4 secret put API_TOKEN --config wrangler.supabase.toml
npx.cmd wrangler@4 secret put SUPABASE_URL --config wrangler.supabase.toml
npx.cmd wrangler@4 secret put SUPABASE_SECRET_KEY --config wrangler.supabase.toml
npx.cmd wrangler@4 deploy --config wrangler.supabase.toml
```

Enter secrets privately at the prompts. API_TOKEN is a random demo-service bearer secret you generate and reuse in the three Chord connections. SUPABASE_URL is your exact project HTTPS origin. SUPABASE_SECRET_KEY must be a server-side sb_secret_ key, stored only in the Worker; never place it in Chord, the skill, this repo or screenshots. A dedicated fictional-data project limits exposure; this broad server key is not customer authorization.

Set your actual deployed origin in api/openapi.json before importing it into Chord. Configure each operation's Authorization header with Bearer and your API_TOKEN. Publish the supplied skill as the included instructions. See docs/CHORD_SETUP.md for the observed setup and docs/POSTGRES_CONNECTION.md for database details. Do not change a working deployment's API_TOKEN unless you also update its Chord connections.

To inspect requests:

```powershell
npx.cmd wrangler@4 tail --config wrangler.supabase.toml
```

GET /health is public liveness only and does not verify database connectivity. A successful authenticated product response marked database_backend=supabase_postgresql establishes that lookup reached the selected backend. Use the SQL record to prove creation.

## Local checks

Node.js >=22.13 with node:sqlite is needed for the legacy tests; the reviewed local run uses Node24. Run:

```powershell
npm.cmd test
```

On 29 October 2026, all 17 local tests passed: nine legacy SQLite service tests and eight PostgreSQL Worker adapter tests.

The PostgreSQL Worker tests mock HTTP RPC responses, checking authentication, configuration, payload mapping, business errors and uncertain/malformed results. The legacy tests execute SQLite SQL for the earlier D1 implementation. Neither suite substitutes for hosted PostgreSQL checks or a Chord conversation. The candidate ran the database-function checks in Supabase; distributed concurrency and hosted lost-response injection were not tested.

## Data model and safeguards

Product grain: one fictional item ID. Order grain: one pending purchase intent per customer/item pair, with a unique constraint. Prices are integer kobo with explicit NGN currency; display naira by dividing by 100. Measurements retain units and basis. Missing measurements are absent, not zero; unknown availability is not available. Source updated_at is not a real-time physical stock guarantee.

The PostgreSQL operation serializes the same customer/item using a transaction advisory lock, checks catalogue price and availability under a row share lock, and stores the catalogue amount. Repeated creates return the existing request. Pending intents do not mutate inventory. An uncertain write requires lookup before retry with the same reference. The skill requires a matching retrieval after a successful create before confirming a save. Prompting is not a guarantee of tool-use correctness; the field notes include a false confirmation discovered by SQL verification.

Production needs authenticated customer identity, owner permissions, maintained inventory, payment reconciliation, operational monitoring and tested human escalation. No alert, payment or dispatch integration exists.

## Files and submission

- docs/SUBMISSION.md: submission text with role, links and owner note.
- docs/FIELD_NOTES.md: observed incidents, evidence and product feedback.
- docs/GO_LIVE_NOTE.md: owner handover, under half a page in normal formatting.
- docs/ACCEPTANCE.md: demonstrated, failed and untested behavior.
- docs/DEMO_QUERIES.sql: independent checks; change the reference consistently.
- skills/order-assistant/SKILL.md: candidate's latest pasted Chord instructions; Chord UI calls its selected file SKILL (1).md.
- api/worker_supabase.js and wrangler.supabase.toml: current backend entry point/configuration.
- api/worker.js, api/schema.sql, wrangler.toml and tests/api.test.js: earlier D1 implementation retained for build history, not used by the final PostgreSQL deployment.

## AI-use disclosure

I used ChatGPT/Codex to help structure discovery, draft the skill, implement and review the API, SQL and tests, inspect screenshots and prepare documentation. I configured the accounts, deployed the service, connected the Chord tools, ran the simulator and database checks, and recorded the demo. Expected behavior and unexecuted tests are separated from observed results.

Documentation used: https://api.chordhq.xyz/docs/ ; https://supabase.com/docs/guides/api ; https://supabase.com/docs/guides/database/dbeaver ; https://developers.cloudflare.com/workers/wrangler/commands/
