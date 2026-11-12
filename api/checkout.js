// POST /api/checkout  → crea una sesión de pago de Stripe Checkout y devuelve su URL.
// Body: { items: [{ id, variante, cantidad }], cliente: { nombre, email, telefono }, acepta: true }
import { getStripe, isTestMode, json, siteOrigin, validarCarrito } from './_tienda.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Petición no válida.' }, 400); }

  const cliente = body?.cliente || {};
  const nombre = String(cliente.nombre || '').trim().slice(0, 80);
  const email = String(cliente.email || '').trim().slice(0, 120);
  const telefono = String(cliente.telefono || '').trim().slice(0, 30);
  if (!nombre) return json({ error: 'Indica tu nombre para preparar el pedido.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: 'Revisa tu email.' }, 400);
  if (body?.acepta !== true) return json({ error: 'Debes aceptar las condiciones de venta.' }, 400);

  const stripe = getStripe();
  if (!stripe) return json({ error: 'Los pagos online aún no están activados. Escríbenos por WhatsApp y te reservamos el pedido.' }, 503);

  let lineas;
  try { lineas = validarCarrito(body.items, { permitirEjemplos: isTestMode() }); }
  catch (e) { return json({ error: e.message }, 400); }

  const origin = siteOrigin(request);
  const resumen = lineas.map((l) => `${l.cantidad}x ${l.producto.id}${l.variante ? ` (${l.variante})` : ''}`).join(', ').slice(0, 490);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'es',
      currency: 'eur',
      line_items: lineas.map((l) => ({
        quantity: l.cantidad,
        price_data: {
          currency: 'eur',
          unit_amount: l.unit,
          product_data: {
            name: l.producto.nombre + (l.variante ? ` · ${l.producto.variantes.nombre} ${l.variante}` : ''),
            ...(l.producto.imagen && !l.producto.imagen.endsWith('.svg') ? { images: [`${origin}/img/${l.producto.imagen}`] } : {}),
            metadata: { producto_id: l.producto.id, variante: l.variante || '' },
          },
        },
      })),
      customer_email: email,
      phone_number_collection: { enabled: true },
      custom_text: {
        submit: { message: 'Recogida en Padel Bularas (Av. de Bularas, 1, Pozuelo de Alarcón). Te avisaremos cuando tu pedido esté listo.' },
      },
      metadata: { entrega: 'Recogida en el club', nombre, telefono, pedido: resumen },
      payment_intent_data: {
        description: 'Pedido tienda Padel Bularas',
        metadata: { entrega: 'Recogida en el club', nombre, telefono, pedido: resumen },
      },
      success_url: `${origin}/tienda/pedido-confirmado/index.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tienda/carrito/index.html?cancelado=1`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e?.message);
    return json({ error: 'No hemos podido iniciar el pago. Inténtalo de nuevo en unos minutos.' }, 502);
  }
}

export function GET() { return json({ error: 'Usa POST.' }, 405); }
