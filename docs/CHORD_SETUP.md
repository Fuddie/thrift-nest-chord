# Connect the demo API to Chord

Do not fill in a fictional hostname. Deploy first and use the exact returned Worker URL, represented below as BASE. I used OpenAPI import, then added Authorization to each of the three imported connections. The final deployment uses Supabase PostgreSQL; subsequent writes were checked with hosted SQL queries.

Create these three connections in Admin > Channels & Tools > Tools > Custom tools (API). For each, add the header `Authorization` with value `Bearer YOUR_DEMO_API_TOKEN`. Use the demo-service secret you generated locally. Keep it out of skill files, screenshots, OpenAPI files and the repository. If the form offers a protected secret field, use it. Check whether the saved credential is masked before sharing screenshots.

## 1. Product lookup

- Name: `lookup_product`
- Method: GET
- URL template: `BASE/products/{item_id}`
- Description: Retrieve a fictional Thrift Nest item's price in kobo, NGN amount, size label, measurements with units, availability and source-update time. Never infer missing values or fit.
- Group: Thrift Nest Demo
- Tags: thrift-nest, product, read
- Path variable: `item_id`, string, required. Description: Fictional item code, for example TN-DEMO-001.
- Body schema: none for this GET.
- Timeout: 10000 ms.

## 2. Create pending order

- Name: `create_pending_order`
- Method: POST
- URL: `BASE/orders`
- Headers: Authorization as above, plus Content-Type = application/json.
- Description: Only after the customer's explicit confirmation, save one unpaid pending purchase request. Pass the catalogue price in integer kobo as expected_price_minor and customer_confirmed=true. This does not reserve stock or confirm payment. Repeated customer/item requests return the original order. PRICE_CHANGED requires a fresh lookup and new confirmation. After an uncertain response, use get_pending_order before retrying.
- Group: Thrift Nest Demo
- Tags: thrift-nest, order, write
- Timeout: 10000 ms.
- Body schema: copy `api/order-body-schema.json`.

## 3. Reconcile pending order

- Name: `get_pending_order`
- Method: GET
- URL template: `BASE/orders`
- Description: Retrieve an existing pending order by fictional customer_ref and item_id. Use to answer repeated requests or reconcile an uncertain create response before retrying. found=false is an explicit absence result; a timeout or error is not proof of absence.
- Group: Thrift Nest Demo
- Tags: thrift-nest, order, read
- Query parameters: customer_ref (required string, example DEMO-ADA); item_id (required string, example TN-DEMO-001).
- Body schema: none for this GET.
- Timeout: 10000 ms.

In the observed import, item_id was a required string path variable; the connection URL displayed /products/:item_id. get_pending_order used customer_ref and item_id query fields. Do not assume that writing a placeholder alone defines its input schema. If using OpenAPI import instead, use `api/openapi.json` after replacing its single REPLACE_WITH_DEPLOYED_WORKER_ORIGIN server URL with the actual origin. Review the imported fields and operation scope. Authentication must still be configured separately.

The observed teammate Settings Tools list showed built-in integrations, without custom API toggles. Do not invent an assignment step: verify availability through the actual lookup/write traces. Avoid enabling unrelated workspace tools. Confirm the published skill is included and the teammate is active for test replies. Then run the scenarios in `docs/ACCEPTANCE.md` and inspect the external records.

## Publishing and simulator

The published skill panel distinguishes Instructions from other files. Confirm the edited file is the one marked Instructions; update the selected file, save/review and publish. The latest inspected published skill was v8 on 29 October. The repository canonical SKILL.md includes the same sold-item and formatting additions; do not upload another duplicate if editing the existing instruction file is sufficient.

Open https://chat.tsglabs.dev/ and sign in with the same Chord account. If access is disabled, inspect Admin > Connected apps or ask the TSG contact to enable the exercise entitlement. In the agent list, create a chat link for Thrift Nest Order Assistant with business name Thrift Nest. Use the recorded link from README for this deployment. Test the simulator separately from teammate chat; formatting and app access differed in our observed flow.
