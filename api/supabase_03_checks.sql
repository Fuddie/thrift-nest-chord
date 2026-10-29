-- Run only after scripts 01 and 02. Test writes are rolled back.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE a jsonb; b jsonb; c jsonb; n integer;
BEGIN
  a := public.tn_demo_operation('lookup_product','{"item_id":"TN-DEMO-001"}');
  IF a#>>'{payload,product,price_minor}' IS DISTINCT FROM '850000' THEN
    RAISE EXCEPTION 'Product lookup price check failed'; END IF;
  a := public.tn_demo_operation('create_pending_order',
    '{"customer_ref":"DEMO-SQLCHECK","item_id":"TN-DEMO-001","expected_price_minor":850000,"customer_confirmed":true}');
  IF a->>'http_status' IS DISTINCT FROM '201' THEN
    RAISE EXCEPTION 'Expected a fresh SQLCHECK fixture. Use a new demo reference in this test if it already exists.'; END IF;
  b := public.tn_demo_operation('create_pending_order',
    '{"customer_ref":"DEMO-SQLCHECK","item_id":"TN-DEMO-001","expected_price_minor":850000,"customer_confirmed":true}');
  IF a#>>'{payload,order,order_id}' IS DISTINCT FROM b#>>'{payload,order,order_id}'
     OR b#>>'{payload,order,reused}' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Duplicate protection failed'; END IF;
  SELECT COUNT(*) INTO n FROM thrift_demo.orders
    WHERE customer_ref='DEMO-SQLCHECK' AND item_id='TN-DEMO-001';
  IF n <> 1 THEN RAISE EXCEPTION 'Expected one matching order'; END IF;
  IF a#>>'{payload,order,payment_status}' IS DISTINCT FROM 'unverified' THEN
    RAISE EXCEPTION 'Payment status check failed'; END IF;
  IF (SELECT availability FROM thrift_demo.products WHERE item_id='TN-DEMO-001') <> 'available' THEN
    RAISE EXCEPTION 'Stock changed or fixture not available'; END IF;
  c := public.tn_demo_operation('create_pending_order',
    '{"customer_ref":"DEMO-SQLSOLD","item_id":"TN-DEMO-002","expected_price_minor":650000,"customer_confirmed":true}');
  IF c#>>'{payload,error,code}' IS DISTINCT FROM 'ITEM_UNAVAILABLE' THEN
    RAISE EXCEPTION 'Sold item check failed'; END IF;
  c := public.tn_demo_operation('create_pending_order',
    '{"customer_ref":"DEMO-SQLPRICE","item_id":"TN-DEMO-001","expected_price_minor":1,"customer_confirmed":true}');
  IF c#>>'{payload,error,code}' IS DISTINCT FROM 'PRICE_CHANGED' THEN
    RAISE EXCEPTION 'Price check failed'; END IF;
  c := public.tn_demo_operation('create_pending_order',
    '{"customer_ref":"DEMO-SQLFALSE","item_id":"TN-DEMO-001","expected_price_minor":850000,"customer_confirmed":false}');
  IF c#>>'{payload,error,code}' IS DISTINCT FROM 'CONFIRMATION_REQUIRED' THEN
    RAISE EXCEPTION 'Confirmation check failed'; END IF;
  IF has_function_privilege('anon','public.tn_demo_operation(text,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.tn_demo_operation(text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected public function access'; END IF;
END $$;
ROLLBACK;
SELECT 'Checks completed; temporary test writes rolled back' AS result;
