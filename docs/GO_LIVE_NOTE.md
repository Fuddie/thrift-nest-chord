# Go live note for Thrift Nest

The assistant answers questions about an item and saves an unpaid purchase request after confirmation. It can find the existing request when a customer asks again. Only payment secures an item; this request does not reserve stock. The demo uses fictional products and customer references.

It cannot take or verify payments, arrange delivery, update Instagram or alert staff. The extra confirmation prompt and an earlier false save confirmation need further reliability testing before customer use.

Before launch, someone must maintain prices and stock, connect an approved WhatsApp business number, and set up customer identity and staff permissions. Payment support needs secure live credentials, verified payment events and rules for failed payments, competing buyers and refunds. No verified payment means no reservation or dispatch.

Choose a staff contact for questions and failures, then build and test alerts to that person. Start with a supervised pilot, check saved requests against the database, and compare handling time and errors before deciding whether it is worth paying for.
