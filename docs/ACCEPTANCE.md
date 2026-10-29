# Acceptance criteria and observed evidence

Defined success: one explicitly confirmed fictional customer/item request produces exactly one persistent pending request with catalogue price and NGN currency, payment unverified and no stock reservation. Verify the external row against the conversation. Agent wording alone is insufficient.

Business hypothesis: lower owner handling time per confirmed request. Pilot metric: owner minutes spent handling a confirmed request, with comparable workflow boundaries before and after. No baseline, timed pilot or sales uplift was measured. This demo demonstrates record creation, retrieval and selected safeguards, not economic impact.

| Check | Expected | Observed / limits |
|---|---|---|
| PostgreSQL lookup | Correct product data through deployed API | Chord lookup returned success, database_backend=supabase_postgresql, TN-DEMO-001 at 850000 kobo. TN-DEMO-105 returned NGN13,200, waist36in. |
| PG001 creation | Same ID and price in chat and external row | Simulator and Supabase query matched TN-e7080004-a993-41e6-bc21-131cfa063ebe, 850000, pending/unverified. |
| PG003 recovery | Reconcile absent record, then create verified row | Original saved claim absent from SQL; subsequent logged POST/GET and SQL matched TN-e4500274-f7d9-458f-a591-09aa232fab97 at 1320000. |
| PG005 creation | Logged write/read and matching external row | Screenshots show POST/GET and TN-910d801a-91df-454d-9dad-2899a428fe49, NGN13,200, pending/unverified. |
| Repeated PG003 | Same ID, count1 | Candidate reported the duplicate SQL check passed. Short duplicate reply also observed; not a captured duplicate POST test. |
| Backend rejection safeguards | Reject sold, changed price, unconfirmed request; keep stock available | Candidate ran supabase_03_checks.sql as service_role; completion message observed. Temporary writes rolled back. This is a database-function check, not proof of model behavior. |
| Sold response in simulator | Short refusal, no order | Earlier D1 flow verified refusal and zero rows. Equivalent final PostgreSQL simulator negative case not independently captured in the reviewed evidence. |
| Stock after current hosted write | Available remains available | Database function checks passed; independent hosted stock before/after comparison for the recording not reviewed. |
| One confirmation | Save after first explicit yes | Failed observed PG004/PG005/PG006 tests; candidate reported it still asked again after later changes. Retained as limitation. |
| No-answer handling | Useful result or clear limitation | PG008 simulator no-answer incident unresolved; Worker received requests. |
| Unknown stock, missing measurements | No fabricated stock/measurements | Legacy API tests cover response shapes; final model behavior untested. |
| Lost response after commit | Reconcile before same-reference retry | Worker mocked failure test passes; hosted timeout injection untested. |
| Concurrent duplicate creation | Exactly one record | Advisory lock + unique constraint implemented; distributed hosted concurrency test untested. |
| Recording | One complete conversation, external write shown, <=3min | Candidate supplied Loom link and reported completion. Assistant could not access video; duration/content not independently reviewed. |

Local Node24 run on 29 October 2026: 17 passed, 0 failed (9 legacy SQLite service tests and 8 mocked PostgreSQL Worker tests). SQL checks were executed by the candidate in Supabase, not in the assistant's local runtime. Sample records establish that specific runs persisted; they do not prove ongoing availability or production reliability.

Use docs/DEMO_QUERIES.sql to reproduce against the hosted project. Use a fresh DEMO reference for creation, then reuse it for duplicate/reconciliation checks. Do not delete past evidence to make a new recording appear to create an old record.
