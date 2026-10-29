// Fictional-data demo. Backend keys stay in Worker secrets, never in Chord.
function reply(payload, status, id) {
  return Response.json({ ...payload, request_id: id,
    database_backend: 'supabase_postgresql', test_data_only: true }, {
    status, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': id }
  });
}
function fail(code, message, status, id) {
  return reply({ success: false, error: { code, message } }, status, id);
}
// Enforce byte limits while reading, including bodies without Content-Length.
async function limitedText(body, limit) {
  if (!body) return '';
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('BODY_TOO_LARGE');
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
export async function handle(request, env, fetcher = fetch) {
  const id = crypto.randomUUID();
  const url = new URL(request.url);
  if (url.pathname === '/health' && request.method === 'GET') {
    // Liveness only. A product lookup is needed to prove database connectivity.
    return reply({ service: 'thrift-nest-demo', database_connection_verified: false }, 200, id);
  }
  if (!env.API_TOKEN) return fail('NOT_CONFIGURED','Service authentication is not configured.',503,id);
  if (request.headers.get('Authorization') !== `Bearer ${env.API_TOKEN}`) {
    return fail('UNAUTHORIZED','Missing or invalid service credential.',401,id);
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    return fail('NOT_CONFIGURED','PostgreSQL integration is not configured.',503,id);
  }
  try {
    const origin = new URL(env.SUPABASE_URL);
    if (origin.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(origin.hostname)
      || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      return fail('NOT_CONFIGURED','Invalid database API origin.',503,id);
    }
    // New Supabase backend key. Send as apikey, not as a user JWT.
    if (!env.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
      return fail('NOT_CONFIGURED','Use the server-side Supabase secret API key.',503,id);
    }
    let operation, payload;
    const match = url.pathname.match(/^\/products\/([^/]+)$/);
    if (match && request.method === 'GET') {
      operation = 'lookup_product'; payload = { item_id: match[1] };
    } else if (url.pathname === '/orders' && request.method === 'GET') {
      operation = 'get_pending_order'; payload = {
        customer_ref: url.searchParams.get('customer_ref'), item_id: url.searchParams.get('item_id') };
    } else if (url.pathname === '/orders' && request.method === 'POST') {
      operation = 'create_pending_order';
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
        return fail('JSON_REQUIRED','Send application/json.',415,id);
      }
      let raw;
      try { raw = await limitedText(request.body, 2048); }
      catch (error) {
        if (error.message === 'BODY_TOO_LARGE') return fail('BODY_TOO_LARGE','Request exceeds demo limit.',413,id);
        throw error;
      }
      try { payload = JSON.parse(raw); } catch { return fail('INVALID_JSON','Request is not valid JSON.',400,id); }
    } else return fail('ROUTE_NOT_FOUND','No such operation.',404,id);

    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 8000);
    let result;
    try {
      const upstream = await fetcher(`${origin.origin}/rest/v1/rpc/tn_demo_operation`, {
      method: 'POST', headers: { apikey: env.SUPABASE_SECRET_KEY,
        'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ p_operation: operation, p_payload: payload }),
        signal: controller.signal
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        throw new Error('DATABASE_RPC_ERROR');
      }
      result = JSON.parse(await limitedText(upstream.body, 16384));
    } finally {
      clearTimeout(deadline);
    }
    const body = result?.payload;
    if (![200,201,400,404,409].includes(result?.http_status) || !body || typeof body.success !== 'boolean') {
      throw new Error('INVALID_DATABASE_RESPONSE');
    }
    if (body.success) {
      if (operation === 'lookup_product' && (!body.product || body.product.item_id !== payload.item_id
          || !Number.isSafeInteger(body.product.price_minor))) throw new Error('INVALID_PRODUCT');
      if (operation === 'get_pending_order' && typeof body.found !== 'boolean') throw new Error('INVALID_LOOKUP');
      const needsOrder = operation === 'create_pending_order' || (operation === 'get_pending_order' && body.found);
      if (needsOrder && (!body.order?.order_id || body.order.customer_ref !== payload.customer_ref
          || body.order.item_id !== payload.item_id || body.order.order_status !== 'pending'
          || body.order.payment_status !== 'unverified' || !Number.isSafeInteger(body.order.price_minor))) {
        throw new Error('INVALID_ORDER');
      }
      if (result.http_status >= 400) throw new Error('INVALID_STATUS');
    } else if (result.http_status < 400 || !body.error?.code) throw new Error('INVALID_ERROR');
    return reply(body, result.http_status, id);
  } catch {
    console.error(JSON.stringify({ request_id: id, code: 'SERVICE_ERROR' }));
    return fail('SERVICE_ERROR','The result is unverified. Check for an existing order before retrying.',503,id);
  }
}
export default { fetch(request, env) { return handle(request, env); } };
