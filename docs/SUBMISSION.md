# Analytics Engineering

## 1 Role preference and problem statement

Thrift Nest is an online thrift clothing business owned by a friend of mine and sells through Instagram and WhatsApp. The owner spends time repeating product details and tracking purchase requests across chats; my Chord agent answers item enquiries and saves a confirmed, unpaid request in PostgreSQL. The owner would consider paying if it saved time and reduced missed sales or order errors, but I have not measured those benefits yet. I left out payments, stock reservation, Instagram updates, dispatch and reminders.

## 2 Working agent

Thrift Nest Order Assistant runs on Chord with my Thrift Nest Order Handling skill. The latest inspected version was v8. All operational data is fictional.

Simulator: https://chat.tsglabs.dev/c/TjEWRNfXvhPO0UxU3kzbeZLI

## 3 Code

GitHub: https://github.com/Fuddie/thrift-nest-chord

The repo includes the skill, API code, PostgreSQL scripts, fictional fixtures, tests and README. Chord calls the Cloudflare API to read products, save a pending request and retrieve it. I checked saved records separately in Supabase and DBeaver.

AI use: ChatGPT/Codex helped with the skill, code, tests, troubleshooting and writing. I configured and deployed the service, connected Chord, ran the conversations and database checks, and recorded the demo.

## 4 Recording

https://www.loom.com/share/fb9b9580a6564d639bbef2b03889834c

## 5 Deployment field notes

## A saved request was missing from PostgreSQL

**What happened:** On 29 October, the agent said DEMO-VIDEO-PG003 / TN-DEMO-105 was saved and quoted TN-d8b1d4ed-8dd9-4a4f-bd1f-1fa8a6bb7d17. Queries by ID and customer/item found no row. A separate Supabase query agreed.

**How I investigated:** The agent initially admitted it had not checked again. I enabled Wrangler logs and requested a fresh lookup. A GET /orders appeared and the agent reported no record. I did not capture the original write attempt, so I cannot identify its exact failure.

**What I changed:** I required a successful create response followed by a matching lookup. Retrying the same pair produced POST and GET logs and a real row, TN-e4500274-f7d9-458f-a591-09aa232fab97, at NGN 13,200, pending/unverified. Later PG005 also matched SQL. Recovery worked; I do not claim the instruction change prevents every false confirmation.

**What Chord could improve:** Link every saved-order claim to the actual tool result. Show the request ID, sanitized arguments, response, HTTP status and skill version in one place.

## Manual requests worked but agent requests failed

**What happened:** On 27 October, with the earlier D1 backend, agent requests returned HTTP 400, INVALID_BODY and UNEXPECTED_FIELD. Lookup and SQL showed no order.

**How I investigated:** A manual Chord request with all four required fields returned 201 Created. My first skill signature listed only two fields. The failed request body was not captured, so the exact malformed field remains unknown.

**What I changed:** I documented all four fields, correct JSON types and prices in kobo, keeping strict backend validation. Later agent writes matched external records. These were D1 checks, before the PostgreSQL migration.

**What Chord could improve:** Generate an example from the tool schema and show sanitized submitted fields beside validation errors. I also need to keep the skill and API contract aligned.

## The simulator stopped before answering

**What happened:** On 29 October, PG008 displayed “The agent didn't answer. Try sending again.” Chord showed retry messages without the product answer.

**How I investigated:** Wrangler recorded four product GETs between 16:33 and 16:37 Lagos time. Each said Ok, which does not prove the HTTP response was successful. The Activity panel showed usage/setup events, and I did not obtain the failed response body.

**Workaround and limitation:** I stopped repeated retries and looked for more detailed logs. I later completed the recording, but no specific fix or root cause was established. This remains unresolved.

**What Chord could improve:** Put a run ID and diagnostic link on simulator errors, distinguishing API errors, model timeouts and delivery failures.

## Other limits

The agent still sometimes asks for a second yes. Rewriting the confirmation steps and checking published v8 did not establish a fix, so I kept the working two-confirmation flow. The owner described the wider problem, but I did not establish a dated incident, handling-time baseline or measured sales impact.


## 6 Go live note for Thrift Nest

The assistant answers questions about an item and saves an unpaid purchase request after confirmation. It can find the existing request when a customer asks again. Only payment secures an item; this request does not reserve stock. The demo uses fictional products and customer references.

It cannot take or verify payments, arrange delivery, update Instagram or alert staff. The extra confirmation prompt and an earlier false save confirmation need further reliability testing before customer use.

Before launch, someone must maintain prices and stock, connect an approved WhatsApp business number, and set up customer identity and staff permissions. Payment support needs secure live credentials, verified payment events and rules for failed payments, competing buyers and refunds. No verified payment means no reservation or dispatch.

Choose a staff contact for questions and failures, then build and test alerts to that person. Start with a supervised pilot, check saved requests against the database, and compare handling time and errors before deciding whether it is worth paying for.


## Checks and remaining work

The local suite passes 20 tests: nine for the earlier SQLite service and eleven for the PostgreSQL Worker using simulated HTTP responses. Hosted SQL checks and specific simulator runs are recorded in docs/ACCEPTANCE.md. These tests do not establish production reliability or measured business impact.

A final code review added limits while reading request and response bodies and cleanup of unused responses and timers. This update is tested locally but still needs deployment and a fresh simulator check. See docs/RESOURCE_REVIEW.md. No long-running memory profile, hosted load test or connection-pool saturation test was run.
