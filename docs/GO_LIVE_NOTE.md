# Go-live note for Thrift Nest

The assistant answers item-code enquiries using the connected catalogue and records a confirmed, unpaid purchase request. Repeated enquiries can retrieve the existing request. A pending request does not reserve an item: only payment secures it. The current demonstration uses fictional products and customer references and has been checked against hosted PostgreSQL records.

It does not accept or verify payments, update Instagram, arrange dispatch, send reminders or alert staff automatically. Delivery, returns and missing measurements still need an owner response. The agent has produced an unsupported save confirmation during testing; subsequent checks helped recover, but reliability needs further testing. It also sometimes asks for an extra confirmation.

Before real customers use it, agree who maintains prices and availability, connect an approved WhatsApp business number, replace fictional references with authenticated customer identity, and define access controls and data retention. Payment integration would require securely stored live provider credentials, verified payment events, and rules for failed or delayed payments, competing buyers and refunds. An unverified or failed payment must never secure stock or trigger dispatch.

Nominate an owner or staff member to handle unclear requests and service failures, and implement and test an alert to that person; no automated alert exists today. Run a small supervised pilot and reconcile every saved request. Measure owner handling time and errors before and during the pilot before deciding whether the service saves enough effort to justify its cost.
