// GET /api/pedido?session_id=cs_...  → resumen del pedido para la página de confirmación.
import { getStripe, json } from './_tienda.js';

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: 'Pedido no encontrado.' }, 400);
  const stripe = getStripe();
  if (!stripe) return json({ error: 'Pagos no configurados.' }, 503);
  try {
    const s = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
    return json({
      referencia: s.id.slice(-8).toUpperCase(),
      pagado: s.payment_status === 'paid',
      nombre: s.metadata?.nombre || s.customer_details?.name || '',
      email: s.customer_details?.email || s.customer_email || '',
      total: (s.amount_total || 0) / 100,
      lineas: (s.line_items?.data || []).map((l) => ({ nombre: l.description, cantidad: l.quantity, importe: l.amount_total / 100 })),
    });
  } catch (e) {
    console.error('Stripe retrieve error:', e?.message);
    return json({ error: 'Pedido no encontrado.' }, 404);
  }
}
