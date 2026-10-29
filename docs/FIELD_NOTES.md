# Deployment field notes

These are observed incidents, not a list of hypothetical failures. Evidence consists of candidate-supplied screenshots, actual tool responses and database queries reviewed during the build. The assistant did not independently operate the candidate's accounts.

## 1. Agent claimed a save that PostgreSQL did not contain (29 October)

**What happened:** For DEMO-VIDEO-PG003 / TN-DEMO-105, the simulator claimed that a pending request was saved and supplied order ID TN-d8b1d4ed-8dd9-4a4f-bd1f-1fa8a6bb7d17. Queries by customer/item and by the quoted ID returned no rows. A separate Supabase SQL query showed only the two earlier orders.

**How I investigated:** I compared the conversation with DBeaver and Supabase SQL results. When asked to check again, the agent initially admitted: “I haven't run a fresh check for this message.” I enabled Wrangler tail and explicitly requested get_pending_order. A GET /orders for the correct pair appeared in the log; the agent then reported no matching order and retracted the earlier confirmation. The original creation attempt was not captured in the live tail, so its exact tool-use or platform failure cannot be established.

**Fix/workaround and observed result:** I required a successful create response followed by a matching get_pending_order result before saying saved. Retrying the same original pair produced POST /orders and GET /orders logs and a real PostgreSQL record: TN-e4500274-f7d9-458f-a591-09aa232fab97, NGN 13,200, pending/unverified. Later PG005 also had a matching database row and POST/GET logs. This demonstrates recovery and subsequent successful runs, not that prompting eliminates false confirmations.

**Product improvement:** Show each customer turn's actual tool calls, sanitized arguments, HTTP status, response, request ID and skill version together. Offer a write-confirmation gate requiring a successful tool result before a saved-state claim. This incident establishes an unsupported confirmation, not which Chord subsystem caused it.

## 2. Manual POST worked while the agent's request failed (27 October, earlier D1 backend)

**What happened:** Agent create attempts returned HTTP 400 with INVALID_BODY and UNEXPECTED_FIELD. Reconciliation returned found:false and a remote database query found no order.

**How I investigated:** I inspected the required four-field body schema and tested it manually in Chord. customer_ref, item_id, expected_price_minor=850000 and customer_confirmed=true returned 201 Created. Our initial skill signature documented only two of those arguments. The exact failed HTTP body was not captured, so I cannot prove which field caused each error.

**Fix/workaround and observed result:** I aligned the skill with all four fields, exact JSON types and integer kobo units, retaining strict backend validation. Subsequent agent and simulator writes matched external D1 records. The final integration uses PostgreSQL; this earlier evidence is not being presented as a PostgreSQL test.

**Product improvement:** Provide a schema-generated request example and display sanitized actual request keys/types next to validation errors. My implementation improvement is to keep the skill, OpenAPI contract and backend requirements aligned.

## 3. Simulator failed to deliver a product answer despite API requests (29 October)

**What happened:** During a recording attempt for DEMO-VIDEO-PG008, the simulator displayed “The agent didn't answer. Try sending again.” The main Chord conversation showed “I'll try that again” and “Retrying the lookup,” without a product answer.

**How I investigated:** Live Wrangler logs showed GET /products/TN-DEMO-105 at 16:33:54, 16:36:42, 16:37:13 and 16:37:44 Lagos time. Each event said Ok. That proves the requests reached the Worker and completed without an uncaught runtime exception; it does not establish the HTTP business response. Chord's Activity panel showed usage and setup events rather than the requested per-call payload. We did not obtain the failed turn's response body or a definitive cause.

**Fix/workaround and limitation:** Paused repeated retries and attempted to locate per-turn diagnostics. The candidate later reported completing a recording, but no specific corrective action or root cause was established. The original no-answer incident remains unresolved; later completion is not evidence of a particular fix.

**Product improvement:** Give simulator failures a copyable run/request ID and a direct link to sanitized tool and model errors. Distinguish tool HTTP failure, model timeout and channel delivery failure, and make per-turn diagnostics discoverable from the conversation.

## Remaining usability limitation

The agent repeatedly asked for a second yes after the customer had already confirmed a quoted unpaid request. I first appended a rule, then rewrote conversation steps 6–8 and checked that v8 displayed SKILL (1).md as Instructions. The extra question persisted in observed tests. A redundant confirmation instruction was a plausible contributor, but published-version/session behavior and model adherence were not isolated. The working two-confirmation flow was retained for the demo; no one-confirmation fix is claimed. A channel preview and visible per-turn skill version would help diagnose this.

## Supporting configuration notes

The PostgreSQL migration initially returned NOT_CONFIGURED / “Invalid database API origin.” After correcting the project URL it returned “Use the server-side Supabase secret API key.” Correcting the server-side key format to sb_secret_ produced a successful product response marked database_backend=supabase_postgresql. No key values were included in the submitted code. DBeaver initially queried the separate localhost learning database; switching the SQL editor to the hosted Thrift Nest connection returned the expected record. Windows PowerShell blocked npx.ps1; npx.cmd allowed deployment without changing execution policy. These are configuration/environment issues, not established Chord defects.
