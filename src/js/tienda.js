/* =========================================================
   PADEL BULARAS · Tienda: carrito, filtros, ficha y checkout
   Los productos llegan en window.PB_PRODUCTS (js/productos.js, generado por build.py).
   El carrito se guarda en el navegador (localStorage). Los precios se recalculan
   SIEMPRE en el servidor (api/checkout.js) antes de cobrar.
   ========================================================= */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var DATA = window.PB_PRODUCTS || { productos: [] };
  var ROOT = window.PB_ROOT || '';
  var WA = window.PB_WA || '';
  var byId = {};
  DATA.productos.forEach(function (p) { byId[p.id] = p; });
  var KEY = 'pb_cart_v1';
  var memory = [];

  var eur = function (n) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var img = function (p) { return ROOT + 'img/' + p.imagen; };
  var url = function (p) { return ROOT + 'tienda/' + p.id + '/index.html'; };

  /* ---------- Almacenamiento del carrito ---------- */
  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return memory; }
  }
  function write(items) {
    memory = items;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    render();
  }
  function lines() {
    return read().filter(function (it) { return byId[it.id]; }).map(function (it) {
      var p = byId[it.id];
      return { item: it, p: p, subtotal: p.precio * it.cantidad };
    });
  }
  function total() { return lines().reduce(function (s, l) { return s + l.subtotal; }, 0); }
  function count() { return read().reduce(function (s, it) { return s + it.cantidad; }, 0); }

  function add(id, variante, cantidad) {
    var p = byId[id]; if (!p) return;
    var items = read();
    var found = items.filter(function (it) { return it.id === id && (it.variante || '') === (variante || ''); })[0];
    var max = Math.min(10, typeof p.stock === 'number' ? p.stock : 10);
    if (found) found.cantidad = Math.min(max, found.cantidad + cantidad);
    else items.push({ id: id, variante: variante || '', cantidad: Math.min(max, cantidad) });
    write(items);
    var c = $('[data-cart-count]'); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    toast('«' + p.nombre + '»' + (variante ? ' (' + variante + ')' : '') + ' añadido al carrito', true);
  }
  function setQty(idx, q) {
    var items = read(); if (!items[idx]) return;
    var p = byId[items[idx].id];
    var max = Math.min(10, p && typeof p.stock === 'number' ? p.stock : 10);
    if (q <= 0) items.splice(idx, 1); else items[idx].cantidad = Math.min(max, q);
    write(items);
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg, withCart) {
    var t = $('[data-toast]'); if (!t) return;
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg><span>' + esc(msg) + '</span>' + (withCart ? '<button type="button" data-cart-open>Ver carrito</button>' : '');
    t.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-visible'); }, 3800);
  }

  /* ---------- Render: contador, carrito lateral y página de carrito ---------- */
  function qtyControl(i, q) {
    return '<div class="qty qty--sm"><button type="button" data-qty="' + i + '" data-d="-1" aria-label="Quitar una unidad">−</button>' +
      '<input type="number" value="' + q + '" min="1" max="10" data-qty-input="' + i + '" aria-label="Cantidad">' +
      '<button type="button" data-qty="' + i + '" data-d="1" aria-label="Añadir una unidad">+</button></div>';
  }
  var emptyHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><p>Tu carrito está vacío.</p><a class="btn btn-primary btn-sm" href="' + ROOT + 'tienda/index.html">Ir a la tienda</a></div>';

  function render() {
    var n = count(), ls = lines(), tot = total();
    $$('[data-cart-count]').forEach(function (c) { c.textContent = n; c.classList.toggle('has-items', n > 0); });
    $$('[data-cart-open]').forEach(function (b) { if (b.classList.contains('icon-btn')) b.setAttribute('aria-label', 'Abrir carrito (' + n + ' artículos)'); });

    var box = $('[data-cart-items]'), foot = $('[data-cart-foot]');
    if (box) {
      box.innerHTML = ls.length ? ls.map(function (l, i) {
        return '<div class="cart-item"><img src="' + img(l.p) + '" alt="" width="72" height="72">' +
          '<div><h3><a href="' + url(l.p) + '">' + esc(l.p.nombre) + '</a></h3><div class="meta">' + (l.item.variante ? esc((l.p.variantes || {}).nombre || 'Opción') + ': ' + esc(l.item.variante) + ' · ' : '') + eur(l.p.precio) + '</div>' + qtyControl(i, l.item.cantidad) + '</div>' +
          '<div><div class="line-price">' + eur(l.subtotal) + '</div><button class="cart-remove" type="button" data-remove="' + i + '">Eliminar</button></div></div>';
      }).join('') : emptyHTML;
      if (foot) foot.hidden = !ls.length;
      $$('[data-cart-total]').forEach(function (t) { t.textContent = eur(tot); });
    }

    var page = $('[data-cart-page]');
    if (page) {
      var wrap = $('[data-checkout]');
      if (!ls.length) { page.innerHTML = emptyHTML; if (wrap) wrap.hidden = true; return; }
      if (wrap) wrap.hidden = false;
      page.innerHTML = '<table class="cart-table"><thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Total</th></tr></thead><tbody>' +
        ls.map(function (l, i) {
          return '<tr><td class="prod-cell"><div class="prod"><img src="' + img(l.p) + '" alt="" width="64" height="64"><div><a href="' + url(l.p) + '"><strong>' + esc(l.p.nombre) + '</strong></a><div class="muted" style="font-size:.85rem">' + (l.item.variante ? esc((l.p.variantes || {}).nombre) + ': ' + esc(l.item.variante) + ' · ' : '') + eur(l.p.precio) + '</div><button class="cart-remove" style="margin:0" type="button" data-remove="' + i + '">Eliminar</button></div></div></td>' +
            '<td>' + qtyControl(i, l.item.cantidad) + '</td><td><strong>' + eur(l.subtotal) + '</strong></td></tr>';
        }).join('') + '</tbody></table>';
      var sum = $('[data-summary-lines]');
      if (sum) sum.innerHTML = ls.map(function (l) { return '<div class="summary-row"><span>' + l.item.cantidad + ' × ' + esc(l.p.nombre) + (l.item.variante ? ' (' + esc(l.item.variante) + ')' : '') + '</span><span>' + eur(l.subtotal) + '</span></div>'; }).join('') +
        '<div class="summary-row"><span>Recogida en el club</span><span>Gratis</span></div>';
    }
  }

  /* ---------- Carrito lateral: abrir/cerrar ---------- */
  var drawer = $('[data-cart-drawer]'), lastFocus;
  function openCart() {
    if (!drawer) return; lastFocus = doc.activeElement;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); doc.body.style.overflow = 'hidden';
    var c = $('.cart-close', drawer); if (c) c.focus();
  }
  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); doc.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  doc.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cart-open],[data-cart-close],[data-remove],[data-qty],[data-add]');
    if (!t) return;
    if (t.hasAttribute('data-cart-open')) { e.preventDefault(); if ($('[data-cart-page]')) return; openCart(); }
    else if (t.hasAttribute('data-cart-close')) closeCart();
    else if (t.hasAttribute('data-remove')) setQty(+t.getAttribute('data-remove'), 0);
    else if (t.hasAttribute('data-qty')) { var i = +t.getAttribute('data-qty'); var it = read()[i]; if (it) setQty(i, it.cantidad + (+t.getAttribute('data-d'))); }
    else if (t.hasAttribute('data-add')) {
      var p = byId[t.getAttribute('data-add')];
      if (p && p.variantes) { location.href = url(p); return; } // con talla: ir a la ficha
      add(t.getAttribute('data-add'), '', 1);
    }
  });
  doc.addEventListener('change', function (e) {
    var t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-qty-input')) return;
    setQty(+t.getAttribute('data-qty-input'), Math.max(0, parseInt(t.value, 10) || 0));
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeCart(); });

  /* ---------- Catálogo: filtros por categoría y orden ---------- */
  var grid = $('[data-products]');
  if (grid) {
    var cards = $$('.product-card', grid), cat = 'Todas';
    var sortSel = $('[data-sort]');
    var apply = function () {
      var shown = cards.filter(function (c) { var ok = cat === 'Todas' || c.dataset.cat === cat; c.hidden = !ok; return ok; });
      var mode = sortSel ? sortSel.value : 'destacados';
      shown.sort(function (a, b) {
        if (mode === 'precio-asc') return a.dataset.price - b.dataset.price;
        if (mode === 'precio-desc') return b.dataset.price - a.dataset.price;
        return a.dataset.order - b.dataset.order;
      }).forEach(function (c) { grid.appendChild(c); });
      var n = $('[data-results]'); if (n) n.textContent = shown.length + (shown.length === 1 ? ' producto' : ' productos');
    };
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        cat = b.getAttribute('data-filter');
        $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      });
    });
    if (sortSel) sortSel.addEventListener('change', apply);
    var h = decodeURIComponent((location.hash || '').slice(1));
    var pre = $$('[data-filter]').filter(function (b) { return b.getAttribute('data-filter').toLowerCase() === h.toLowerCase(); })[0];
    if (pre) pre.click(); else apply();
  }

  /* ---------- Ficha de producto ---------- */
  var buy = $('[data-buy]');
  if (buy) {
    var pid = buy.getAttribute('data-buy'), qIn = $('[data-buy-qty]', buy), err = $('[data-buy-error]', buy);
    $$('[data-step]', buy).forEach(function (b) {
      b.addEventListener('click', function () { qIn.value = Math.max(1, Math.min(+qIn.max || 10, (+qIn.value || 1) + (+b.getAttribute('data-step')))); });
    });
    buy.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('input[name="variante"]:checked', buy);
      if ($('input[name="variante"]', buy) && !v) { err.textContent = 'Elige una talla.'; $('input[name="variante"]:not(:disabled)', buy).focus(); return; }
      err.textContent = '';
      add(pid, v ? v.value : '', Math.max(1, parseInt(qIn.value, 10) || 1));
    });
  }

  /* ---------- Checkout: pago con Stripe ---------- */
  var co = $('form[data-checkout-form]');
  if (co) {
    if (/cancelado=1/.test(location.search)) {
      var s0 = $('.form-status', co); s0.hidden = false; s0.className = 'form-status err'; s0.textContent = 'Has cancelado el pago. Tu carrito sigue aquí cuando quieras terminar.';
    }
    co.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = $('.form-status', co), btn = $('button[type="submit"]', co);
      var bad = null;
      $$('[required]', co).forEach(function (f) {
        var m = '';
        if (f.type === 'checkbox' && !f.checked) m = 'Debes aceptar las condiciones de venta.';
        else if (f.type !== 'checkbox' && !f.value.trim()) m = 'Este campo es obligatorio.';
        else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) m = 'Revisa el email.';
        f.setAttribute('aria-invalid', m ? 'true' : 'false');
        var er = doc.getElementById(f.id + '-error'); if (er) er.textContent = m;
        if (m && !bad) bad = f;
      });
      if (bad) { bad.focus(); return; }
      if (!read().length) return;
      var fd = new FormData(co);
      var payload = {
        items: read().map(function (it) { return { id: it.id, variante: it.variante, cantidad: it.cantidad }; }),
        cliente: { nombre: fd.get('nombre'), email: fd.get('email'), telefono: fd.get('telefono') },
        acepta: fd.get('acepta') === 'on'
      };
      btn.disabled = true; var label = btn.innerHTML; btn.textContent = 'Conectando con el pago seguro…';
      st.hidden = true;
      var fallback = function (msg) {
        var resumen = lines().map(function (l) { return l.item.cantidad + 'x ' + l.p.nombre + (l.item.variante ? ' (' + l.item.variante + ')' : ''); }).join(', ');
        var wa = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hola Padel Bularas, quiero reservar este pedido de la tienda: ' + resumen + '. Total: ' + eur(total()) + '. Nombre: ' + payload.cliente.nombre);
        st.hidden = false; st.className = 'form-status err';
        st.innerHTML = esc(msg) + ' <a href="' + wa + '" target="_blank" rel="noopener">Reservar el pedido por WhatsApp</a>.';
        btn.disabled = false; btn.innerHTML = label;
      };
      fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok && res.d.url) { location.href = res.d.url; return; }
          fallback(res.d.error || 'El pago online no está disponible en esta versión de la web.');
        })
        .catch(function () { fallback('El pago online solo funciona en la web publicada.'); });
    });
  }

  /* Borrar el error de un campo en cuanto se corrige */
  doc.addEventListener('input', function (e) {
    var f = e.target; if (!f.getAttribute || f.getAttribute('aria-invalid') !== 'true') return;
    f.setAttribute('aria-invalid', 'false'); var er = doc.getElementById(f.id + '-error'); if (er) er.textContent = '';
  });
  doc.addEventListener('change', function (e) {
    var f = e.target; if (f.type !== 'checkbox' || f.getAttribute('aria-invalid') !== 'true' || !f.checked) return;
    f.setAttribute('aria-invalid', 'false'); var er = doc.getElementById(f.id + '-error'); if (er) er.textContent = '';
  });

  /* ---------- Pedido confirmado ---------- */
  var ok = $('[data-order]');
  if (ok) {
    var sid = new URLSearchParams(location.search).get('session_id');
    if (sid) {
      write([]); // pago completado: vaciamos el carrito
      fetch('/api/pedido?session_id=' + encodeURIComponent(sid)).then(function (r) { return r.json(); }).then(function (d) {
        if (d.error) return;
        ok.innerHTML = '<div class="info-card" style="text-align:left"><h3>Pedido ' + esc(d.referencia) + '</h3>' +
          d.lineas.map(function (l) { return '<div class="summary-row"><span>' + l.cantidad + ' × ' + esc(l.nombre) + '</span><span>' + eur(l.importe) + '</span></div>'; }).join('') +
          '<div class="summary-row summary-row--total"><span>Total pagado</span><strong>' + eur(d.total) + '</strong></div>' +
          '<p class="muted" style="margin:1rem 0 0">Te hemos enviado el recibo a <strong>' + esc(d.email) + '</strong>.</p></div>';
      }).catch(function () {});
    }
  }

  render();
})();
