# PostgreSQL deployment and connection

I deployed this backend and independently queried saved requests in
Supabase and DBeaver. See ACCEPTANCE.md for exact evidence and untested cases.

## Database

In the dedicated thrift-nest-demo Supabase project SQL Editor, run the complete
api/supabase_01_tables.sql, then api/supabase_02_operations.sql in a new query.
The latter should return a successful product JSON for TN-DEMO-001 and zero
orders on a fresh project. Then run api/supabase_03_checks.sql. It tests as
service_role and rolls back its test writes; a raised exception is a failed test.
These SQL scripts were run by me in Supabase; the checks completion
message was observed. They were not executed in the assistant runtime.

The custom thrift_demo schema is private to the backend role, with RLS enabled.
Only public.tn_demo_operation is reachable through the REST RPC route and its
EXECUTE grant is limited to service_role. It is SECURITY INVOKER with an empty
search_path. It accepts only three named operations, not SQL. A row-level share
lock protects the stock/price check during insertion; a transaction-level
advisory lock serializes retries for the same customer/item, and the unique
constraint provides final duplicate protection. The backend role is granted
UPDATE(item_id) on products because PostgreSQL locking SELECT needs an UPDATE
privilege; this API exposes no stock or product update operation.

This remains a fictional-data demo, not the real screenshot catalogue. No
historical D1 orders are copied. The local DBeaver learning database does not
sync with this hosted database. To independently query the hosted records in
DBeaver, create a second PostgreSQL connection using the Supabase Connect
dialog's connection details; do not keep querying localhost for hosted orders.

## Configure and deploy (after SQL checks pass)

Keep secrets out of Chord, screenshots and Git. Use the Supabase secret API key
starting sb_secret_, not a publishable key, legacy JWT or database password.
Store it only in the server-side Worker. This project is dedicated to fictional
data; a secret API key has broad project access and is not production customer
authorization.

Open PowerShell in the extracted thrift-nest folder containing
wrangler.supabase.toml and api/worker_supabase.js. Log into the same Cloudflare
account as the working demo. These commands configure the same Worker name;
API_TOKEN already stored remotely should remain unchanged.

```powershell
npx.cmd wrangler@4 login
npx.cmd wrangler@4 secret put SUPABASE_URL --config wrangler.supabase.toml
npx.cmd wrangler@4 secret put SUPABASE_SECRET_KEY --config wrangler.supabase.toml
```

At the first prompt paste the exact Supabase project HTTPS URL shown in the
dashboard (no /rest/v1 suffix). At the second paste the secret API key privately.
Before deployment, smoke-test RPC directly from your own shell with that key
held locally; do not share its value. Then deploy:

```powershell
npx.cmd wrangler@4 deploy --config wrangler.supabase.toml
```

The Worker keeps its existing URL and three Chord operations. This configuration
has no D1 binding and no silent fallback. GET /health reports the chosen backend
but is liveness only, not a database connectivity test. A successful authenticated
product lookup proves the configured RPC path is reachable.

## Reverify

Use a fresh reference DEMO-PG001 in the simulator, lookup TN-DEMO-001, confirm,
and inspect the tool result for database_backend=supabase_postgresql. Run this
in Supabase SQL Editor or a DBeaver connection to the SAME hosted project:

```sql
SELECT order_id, customer_ref, item_id, price_minor / 100.0 AS amount_ngn,
       order_status, payment_status
FROM thrift_demo.orders
WHERE customer_ref = 'DEMO-PG001' AND item_id = 'TN-DEMO-001';
```

Match order ID and amount to the conversation. Repeat request, verify one row,
test sold refusal and verify no order for the sold fixture. Check availability
before/after in thrift_demo.products. Record PostgreSQL observations separately
in ACCEPTANCE.md and update README/submission only when migration is verified.

## Local validation

node --test tests/supabase-worker.test.js: 8 checks passed on 28 October 2026.
These mock the RPC responses, so they validate HTTP forwarding, auth, response
validation and unknown-outcome handling only. They do not prove SQL execution,
Supabase role permissions, hosted concurrency or simulator behavior.

Primary docs:
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/getting-started/api-keys
