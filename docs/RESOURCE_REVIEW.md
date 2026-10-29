# Resource and connection review

Reviewed on 29 October 2026. This is a code review plus local tests, not a production memory or load profile.

## Connections

The Worker makes one HTTP request to Supabase's Data API per operation. It does not import a PostgreSQL driver, create a database pool or keep database sockets between requests. Supabase's PostgREST service manages its database connections. DBeaver uses a separate hosted database connection and can be closed without stopping the API. We did not measure the project's pool settings or connection limits; do not assume they support an arbitrary load or increase them blindly.

## Memory and cleanup

No process-wide request list, user cache, background loop or repeating timer was found in the current Worker. Each call reads one product or request; PostgreSQL uses the product primary key and the customer/item unique index.

The review found that the old 2 KiB input limit was checked only after reading the entire body. The revised code counts bytes while reading and cancels at the limit, including chunked requests. It also caps database response bodies at 16 KiB, cancels unused HTTP error bodies and clears the 8-second upstream timer in finally. Tests cover oversized input with no database call, oversized database responses and unused response cancellation. This is a code-review finding, not an observed production memory leak or Chord incident.

The cap bounds retained body data, not total isolate memory or all concurrent requests. It does not constitute a sustained memory-profile test. Slow inbound request timing and rate limiting remain production work.

## Transactions and uncertain writes

A transaction-level advisory lock serializes creates for the same customer/item. The unique constraint is the final duplicate guard. A row share lock holds the checked product stable until the transaction completes. Locks end with the transaction; no session-level lock is used. We did not verify the hosted statement/lock timeout settings. Aborting an HTTP request does not prove PostgreSQL cancelled or rolled back a write, so reconcile by the original customer/item before retrying. No automatic write retry is added to the Worker.

## Deployment and final check

Deployed on 29 October 2026, Worker version f0c53f51-aee5-4e14-8cb5-bcb511423818. The screenshot showed the updated limitedText and clearTimeout source and a successful deployment from that folder.

A new simulator request for DEMO-FINAL-010 / TN-DEMO-105 produced a PostgreSQL row at NGN 13,200, pending. The agent initially gave an uncertain explanation about an empty check and intended retry. A subsequent retrieval reply returned the matching order details. No failed API response or retry was captured for that exchange, so the agent's account does not establish the cause. Payment was described as unverified; the SQL screenshot's payment column was outside the visible area.

This confirms deployment and a saved request after the code change, not a hosted memory, load or pool-saturation test. No further database migration or credential change was required. For future code-only deployment from this project folder:

```powershell
npx.cmd wrangler@4 deploy --config wrangler.supabase.toml
```

Before real customers use this service, add monitoring for Worker memory errors and latency, database connections and blocked transactions, plus service rate limits and human escalation. Hosted stress/concurrency tests and lost-response injection remain untested.

References consulted: https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ ; https://supabase.com/docs/guides/api ; https://supabase.com/docs/guides/database/connection-management
