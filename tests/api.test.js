import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../api/worker.js';

// Execute the actual SQL against SQLite, adapting only D1's calling interface.
// This validates local behavior, not Cloudflare or Chord connectivity.
function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../api/schema.sql', import.meta.url), 'utf8'));
  const DB = { prepare(sql) { return { bind(...args) { return {
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; }
  }; } }; } };
  const env = { DB, API_TOKEN: 'local-test-only' };
  const call = async (path, body, token = 'local-test-only') => {
    const headers = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await worker.fetch(new Request(`https://example.test${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    }), env);
    return { status: response.status, data: await response.json() };
  };
  const purchase = (extra = {}) => ({ customer_ref: 'DEMO-ADA', item_id: 'TN-DEMO-001', expected_price_minor: 850000, customer_confirmed: true, ...extra });
  return { db, env, call, purchase };
}
test('catalogue returns recorded amount, units and availability', async () => {
  const { call } = setup(); const r = await call('/products/TN-DEMO-001');
  assert.equal(r.status, 200); assert.equal(r.data.product.amount, '8500.00');
  assert.equal(r.data.product.measurements.waist.unit, 'in');
});
test('create saves pending unpaid order; independent SQL confirms stock is unchanged', async () => {
  const { call, purchase, db } = setup(); const r = await call('/orders', purchase());
  assert.equal(r.status, 201); const stored = db.prepare('SELECT * FROM orders').get();
  assert.equal(stored.order_id, r.data.order.order_id); assert.equal(stored.price_minor, 850000);
  assert.equal(stored.payment_status, 'unverified'); assert.equal(stored.order_status, 'pending');
  assert.equal(db.prepare("SELECT availability FROM products WHERE item_id = 'TN-DEMO-001'").get().availability, 'available');
});
test('retries and overlapping requests return one order', async () => {
  const { call, purchase, db } = setup(); const results = await Promise.all(Array.from({ length: 8 }, () => call('/orders', purchase())));
  assert.equal(new Set(results.map(r => r.data.order.order_id)).size, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 1);
});
test('sold, unknown, and absent products never produce orders', async () => {
  const { call, purchase, db } = setup();
  for (const [item, price, status] of [['TN-DEMO-002',650000,409],['TN-DEMO-004',500000,409],['TN-DEMO-999',100,404]]) {
    assert.equal((await call('/orders', purchase({ item_id: item, expected_price_minor: price }))).status, status);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 0);
});
test('changed quoted price is rejected without writing', async () => {
  const { call, purchase, db } = setup(); db.exec("UPDATE products SET price_minor = 900000 WHERE item_id = 'TN-DEMO-001'");
  const r = await call('/orders', purchase()); assert.equal(r.data.error.code, 'PRICE_CHANGED');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 0);
});
test('read-only enquiry and unconfirmed request never create an order', async () => {
  const { call, purchase, db } = setup(); await call('/products/TN-DEMO-001');
  const r = await call('/orders', purchase({ customer_confirmed: false }));
  assert.equal(r.data.error.code, 'CONFIRMATION_REQUIRED'); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 0);
});
test('missing measurements remain missing; no made-up values', async () => {
  const { call } = setup(); const r = await call('/products/TN-DEMO-003'); assert.deepEqual(r.data.product.measurements, {});
});
test('unauthorized calls, unexpected fields and personal identifiers are refused', async () => {
  const { call, purchase } = setup(); assert.equal((await call('/orders', purchase(), 'wrong')).status, 401);
  assert.equal((await call('/orders', purchase({ payment_status: 'paid' }))).status, 400);
  assert.equal((await call('/orders', purchase({ customer_ref: '+234123456789' }))).status, 400);
});
test('lost client response can be reconciled by lookup and retried without duplication', async () => {
  const { call, purchase, db } = setup(); await call('/orders', purchase()); // discard the first response
  const found = await call('/orders?customer_ref=DEMO-ADA&item_id=TN-DEMO-001');
  assert.equal(found.data.found, true); const retry = await call('/orders', purchase());
  assert.equal(retry.data.order.order_id, found.data.order.order_id); assert.equal(retry.data.order.reused, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 1);
});
