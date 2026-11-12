// Pruebas de la API de la tienda contra un Stripe simulado (no hace falta cuenta).
import http from 'node:http';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

let last = null;
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    last = { method: req.method, url: req.url, body: new URLSearchParams(b) };
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && req.url === '/v1/checkout/sessions')
      return res.end(JSON.stringify({ id: 'cs_test_abc123XYZ', object: 'checkout.session', url: 'https://checkout.stripe.com/c/pay/cs_test_abc123XYZ' }));
    if (req.method === 'GET' && req.url.startsWith('/v1/checkout/sessions/cs_test_abc123XYZ'))
      return res.end(JSON.stringify({ id: 'cs_test_abc123XYZ', object: 'checkout.session', payment_status: 'paid', amount_total: 3540, metadata: { nombre: 'Ana' }, customer_details: { email: 'ana@test.es' },
        line_items: { object: 'list', data: [{ description: 'Camiseta técnica Bularas · Talla M', quantity: 1, amount_total: 2990 }, { description: 'Bote de 3 pelotas', quantity: 1, amount_total: 550 }] } }));
    res.statusCode = 404; res.end('{}');
  });
});
await new Promise((r) => mock.listen(0, r));
process.env.STRIPE_TEST_HOST = `http://127.0.0.1:${mock.address().port}`;
process.env.SITE_URL = 'https://padelbularas.com';

const { POST: checkout } = await import('../api/checkout.js');
const { GET: pedido } = await import('../api/pedido.js');
const { POST: webhook } = await import('../api/stripe-webhook.js');
const req = (body) => new Request('https://x/api/checkout', { method: 'POST', body: JSON.stringify(body) });
const cliente = { nombre: 'Ana', email: 'ana@test.es', telefono: '600000000' };
let ok = 0; const t = async (name, fn) => { await fn(); ok++; console.log('  ✓', name); };

delete process.env.STRIPE_SECRET_KEY;
await t('sin clave de Stripe → 503 con mensaje claro', async () => {
  const r = await checkout(req({ items: [{ id: 'bote-pelotas', cantidad: 1 }], cliente, acepta: true }));
  assert.equal(r.status, 503);
});
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
await t('carrito vacío → 400', async () => assert.equal((await checkout(req({ items: [], cliente, acepta: true }))).status, 400));
await t('sin aceptar condiciones → 400', async () => assert.equal((await checkout(req({ items: [{ id: 'bote-pelotas', cantidad: 1 }], cliente }))).status, 400));
await t('email inválido → 400', async () => assert.equal((await checkout(req({ items: [{ id: 'bote-pelotas', cantidad: 1 }], cliente: { ...cliente, email: 'x' }, acepta: true }))).status, 400));
await t('producto inexistente → 400', async () => assert.equal((await checkout(req({ items: [{ id: 'nope', cantidad: 1 }], cliente, acepta: true }))).status, 400));
await t('producto agotado → 400', async () => { const r = await checkout(req({ items: [{ id: 'gorra-club', cantidad: 1 }], cliente, acepta: true })); assert.equal(r.status, 400); assert.match((await r.json()).error, /agotado/); });
await t('talla obligatoria/no válida → 400', async () => assert.equal((await checkout(req({ items: [{ id: 'camiseta-club', variante: 'XXXL', cantidad: 1 }], cliente, acepta: true }))).status, 400));
await t('cantidad > stock → 400', async () => assert.equal((await checkout(req({ items: [{ id: 'pala-power-lite', cantidad: 5 }], cliente, acepta: true }))).status, 400));
await t('precio manipulado en el navegador se ignora; sesión correcta', async () => {
  const r = await checkout(req({ items: [{ id: 'camiseta-club', variante: 'M', cantidad: 2, precio: 0.01 }, { id: 'bote-pelotas', cantidad: 1 }], cliente, acepta: true }));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_abc123XYZ');
  const b = last.body;
  assert.equal(b.get('line_items[0][price_data][unit_amount]'), '2990');
  assert.equal(b.get('line_items[0][quantity]'), '2');
  assert.equal(b.get('line_items[0][price_data][product_data][name]'), 'Camiseta técnica Bularas · Talla M');
  assert.equal(b.get('line_items[1][price_data][unit_amount]'), '550');
  assert.equal(b.get('currency'), 'eur');
  assert.equal(b.get('mode'), 'payment');
  assert.equal(b.get('customer_email'), 'ana@test.es');
  assert.equal(b.get('success_url'), 'https://padelbularas.com/tienda/pedido-confirmado/index.html?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(b.get('metadata[entrega]'), 'Recogida en el club');
});
process.env.STRIPE_SECRET_KEY = 'sk_live_123';
await t('en modo real (live) los productos de ejemplo no se venden', async () => assert.equal((await checkout(req({ items: [{ id: 'bote-pelotas', cantidad: 1 }], cliente, acepta: true }))).status, 400));
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
await t('resumen del pedido', async () => {
  const r = await pedido(new Request('https://x/api/pedido?session_id=cs_test_abc123XYZ'));
  const d = await r.json(); assert.equal(d.pagado, true); assert.equal(d.total, 35.4); assert.equal(d.lineas.length, 2);
  assert.equal((await pedido(new Request('https://x/api/pedido?session_id=hack'))).status, 400);
});
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
await t('webhook: firma válida → 200, firma falsa → 400', async () => {
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_test_abc123XYZ', payment_status: 'paid', amount_total: 3540, metadata: { nombre: 'Ana', pedido: '1x bote-pelotas' }, customer_details: { email: 'ana@test.es' } } } });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
  const good = await webhook(new Request('https://x/api/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }));
  assert.equal(good.status, 200);
  const bad = await webhook(new Request('https://x/api/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': 't=1,v1=bad' } }));
  assert.equal(bad.status, 400);
});
mock.close();
console.log(`\n${ok} pruebas superadas`);
