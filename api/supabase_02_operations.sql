BEGIN;

-- PostgreSQL row-locking SELECT needs UPDATE privilege on at least one column.
GRANT UPDATE (item_id) ON thrift_demo.products TO service_role;

-- Called only by our server-side Worker. No arbitrary SQL is accepted.
CREATE OR REPLACE FUNCTION public.tn_demo_operation(
  p_operation text, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_item text;
  v_customer text;
  v_price integer;
  v_product thrift_demo.products%ROWTYPE;
  v_order thrift_demo.orders%ROWTYPE;
  v_result jsonb;
  v_reused boolean := false;
  v_code text;
  v_message text;
  v_status integer := 400;
BEGIN
  IF p_operation IS NULL OR p_operation NOT IN
     ('lookup_product','get_pending_order','create_pending_order') THEN
    v_code := 'ROUTE_NOT_FOUND'; v_message := 'No such operation.'; v_status := 404;
  ELSIF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    v_code := 'INVALID_BODY'; v_message := 'Supply a JSON object.';
  ELSE
    v_item := p_payload->>'item_id';
    v_customer := p_payload->>'customer_ref';
    IF v_item IS NULL OR v_item !~ '^TN-DEMO-[0-9]{3}$' THEN
      v_code := 'INVALID_ITEM_ID'; v_message := 'Supply a fictional TN-DEMO- item code.';
    ELSIF p_operation <> 'lookup_product' AND
          (v_customer IS NULL OR v_customer !~ '^DEMO-[A-Z0-9-]{1,32}$') THEN
      v_code := 'INVALID_REFERENCE'; v_message := 'Supply a fictional DEMO- customer reference.';
    ELSIF p_operation = 'create_pending_order' THEN
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_payload) AS k(key)
                 WHERE k.key NOT IN ('customer_ref','item_id','expected_price_minor','customer_confirmed')) THEN
        v_code := 'UNEXPECTED_FIELD'; v_message := 'Only the four documented fields are accepted.';
      ELSIF jsonb_typeof(p_payload->'expected_price_minor') IS DISTINCT FROM 'number'
         OR (p_payload->>'expected_price_minor') !~ '^[1-9][0-9]{0,9}$' THEN
        v_code := 'INVALID_BODY'; v_message := 'Quoted price must be a positive integer in kobo.';
      ELSIF (p_payload->>'expected_price_minor')::numeric > 2147483647 THEN
        v_code := 'INVALID_BODY'; v_message := 'Quoted price is outside the supported range.';
      ELSIF p_payload->'customer_confirmed' IS DISTINCT FROM 'true'::jsonb THEN
        v_code := 'CONFIRMATION_REQUIRED'; v_message := 'Obtain explicit customer confirmation first.';
      ELSE
        v_price := (p_payload->>'expected_price_minor')::integer;
      END IF;
    END IF;
  END IF;

  IF v_code IS NOT NULL THEN
    RETURN jsonb_build_object('http_status',v_status,'payload',jsonb_build_object(
      'success',false,'error',jsonb_build_object('code',v_code,'message',v_message)));
  END IF;

  IF p_operation = 'lookup_product' THEN
    SELECT * INTO v_product FROM thrift_demo.products WHERE item_id = v_item;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('http_status',404,'payload',jsonb_build_object(
        'success',false,'error',jsonb_build_object('code','ITEM_NOT_FOUND','message','Item code was not found.')));
    END IF;
    RETURN jsonb_build_object('http_status',200,'payload',jsonb_build_object(
      'success',true,'test_data_only',true,
      'product',(to_jsonb(v_product)-'measurements_json') || jsonb_build_object(
        'measurements',v_product.measurements_json::jsonb,
        'amount',((v_product.price_minor::numeric / 100)::numeric(12,2))::text)));
  END IF;

  IF p_operation = 'create_pending_order' THEN
    -- Serialize retries for one customer/item pair. Hash collisions only serialize
    -- unrelated requests; they do not combine records.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_customer || ':' || v_item, 0));
  END IF;
  SELECT * INTO v_order FROM thrift_demo.orders
    WHERE customer_ref = v_customer AND item_id = v_item;

  IF p_operation = 'get_pending_order' THEN
    v_result := CASE WHEN v_order.order_id IS NULL THEN NULL ELSE
      to_jsonb(v_order) || jsonb_build_object('stock_reserved',false,
        'amount',((v_order.price_minor::numeric / 100)::numeric(12,2))::text) END;
    RETURN jsonb_build_object('http_status',200,'payload',jsonb_build_object(
      'success',true,'found',v_order.order_id IS NOT NULL,'order',v_result));
  END IF;

  IF v_order.order_id IS NOT NULL THEN
    v_reused := true;
  ELSE
    -- Hold a share lock until the transaction ends, so an owner price/stock edit
    -- cannot slip between this check and INSERT. Pending orders do not reserve stock.
    SELECT * INTO v_product FROM thrift_demo.products WHERE item_id = v_item FOR SHARE;
    IF NOT FOUND THEN
      v_code := 'ITEM_NOT_FOUND'; v_message := 'Item code was not found.'; v_status := 404;
    ELSIF v_product.availability <> 'available' THEN
      v_code := 'ITEM_UNAVAILABLE'; v_message := 'This item is sold or availability needs confirmation.'; v_status := 409;
    ELSIF v_product.price_minor <> v_price THEN
      RETURN jsonb_build_object('http_status',409,'payload',jsonb_build_object(
        'success',false,'error',jsonb_build_object('code','PRICE_CHANGED',
        'message','Retrieve the current price and ask for confirmation again.'),
        'current_price_minor',v_product.price_minor,'currency',v_product.currency));
    END IF;
    IF v_code IS NOT NULL THEN
      RETURN jsonb_build_object('http_status',v_status,'payload',jsonb_build_object(
        'success',false,'error',jsonb_build_object('code',v_code,'message',v_message)));
    END IF;

    INSERT INTO thrift_demo.orders
      (order_id,customer_ref,item_id,price_minor,currency,order_status,payment_status,created_at)
    VALUES ('TN-' || pg_catalog.gen_random_uuid()::text,v_customer,v_item,
      v_product.price_minor,v_product.currency,'pending','unverified',
      pg_catalog.to_char(pg_catalog.clock_timestamp() AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    RETURNING * INTO v_order;
  END IF;
  RETURN jsonb_build_object('http_status',CASE WHEN v_reused THEN 200 ELSE 201 END,
    'payload',jsonb_build_object('success',true,'order',to_jsonb(v_order) ||
      jsonb_build_object('stock_reserved',false,'reused',v_reused,
        'amount',((v_order.price_minor::numeric / 100)::numeric(12,2))::text)));
END;
$$;

REVOKE ALL ON FUNCTION public.tn_demo_operation(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tn_demo_operation(text,jsonb) TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Read-only checks. These do NOT create orders.
SELECT public.tn_demo_operation('lookup_product','{"item_id":"TN-DEMO-001"}'::jsonb);
SELECT COUNT(*) AS pending_order_count FROM thrift_demo.orders;
