import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../api/worker_supabase.js';
const env = { API_TOKEN: 'test-worker-token', SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test-only' };
const order = {order_id:'TN-fixture',customer_ref:'DEMO-TEST',item_id:'TN-DEMO-001',
  price_minor:850000,currency:'NGN',order_status:'pending',payment_status:'unverified'};
function req(path, body) { return new Request(`https://worker.invalid${path}`, {
  method: body === undefined ? 'GET' : 'POST',
  headers:{Authorization:'Bearer test-worker-token','Content-Type':'application/json'},
  ...(body === undefined ? {} : {body:JSON.stringify(body)})}); }
const rpc = (payload,http_status=200) => async () => Response.json({payload,http_status});
test('auth refusal makes no database call', async()=> {
  const r=await handle(new Request('https://worker.invalid/orders'),env,()=>{throw Error('must not call');});
  assert.equal(r.status,401);
});
test('missing PostgreSQL config fails closed; no D1 fallback',async()=>{
  const r=await handle(req('/orders'),{API_TOKEN:env.API_TOKEN},()=>{throw Error('must not call');});
  assert.equal(r.status,503); assert.equal((await r.json()).error.code,'NOT_CONFIGURED');
});
test('create forwards exact body to RPC and returns order',async()=>{
  const body={customer_ref:'DEMO-TEST',item_id:'TN-DEMO-001',expected_price_minor:850000,customer_confirmed:true};
  const r=await handle(req('/orders',body),env,async(url,options)=>{
    assert.equal(url,'https://fixture.supabase.co/rest/v1/rpc/tn_demo_operation');
    assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.Authorization,undefined);
    assert.deepEqual(JSON.parse(options.body),{p_operation:'create_pending_order',p_payload:body});
    return Response.json({http_status:201,payload:{success:true,order}});
  });
  assert.equal(r.status,201);const result=await r.json();
  assert.equal(result.order.order_id,order.order_id);assert.equal(result.database_backend,'supabase_postgresql');
});
test('unavailable and changed-price failures retain business status',async()=>{
  for(const code of ['ITEM_UNAVAILABLE','PRICE_CHANGED']){
    const r=await handle(req('/orders',{}),env,rpc({success:false,error:{code}},409));
    assert.equal(r.status,409);assert.equal((await r.json()).error.code,code);
  }
});
test('uncertain upstream write returns unverified, never failed/saved',async()=>{
  const r=await handle(req('/orders',{}),env,async()=>{throw Error('response lost');});
  assert.equal(r.status,503);assert.match((await r.json()).error.message,/unverified/);
});
test('malformed or mismatched success is not accepted',async()=>{
  for(const payload of [{success:true},{success:true,order:{...order,customer_ref:'DEMO-OTHER'}}]){
    const r=await handle(req('/orders',{customer_ref:'DEMO-TEST',item_id:'TN-DEMO-001'}),env,rpc(payload,201));
    assert.equal(r.status,503);
  }
});
test('explicit order absence survives without inventing order',async()=>{
  const r=await handle(req('/orders?customer_ref=DEMO-TEST&item_id=TN-DEMO-001'),env,
    rpc({success:true,found:false,order:null}));
  assert.equal(r.status,200);assert.equal((await r.json()).found,false);
});
test('health does not claim database connectivity',async()=>{
  const r=await handle(new Request('https://worker.invalid/health'),{},()=>{throw Error('must not call');});
  assert.equal((await r.json()).database_connection_verified,false);
});
test('oversized streamed request is cancelled before any database call',async()=>{
  let cancelled=false, called=false;
  const body=new ReadableStream({
    start(c){ c.enqueue(new Uint8Array(2049)); },
    cancel(){ cancelled=true; }
  });
  const request=new Request('https://worker.invalid/orders',{
    method:'POST',headers:{Authorization:'Bearer test-worker-token','Content-Type':'application/json'},
    body,duplex:'half'
  });
  const result=await handle(request,env,async()=>{called=true;throw Error('must not call');});
  assert.equal(result.status,413);
  assert.equal((await result.json()).error.code,'BODY_TOO_LARGE');
  assert.equal(cancelled,true);assert.equal(called,false);
});
test('oversized database response is cancelled and never accepted as a save',async()=>{
  let cancelled=false;
  const response=new Response(new ReadableStream({
    start(c){c.enqueue(new Uint8Array(16385));},cancel(){cancelled=true;}
  }));
  const result=await handle(req('/orders',{}),env,async()=>response);
  assert.equal(result.status,503);assert.equal(cancelled,true);
  assert.match((await result.json()).error.message,/unverified/);
});
test('unused database HTTP error body is cancelled',async()=>{
  let cancelled=false;
  const response=new Response(new ReadableStream({cancel(){cancelled=true;}}),{status:504});
  const result=await handle(req('/orders',{}),env,async()=>response);
  assert.equal(result.status,503);assert.equal(cancelled,true);
});
