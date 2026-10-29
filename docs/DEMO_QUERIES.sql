-- Run against the hosted Supabase project, not the separate localhost database.
-- Replace DEMO-REVIEW001 consistently with your fresh reference.

-- Before conversation: expect zero records for a new reference.
SELECT COUNT(*) AS existing_requests FROM thrift_demo.orders
WHERE customer_ref = 'DEMO-REVIEW001';

-- After asking about product105: compare the returned catalogue data.
SELECT item_id, name, price_minor/100.0 AS amount_naira, availability,
       measurements_json::jsonb #>> '{waist,value}' AS waist,
       measurements_json::jsonb #>> '{waist,unit}' AS waist_unit
FROM thrift_demo.products WHERE item_id = 'TN-DEMO-105';

-- After explicit confirmation and successful save: match the actual order ID.
SELECT o.order_id,o.customer_ref,o.item_id,o.price_minor/100.0 AS amount_naira,
       o.currency,o.order_status,o.payment_status,p.availability
FROM thrift_demo.orders o JOIN thrift_demo.products p ON p.item_id=o.item_id
WHERE o.customer_ref='DEMO-REVIEW001' AND o.item_id='TN-DEMO-105';

-- After repeating: expect one row and the original ID.
SELECT COUNT(*) AS order_count,MIN(order_id) AS order_id
FROM thrift_demo.orders
WHERE customer_ref='DEMO-REVIEW001' AND item_id='TN-DEMO-105';

-- After requesting sold002: expect sold and zero requests for this pair.
SELECT p.item_id,p.availability,
 (SELECT COUNT(*) FROM thrift_demo.orders o
  WHERE o.item_id=p.item_id AND o.customer_ref='DEMO-REVIEW001') AS requests_created
FROM thrift_demo.products p WHERE p.item_id='TN-DEMO-002';
