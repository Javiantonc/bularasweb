/* =========================================================
   PADEL BULARAS · Interacciones
   Sin dependencias. Cada bloque es independiente.
   ========================================================= */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Header: fondo sólido al hacer scroll ---------- */
  var header = $('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Carrusel del hero (fundido + zoom lento) ---------- */
  var slides = $$('.hero-slide');
  if (slides.length > 1) {
    var dots = $$('.hero-dot'), cur = 0, timer;
    var go = function (n) {
      slides[cur].classList.remove('is-active'); if (dots[cur]) dots[cur].classList.remove('is-active');
      cur = (n + slides.length) % slides.length;
      slides[cur].classList.add('is-active');
      if (dots[cur]) { dots[cur].classList.remove('is-active'); void dots[cur].offsetWidth; dots[cur].classList.add('is-active'); }
    };
    var play = function () { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 6000); };
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); play(); }); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) play();
  }

  /* ---------- Menú móvil ---------- */
  var toggle = $('[data-menu-toggle]');
  var nav = $('[data-nav]');
  function closeMenu() {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    nav.classList.remove('is-open');
    doc.body.classList.remove('menu-open');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Abrir menú' : 'Cerrar menú');
      nav.classList.toggle('is-open', !open);
      doc.body.classList.toggle('menu-open', !open);
      if (header) header.classList.toggle('is-scrolled', !open || window.scrollY > 40);
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) closeMenu(); });
  }

  /* ---------- Desplegable de Tarifas (click + teclado) ---------- */
  $$('[data-dropdown]').forEach(function (dd) {
    var btn = $('.dropdown-toggle', dd);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    dd.addEventListener('focusout', function (e) {
      if (!dd.contains(e.relatedTarget) && window.innerWidth > 1024) {
        dd.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
      }
    });
  });
  doc.addEventListener('click', function (e) {
    $$('[data-dropdown].is-open').forEach(function (dd) {
      if (!dd.contains(e.target) && window.innerWidth > 1024) {
        dd.classList.remove('is-open'); $('.dropdown-toggle', dd).setAttribute('aria-expanded', 'false');
      }
    });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('[data-dropdown].is-open').forEach(function (dd) {
      dd.classList.remove('is-open');
      var b = $('.dropdown-toggle', dd); b.setAttribute('aria-expanded', 'false'); b.focus();
    });
    if (nav && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
  });

  /* ---------- Aparición suave al hacer scroll ---------- */
  var revealEls = $$('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Pestañas (tablas de precios) ---------- */
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        doc.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { var nt = tabs[(i + n + tabs.length) % tabs.length]; select(nt); nt.focus(); }
      });
    });
  });

  /* ---------- Formularios ----------
     Si el <form> tiene data-endpoint (p. ej. Formspree), se envía allí.
     Si no, el mensaje se prepara para enviarlo por WhatsApp al club. */
  $$('form[data-form]').forEach(function (form) {
    var status = $('.form-status', form);
    function setError(field, msg) {
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      var err = doc.getElementById(field.id + '-error');
      if (err) err.textContent = msg || '';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, first = null;
      $$('[required]', form).forEach(function (f) {
        var msg = '';
        if (f.type === 'checkbox' && !f.checked) msg = 'Necesitamos que aceptes la política de privacidad.';
        else if (f.type !== 'checkbox' && !f.value.trim()) msg = 'Este campo es obligatorio.';
        else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value)) msg = 'Revisa el email.';
        setError(f, msg);
        if (msg) { ok = false; first = first || f; }
      });
      if (!ok) { first.focus(); return; }

      var data = new FormData(form);
      var endpoint = form.getAttribute('data-endpoint');
      status.hidden = false;

      if (endpoint) {
        status.className = 'form-status'; status.textContent = 'Enviando…';
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(); form.reset(); status.className = 'form-status ok'; status.textContent = '¡Gracias! Te respondemos en menos de 24 h.'; })
          .catch(function () { status.className = 'form-status err'; status.textContent = 'No se ha podido enviar. Escríbenos por WhatsApp o llámanos.'; });
        return;
      }

      var lines = ['Hola Padel Bularas, os escribo desde la web.'];
      ['nombre', 'email', 'telefono', 'motivo', 'mensaje'].forEach(function (k) {
        var v = data.get(k); if (v) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + v);
      });
      var url = 'https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(lines.join('\n'));
      status.className = 'form-status ok';
      status.innerHTML = 'Mensaje listo. <a href="' + url + '" target="_blank" rel="noopener">Pulsa aquí para enviarlo por WhatsApp</a> y te respondemos enseguida.';
    });
  });

  /* ---------- Cookies (RGPD): Aceptar · Rechazar · Configurar ---------- */
  var KEY = 'pb_cookies_v1';
  var banner = $('[data-cookie-banner]');
  var modal = $('[data-cookie-modal]');
  function saved() { try { return JSON.parse(store.get(KEY)); } catch (e) { return null; } }
  function save(prefs) {
    prefs.fecha = new Date().toISOString();
    store.set(KEY, JSON.stringify(prefs));
    if (banner) banner.hidden = true;
    if (modal) modal.hidden = true;
    applyConsent(prefs);
  }
  function applyConsent(prefs) {
    // Aquí se cargarían los scripts opcionales SOLO si hay consentimiento:
    // if (prefs.analitica) { cargar Google Analytics… }
    doc.documentElement.dataset.cookiesAnalitica = prefs.analitica ? 'si' : 'no';
  }
  function openModal() {
    var p = saved() || {};
    $$('[data-cookie-cat]', modal).forEach(function (c) { c.checked = !!p[c.dataset.cookieCat]; });
    modal.hidden = false;
    var first = $('input:not([disabled]), button', modal); if (first) first.focus();
  }
  if (banner && modal) {
    var current = saved();
    if (current) applyConsent(current); else banner.hidden = false;
    $$('[data-cookie-accept]').forEach(function (b) { b.addEventListener('click', function () { save({ analitica: true, marketing: true }); }); });
    $$('[data-cookie-reject]').forEach(function (b) { b.addEventListener('click', function () { save({ analitica: false, marketing: false }); }); });
    $$('[data-cookie-config], [data-cookie-settings]').forEach(function (b) { b.addEventListener('click', openModal); });
    $('[data-cookie-save]').addEventListener('click', function () {
      var p = {}; $$('[data-cookie-cat]', modal).forEach(function (c) { p[c.dataset.cookieCat] = c.checked; }); save(p);
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
    modal.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.hidden = true; });
  }

  /* ---------- Mapa: Google Maps solo se carga si el usuario lo pide
     (Google instala cookies; así no hace falta consentimiento previo) ---------- */
  $$('[data-map-load]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var box = btn.closest('[data-map]');
      var f = doc.createElement('iframe');
      f.src = box.getAttribute('data-src');
      f.title = 'Mapa de Google con la ubicación de Padel Bularas';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.appendChild(f);
      btn.remove();
    });
  });

  /* ---------- Volver arriba ---------- */
  $$('a[href="#top"]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  });
})();
