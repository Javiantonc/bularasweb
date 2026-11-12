# Web de Padel Bularas · v2 (con tienda online y pagos)

Web estática + 3 funciones de servidor para cobrar con **Stripe**. Pensada para **Vercel**.

```
datos.json            ← datos del club (teléfono, horarios, precios "desde", URLs)
data/productos.json   ← CATÁLOGO DE LA TIENDA (nombre, precio, foto, tallas, stock)
build.py              ← genera la web en dist/ (incluida una página por producto)
api/checkout.js       ← crea el pago en Stripe (recalcula precios en el servidor)
api/pedido.js         ← resumen del pedido en la página de "gracias"
api/stripe-webhook.js ← Stripe avisa de cada pago → email al club (opcional)
src/                  ← estilos, scripts, imágenes, fuentes, cabecera/pie y páginas
tests/                ← pruebas automáticas de la tienda (npm test)
vercel.json           ← configuración de Vercel
dev-server.mjs        ← servidor local para probar todo (npm run dev)
```

## 1. Publicar en Vercel (10 minutos)
1. Sube esta carpeta a un repositorio de GitHub (o usa `npx vercel` desde la carpeta).
2. En vercel.com › **Add New › Project** › importa el repositorio. No cambies nada: `vercel.json` ya indica que la web está en `dist/`.
3. **Settings › Environment Variables**, añade:
   | Variable | Valor |
   |---|---|
   | `STRIPE_SECRET_KEY` | La clave secreta de Stripe (`sk_test_…` para probar, `sk_live_…` para cobrar de verdad) |
   | `STRIPE_WEBHOOK_SECRET` | El "Signing secret" del webhook (paso 2.3) |
   | `SITE_URL` | `https://padelbularas.com` (sin barra final) |
   | `PEDIDOS_EMAIL` *(opcional)* | Email(s) del club que recibe cada pedido, separados por comas |
   | `RESEND_API_KEY` *(opcional)* | Clave de resend.com para enviar ese email |
4. **Redeploy**. Después, en **Settings › Domains** añade `padelbularas.com` y cambia los DNS donde lo indique Vercel.

## 2. Activar Stripe
1. Crea la cuenta del club en dashboard.stripe.com (datos fiscales de Pozuelo Pádel Sport S.L. y cuenta bancaria).
2. **Desarrolladores › Claves de API** → copia la clave secreta a `STRIPE_SECRET_KEY` en Vercel.
3. **Desarrolladores › Webhooks › Añadir endpoint**: `https://padelbularas.com/api/stripe-webhook`, evento `checkout.session.completed` → copia el *Signing secret* a `STRIPE_WEBHOOK_SECRET`.
4. **Configuración › Emails de clientes**: activa "Pagos correctos" para que el cliente reciba su recibo.
5. **Configuración › Métodos de pago**: activa tarjetas, Apple Pay y Google Pay.

**Probar antes de cobrar:** con una clave `sk_test_…`, paga con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. Los productos de ejemplo solo se pueden comprar en modo test; en modo real se bloquean automáticamente.

Los pedidos aparecen en Stripe › **Pagos**, con nombre, teléfono, artículos, tallas y "Recogida en el club".

## 3. Subir los productos reales
Edita `data/productos.json` (uno por bloque) y pon la foto en `src/img/tienda/`:
```json
{
  "id": "pala-head-delta",            ← sin espacios ni tildes; es la URL /tienda/pala-head-delta/
  "nombre": "Pala HEAD Delta Pro",
  "categoria": "Palas",               ← una de "categorias"
  "precio": 199.90,                   ← euros, IVA incluido
  "precio_anterior": 229.90,          ← opcional: muestra el descuento
  "imagen": "tienda/head-delta.webp", ← cuadrada, 1000×1000, WebP o JPG
  "descripcion": "…",
  "detalles": ["Forma diamante", "360 g"],
  "variantes": { "nombre": "Talla", "opciones": ["S","M","L"] },   ← opcional
  "stock": 5,                         ← 0 = agotado
  "destacado": true                   ← aparece en la home
}
```
Borra los productos con `"ejemplo": true` y ejecuta `python3 build.py`. (El stock no se descuenta solo: actualízalo al vender.)

## 4. Cambiar datos, textos, colores y fotos
- **Datos del club:** `datos.json` → `python3 build.py`.
- **Textos:** `src/pages/…/index.html` (el bloque `<!-- title / description -->` es el SEO de cada página).
- **Colores y fuentes:** variables al principio de `src/css/styles.css` (`--ink`, `--navy`, `--blue`, `--ball`).
- **Fotos:** WebP de ~1600 px en `src/img/`; sustituye los huecos `{{PH:…}}` por `<img src="{{ROOT}}img/foto.webp" alt="…" loading="lazy">`.

## 5. Probar en local
```
npm install
python3 build.py
STRIPE_SECRET_KEY=sk_test_xxx SITE_URL=http://localhost:3000 npm run dev   → http://localhost:3000
npm test        ← 12 pruebas de la API (precios manipulados, stock, tallas, webhook firmado…)
```

## Seguridad
- El navegador solo envía id, talla y cantidad; **el precio lo pone el servidor** desde `data/productos.json`.
- Los datos de tarjeta nunca pasan por la web: el pago se hace en la pasarela de Stripe.
- El webhook verifica la firma de Stripe.
- Banner de cookies RGPD; Google Maps solo se carga si el usuario lo pide; fuentes alojadas en la propia web.
