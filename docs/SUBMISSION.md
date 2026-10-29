# Role preference: Analytics Engineering

Thrift Nest is an online thrift clothing business owned by a friend of mine, selling through Instagram and WhatsApp. Its owner reports repeated product questions and purchase requests scattered across chat histories; this Chord agent retrieves catalogue details and records one confirmed, unpaid pending request in PostgreSQL. A reliable shared record could reduce repeated administrative work and missed follow-ups, which the owner identified as reasons to consider paying, although savings and willingness to pay have not been quantified. I deliberately excluded payments, stock reservation, Instagram synchronisation, delivery automation and outbound reminders.

## Working agent

**Thrift Nest Order Assistant**, built on Chord with the custom **Thrift Nest Order Handling** skill. Latest inspected published version: v8, SKILL (1).md marked Instructions. The repository uses SKILL.md as its canonical filename.

Simulator: https://chat.tsglabs.dev/c/TjEWRNfXvhPO0UxU3kzbeZLI

The teammate and integration are intended to remain available for simulator review. All operational data is fictional.

## Code

Repository: https://github.com/Fuddie/thrift-nest-chord

Includes the skill, custom Worker API, PostgreSQL schema and operations, fictional catalogue fixtures, tests, OpenAPI contract and setup instructions. README includes the AI-use disclosure.

## Screen recording

https://www.loom.com/share/fb9b9580a6564d639bbef2b03889834c



## Deployment field notes

See FIELD_NOTES.md for three specific incidents: an unsupported saved-order confirmation, malformed agent POST requests, and simulator replies failing despite API requests. Each includes evidence, diagnosis limits, attempted fixes, resolution or remaining limitation, and product feedback. The extra confirmation is documented separately as a remaining usability limitation.

## Go-live note

The assistant answers item-code enquiries using the connected catalogue and records a confirmed, unpaid purchase request. Repeated enquiries can retrieve the existing request. A pending request does not reserve an item: only payment secures it. The current demonstration uses fictional products and customer references and has been checked against hosted PostgreSQL records.

It does not accept or verify payments, update Instagram, arrange dispatch, send reminders or alert staff automatically. Delivery, returns and missing measurements still need an owner response. The agent has produced an unsupported save confirmation during testing; subsequent checks helped recover, but reliability needs further testing. It also sometimes asks for an extra confirmation.

Before real customers use it, agree who maintains prices and availability, connect an approved WhatsApp business number, replace fictional references with authenticated customer identity, and define access controls and data retention. Payment integration would require securely stored live provider credentials, verified payment events, and rules for failed or delayed payments, competing buyers and refunds. An unverified or failed payment must never secure stock or trigger dispatch.

Nominate an owner or staff member to handle unclear requests and service failures, and implement and test an alert to that person; no automated alert exists today. Run a small supervised pilot and reconcile every saved request. Measure owner handling time and errors before and during the pilot before deciding whether the service saves enough effort to justify its cost.


## Discovery and evidence limits

The owner described the process, its administrative consequences and conditions under which a solution could be worth paying for. A dated critical incident, measured handling-time baseline and quantified willingness to pay were not established. The implementation hypothesis is that product retrieval plus a persistent pending-request record can reduce manual effort. No savings or conversion uplift is claimed. Current process: enquiry -> identify item -> check details/availability -> answer questions -> confirm intent/payment manually -> arrange dispatch. The demo ends at confirmed unpaid intent, before payment and fulfilment.
