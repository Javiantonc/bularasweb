// Utilidades compartidas por las funciones de la tienda.
// Los precios SIEMPRE se calculan en el servidor a partir de data/productos.json:
// el navegador solo envía ids, variante y cantidad (no se puede manipular el precio).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Stripe from 'stripe';

let catalogo;
export function getCatalogo() {
  if (!catalogo) {
    const file = path.join(process.cwd(), 'data', 'productos.json');
    catalogo = JSON.parse(readFileSync(file, 'utf8'));
  }
  return catalogo;
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const opts = { appInfo: { name: 'Padel Bularas web' } };
  // Solo para pruebas automáticas locales (servidor simulado). En producción no se define.
  if (process.env.STRIPE_TEST_HOST) {
    const u = new URL(process.env.STRIPE_TEST_HOST);
    Object.assign(opts, { host: u.hostname, port: u.port, protocol: u.protocol.replace(':', '') });
  }
  return new Stripe(key, opts);
}

export const isTestMode = () => (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_');

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const toCents = (euros) => Math.round(Number(euros) * 100);

/**
 * Valida el carrito recibido del navegador y devuelve las líneas con precio oficial.
 * Lanza Error con mensaje en español si algo no cuadra.
 */
export function validarCarrito(items, { permitirEjemplos = false } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('El carrito está vacío.');
  if (items.length > 30) throw new Error('Demasiados artículos en un mismo pedido.');
  const { productos } = getCatalogo();
  const porId = new Map(productos.map((p) => [p.id, p]));
  const lineas = [];
  for (const it of items) {
    const p = porId.get(String(it?.id || ''));
    if (!p) throw new Error('Uno de los artículos ya no está disponible. Revisa tu carrito.');
    if (p.ejemplo && !permitirEjemplos) throw new Error(`«${p.nombre}» es un producto de ejemplo y no se puede comprar.`);
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) throw new Error(`Cantidad no válida para «${p.nombre}».`);
    if (typeof p.stock === 'number' && cantidad > p.stock) {
      throw new Error(p.stock === 0 ? `«${p.nombre}» está agotado.` : `Solo quedan ${p.stock} unidades de «${p.nombre}».`);
    }
    let variante = null;
    if (p.variantes) {
      variante = String(it.variante || '');
      if (!p.variantes.opciones.includes(variante)) throw new Error(`Elige ${p.variantes.nombre.toLowerCase()} para «${p.nombre}».`);
    }
    const unit = toCents(p.precio);
    if (!(unit > 0)) throw new Error(`Precio no válido para «${p.nombre}».`);
    lineas.push({ producto: p, variante, cantidad, unit });
  }
  return lineas;
}

export function siteOrigin(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  return new URL(request.url).origin;
}
