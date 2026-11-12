// POST /api/stripe-webhook  → Stripe avisa aquí cuando un pago se completa.
// Configura en Stripe › Desarrolladores › Webhooks el endpoint https://TU-DOMINIO/api/stripe-webhook
// con el evento checkout.session.completed y copia su "Signing secret" en STRIPE_WEBHOOK_SECRET.
// Si defines RESEND_API_KEY y PEDIDOS_EMAIL, el club recibe un email con cada pedido pagado.
import { getStripe, json } from './_tienda.js';

async function avisarClub(session) {
  const { RESEND_API_KEY, PEDIDOS_EMAIL, PEDIDOS_REMITENTE } = process.env;
  const total = ((session.amount_total || 0) / 100).toFixed(2).replace('.', ',');
  const texto = [
    `Nuevo pedido pagado en la tienda online (${total} €)`,
    `Cliente: ${session.metadata?.nombre || session.customer_details?.name || '-'}`,
    `Email: ${session.customer_details?.email || '-'} · Teléfono: ${session.customer_details?.phone || session.metadata?.telefono || '-'}`,
    `Artículos: ${session.metadata?.pedido || '-'}`,
    `Entrega: recogida en el club`,
    `Referencia: ${session.id.slice(-8).toUpperCase()} (${session.id})`,
  ].join('\n');
  console.log(texto);
  if (!RESEND_API_KEY || !PEDIDOS_EMAIL) return;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: PEDIDOS_REMITENTE || 'Tienda Padel Bularas <onboarding@resend.dev>',
      to: PEDIDOS_EMAIL.split(',').map((s) => s.trim()),
      subject: `Nuevo pedido ${session.id.slice(-8).toUpperCase()} · ${total} €`,
      text: texto,
    }),
  });
  if (!r.ok) console.error('Resend error', r.status, await r.text());
}

export async function POST(request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return json({ error: 'Webhook no configurado.' }, 503);
  const raw = await request.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, request.headers.get('stripe-signature') || '', secret);
  } catch (e) {
    console.error('Firma de webhook no válida:', e?.message);
    return json({ error: 'Firma no válida.' }, 400);
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      try { await avisarClub(session); } catch (e) { console.error('Aviso pedido:', e?.message); }
    }
  }
  return json({ recibido: true });
}
