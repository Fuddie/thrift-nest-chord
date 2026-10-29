// Test-data service. No payments, customer messages or personal details.
const ITEM = /^TN-DEMO-\d{3}$/;
const CUSTOMER = /^DEMO-[A-Z0-9-]{1,32}$/;

function json(data, status = 200, requestId = crypto.randomUUID()) {
  return Response.json({ ...data, request_id: requestId }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId }
  });
}
function fail(code, message, status, requestId) {
  return json({ success: false, error: { code, message } }, status, requestId);
}
function outputOrder(row, reused) {
  return { ...row, amount: (row.price_minor / 100).toFixed(2),
    stock_reserved: false, ...(reused === undefined ? {} : { reused }) };
}
async function findOrder(env, customer, item) {
  return env.DB.prepare('SELECT * FROM orders WHERE customer_ref = ? AND item_id = ?')
    .bind(customer, item).first();
}

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ service: 'thrift-nest-demo', test_data_only: true }, 200, requestId);
    }
    if (!env.API_TOKEN) return fail('NOT_CONFIGURED', 'Service authentication is not configured.', 503, requestId);
    if (request.headers.get('Authorization') !== `Bearer ${env.API_TOKEN}`) {
      return fail('UNAUTHORIZED', 'Missing or invalid service credential.', 401, requestId);
    }
    try {
      const itemMatch = url.pathname.match(/^\/products\/([^/]+)$/);
      if (itemMatch && request.method === 'GET') {
        const item = itemMatch[1];
        if (!ITEM.test(item)) return fail('INVALID_ITEM_ID', 'Use a fictional item code such as TN-DEMO-001.', 400, requestId);
        const row = await env.DB.prepare('SELECT * FROM products WHERE item_id = ?').bind(item).first();
        if (!row) return fail('ITEM_NOT_FOUND', 'Item code was not found.', 404, requestId);
        const { measurements_json, ...product } = row;
        return json({ success: true, test_data_only: true, product: { ...product,
          measurements: JSON.parse(measurements_json), amount: (row.price_minor / 100).toFixed(2) } }, 200, requestId);
      }
      if (url.pathname === '/orders' && request.method === 'GET') {
        const customer = url.searchParams.get('customer_ref') || '';
        const item = url.searchParams.get('item_id') || '';
        if (!CUSTOMER.test(customer) || !ITEM.test(item)) return fail('INVALID_REFERENCE', 'Supply a fictional DEMO- customer reference and TN-DEMO- item code.', 400, requestId);
        const order = await findOrder(env, customer, item);
        return json({ success: true, found: Boolean(order), order: order ? outputOrder(order) : null }, 200, requestId);
      }
      if (url.pathname === '/orders' && request.method === 'POST') {
        if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
          return fail('JSON_REQUIRED', 'Send application/json.', 415, requestId);
        }
        const text = await request.text();
        if (new TextEncoder().encode(text).length > 2048) return fail('BODY_TOO_LARGE', 'Request body exceeds demo limit.', 413, requestId);
        let body;
        try { body = JSON.parse(text); } catch { return fail('INVALID_JSON', 'Request is not valid JSON.', 400, requestId); }
        if (!body || Array.isArray(body) || typeof body !== 'object') return fail('INVALID_BODY', 'Request must be a JSON object.', 400, requestId);
        const allowed = ['customer_ref', 'item_id', 'expected_price_minor', 'customer_confirmed'];
        if (Object.keys(body).some(key => !allowed.includes(key))) return fail('UNEXPECTED_FIELD', 'Only the documented pending-order fields are accepted.', 400, requestId);
        const { customer_ref: customer, item_id: item, expected_price_minor: expected, customer_confirmed: confirmed } = body;
        if (!CUSTOMER.test(customer || '') || !ITEM.test(item || '') || !Number.isSafeInteger(expected) || expected <= 0) {
          return fail('INVALID_BODY', 'Supply valid fictional references and a positive integer quoted price in kobo.', 400, requestId);
        }
        if (confirmed !== true) return fail('CONFIRMATION_REQUIRED', 'Obtain the customer\'s explicit confirmation first.', 400, requestId);
        // Existing requests remain retrievable even if stock or price later changes.
        const existing = await findOrder(env, customer, item);
        if (existing) return json({ success: true, order: outputOrder(existing, true) }, 200, requestId);

        const id = `TN-${crypto.randomUUID()}`;
        // Availability and price are checked inside the INSERT, closing the gap
        // between an earlier catalogue read and the write. Uniqueness handles races.
        const result = await env.DB.prepare(`
          INSERT INTO orders (order_id, customer_ref, item_id, price_minor, currency, order_status, payment_status, created_at)
          SELECT ?, ?, item_id, price_minor, currency, 'pending', 'unverified', ?
          FROM products WHERE item_id = ? AND availability = 'available' AND price_minor = ?
          ON CONFLICT(customer_ref, item_id) DO NOTHING
        `).bind(id, customer, new Date().toISOString(), item, expected).run();
        const saved = await findOrder(env, customer, item);
        if (saved) return json({ success: true, order: outputOrder(saved, saved.order_id !== id) }, result.meta.changes === 1 ? 201 : 200, requestId);
        const product = await env.DB.prepare('SELECT * FROM products WHERE item_id = ?').bind(item).first();
        if (!product) return fail('ITEM_NOT_FOUND', 'Item code was not found.', 404, requestId);
        if (product.availability !== 'available') return fail('ITEM_UNAVAILABLE', 'This item is sold or its availability is unverified.', 409, requestId);
        if (product.price_minor !== expected) return json({ success: false,
          error: { code: 'PRICE_CHANGED', message: 'Retrieve the current price and ask for confirmation again.' },
          current_price_minor: product.price_minor, currency: product.currency }, 409, requestId);
        return fail('WRITE_UNVERIFIED', 'The order could not be verified. Reconcile before retrying.', 503, requestId);
      }
      return fail('ROUTE_NOT_FOUND', 'No such operation.', 404, requestId);
    } catch {
      // An exception after INSERT may mean the write committed: never assert failure.
      console.error(JSON.stringify({ request_id: requestId, code: 'SERVICE_ERROR' }));
      return fail('SERVICE_ERROR', 'The result is unverified. Check for an existing order before retrying.', 503, requestId);
    }
  }
};
