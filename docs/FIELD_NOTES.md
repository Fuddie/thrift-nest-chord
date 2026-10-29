# Deployment field notes

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

After the final code deployment, DEMO-FINAL-010 was present in PostgreSQL at NGN 13,200, pending. The agent first described an empty check and an intended retry, then later returned the saved request details. I did not capture evidence of that claimed empty API response or retry. This is another reason to verify the database rather than rely on the agent's explanation.
