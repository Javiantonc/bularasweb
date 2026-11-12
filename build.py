#!/usr/bin/env python3
"""
PADEL BULARAS · Generador de la web estática
---------------------------------------------
Uso:  python3 build.py
Lee:  datos.json (datos del club), src/partials (cabecera y pie),
      src/pages (contenido de cada página), src/css, src/js, src/img
Crea: dist/  -> carpeta lista para subir a cualquier hosting
      (Netlify, Vercel, GitHub Pages, cPanel…)

Sin dependencias: solo Python 3.
"""
import json, re, shutil, urllib.parse
from pathlib import Path

ROOT = Path(__file__).parent
SRC, DIST = ROOT / "src", ROOT / "dist"
DATA = json.loads((ROOT / "datos.json").read_text(encoding="utf-8"))
DATA["WA_URL"] = "https://wa.me/%s?text=%s" % (DATA["WHATSAPP_LINK"], urllib.parse.quote(DATA["WHATSAPP_MENSAJE"]))

# ---------- Iconos reutilizables: {{ICON:nombre}} ----------
I = lambda body: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">%s</svg>' % body
ICONS = {
    "esfuerzo": I('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    "superacion": I('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
    "respeto": I('<path d="M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z"/>'),
    "diversion": I('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>'),
    "familia": I('<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 21v-2a5 5 0 0 1 10 0v2M14 21v-1.5a3.5 3.5 0 0 1 7 0V21"/>'),
    "companerismo": I('<path d="M7 11l3-3 3 2 4-4"/><path d="M2 12l5 5 3-1 4 4 4-4 4-4-6-6"/>'),
    "pista": I('<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M4 12h16M12 6v12M4 6h16M4 18h16"/>'),
    "led": I('<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>'),
    "vestuario": I('<path d="M20.4 18.6L12 11l-8.4 7.6A1 1 0 0 0 4.3 20h15.4a1 1 0 0 0 .7-1.4zM12 11V9a2 2 0 1 0-2-2"/>'),
    "parking": I('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>'),
    "cafe": I('<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v3M10 2v3M14 2v3"/>'),
    "tienda": I('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>'),
    "pala": I('<path d="M12 2c4 0 6.5 2.8 6.5 6.5S16 15 12 15s-6.5-2.8-6.5-6.5S8 2 12 2z"/><path d="M10.5 15h3l-.3 5.5a1.2 1.2 0 0 1-2.4 0z"/><path d="M10 6.5h.01M14 6.5h.01M12 9h.01M10 11h.01M14 11h.01"/>'),
    "wifi": I('<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0M12 20h.01"/>'),
    "accesible": I('<circle cx="12" cy="4" r="2"/><path d="M19 13v-2a7 7 0 0 0-14 0v2M12 6v8l4 6M12 14l-4 6"/>'),
    "pin": I('<path d="M12 22s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
    "telefono": I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    "whatsapp": I('<path d="M3 21l1.6-4.7A9 9 0 1 1 7.7 19.4z"/><path d="M9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1-1.2 1.8.8-.4 1.6c-3.6.3-7.5-3.6-7.2-7.2l1.6-.4.8 1.8z"/>'),
    "email": I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>'),
    "instagram": I('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'),
    "tiktok": I('<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.8 2.3 4.5 5 4.8"/>'),
    "reloj": I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    "trofeo": I('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'),
    "grupo": I('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 10 0v1M13 20v-1a4 4 0 0 1 8 0v1"/>'),
    "nino": I('<circle cx="12" cy="6" r="3"/><path d="M7 21l2-8h6l2 8M5 11l4 2M19 11l-4 2"/>'),
    "sol": I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    "empresa": I('<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18"/>'),
    "camara": I('<path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>'),
    "calendario": I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    "bolsa": I('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6"/>'),
    "linkedin": I('<path d="M6 9v10M6 5.5v.01M10.5 19v-6a3 3 0 0 1 6 0v6M10.5 9v10"/>'),
    "candado": I('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    "check": I('<path d="M5 12l5 5L20 7"/>'),
    "tarjeta": I('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    "devolucion": I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    "objetivo": I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
}

def placeholder(label):
    """Hueco de foto pendiente. Sustitúyelo por <img src=… alt=… loading="lazy">"""
    return '<div class="ph" role="img" aria-label="Foto pendiente: %s">%s<span>Foto pendiente<br>%s</span></div>' % (label, ICONS["camara"], label)


# ---------- Tienda ----------
CATALOGO = json.loads((ROOT / "data/productos.json").read_text(encoding="utf-8"))
PRODUCTOS = CATALOGO["productos"]
def eur(n): return ("%.2f" % n).replace(".", ",") + " €"
def esc(t): return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def product_card(p, i=0):
    agotado = p.get("stock", 1) == 0
    badge = ""
    if agotado: badge = '<span class="badge badge--out">Agotado</span>'
    elif p.get("precio_anterior"): badge = '<span class="badge badge--sale">-%d%%</span>' % round(100 - p["precio"] * 100 / p["precio_anterior"])
    elif p.get("destacado"): badge = '<span class="badge">Top ventas</span>'
    old = '<del>%s</del>' % eur(p["precio_anterior"]) if p.get("precio_anterior") else ""
    if agotado: btn = '<button class="btn btn-ghost-dark btn-sm btn-block add-btn" type="button" disabled>Agotado</button>'
    elif p.get("variantes"): btn = '<a class="btn btn-primary btn-sm btn-block add-btn" href="{{ROOT}}tienda/%s/index.html">Elegir %s</a>' % (p["id"], p["variantes"]["nombre"].lower())
    else: btn = '<button class="btn btn-primary btn-sm btn-block add-btn" type="button" data-add="%s">Añadir al carrito</button>' % p["id"]
    return ('<article class="product-card" data-cat="%s" data-price="%s" data-order="%d">'
            '<a class="product-media" href="{{ROOT}}tienda/%s/index.html" tabindex="-1" aria-hidden="true">%s<img src="{{ROOT}}img/%s" alt="" width="400" height="400" loading="lazy"></a>'
            '<div class="product-body"><span class="product-cat">%s</span><h3 class="product-name"><a href="{{ROOT}}tienda/%s/index.html">%s</a></h3>'
            '<div class="product-price"><strong>%s</strong>%s</div>%s</div></article>') % (
        esc(p["categoria"]), p["precio"], i, p["id"], badge, p["imagen"], esc(p["categoria"]), p["id"], esc(p["nombre"]), eur(p["precio"]), old, btn)

def products_grid(): return "\n".join(product_card(p, i) for i, p in enumerate(PRODUCTOS))
def featured(): return "\n".join(product_card(p, i) for i, p in enumerate([p for p in PRODUCTOS if p.get("destacado")][:4]))
def filters():
    cats = ["Todas"] + CATALOGO.get("categorias", [])
    return "".join('<button class="filter" type="button" data-filter="%s" aria-pressed="%s">%s</button>' % (c, "true" if c == "Todas" else "false", c) for c in cats)

def product_page(p):
    agotado = p.get("stock", 1) == 0
    old = '<del>%s</del>' % eur(p["precio_anterior"]) if p.get("precio_anterior") else ""
    var = ""
    if p.get("variantes"):
        var = '<fieldset class="option-group"><legend>%s</legend><div class="options">%s</div></fieldset>' % (
            esc(p["variantes"]["nombre"]), "".join('<label class="option"><input type="radio" name="variante" value="%s"><span>%s</span></label>' % (esc(o), esc(o)) for o in p["variantes"]["opciones"]))
    detalles = "".join("<li>%s</li>" % esc(d) for d in p.get("detalles", []))
    stock = p.get("stock", 10)
    buy = ('<div class="buy-row"><div class="qty"><button type="button" data-step="-1" aria-label="Menos">−</button><input type="number" value="1" min="1" max="%d" data-buy-qty aria-label="Cantidad"><button type="button" data-step="1" aria-label="Más">+</button></div>'
           '<button class="btn btn-accent btn-arrow" type="submit">Añadir al carrito</button></div><p class="field-error" data-buy-error aria-live="polite"></p>') % min(10, stock)
    if agotado: buy = '<div class="buy-row"><button class="btn btn-ghost-dark" type="button" disabled>Agotado</button><a class="btn btn-primary" href="{{WA_URL}}" target="_blank" rel="noopener">Avísame cuando llegue</a></div>'
    ejemplo = '<p class="demo-note">{{ICON:camara}}<span>Producto de ejemplo para enseñar cómo funciona la tienda. Se sustituirá por el catálogo real.</span></p>' if p.get("ejemplo") else ""
    body = """<section class="page-hero page-hero--short"><div class="container">
<ol class="breadcrumb"><li><a href="{{ROOT}}index.html">Inicio</a></li><li><a href="{{ROOT}}tienda/index.html">Tienda</a></li><li><a href="{{ROOT}}tienda/index.html#%(cat)s">%(cat)s</a></li><li aria-current="page">%(nombre)s</li></ol>
</div></section>
<section class="section section--tight"><div class="container product-detail">
<div class="product-gallery reveal"><img src="{{ROOT}}img/%(img)s" alt="%(nombre)s" width="600" height="600"></div>
<div class="product-info reveal">%(ejemplo)s
<span class="product-cat">%(cat)s</span><h1>%(nombre)s</h1>
<div class="price-big">%(precio)s %(old)s</div>
<p class="lead">%(desc)s</p>
<form data-buy="%(id)s" novalidate>%(var)s%(buy)s</form>
<ul class="perks" role="list"><li>{{ICON:tienda}} Recogida gratis en el club, en {{CIUDAD}}</li><li>{{ICON:candado}} Pago 100 %% seguro con Stripe: tarjeta, Apple Pay y Google Pay</li><li>{{ICON:devolucion}} 14 días para cambios y devoluciones</li></ul>
%(det)s
</div></div></section>
<section class="section section--alt"><div class="container"><div class="section-head section-head--row"><div><span class="eyebrow">También te puede gustar</span><h2>Más del club</h2></div><a class="link-arrow" href="{{ROOT}}tienda/index.html">Ver toda la tienda</a></div>
<div class="products">%(rel)s</div></div></section>""" % dict(
        id=p["id"], cat=esc(p["categoria"]), nombre=esc(p["nombre"]), img=p["imagen"], precio=eur(p["precio"]), old=old, desc=esc(p["descripcion"]),
        var=var, buy=buy, ejemplo=ejemplo, det=('<h2 style="font-size:1.8rem;margin-top:2rem">Detalles</h2><ul class="check-list">%s</ul>' % detalles) if detalles else "",
        rel="".join(product_card(q, i) for i, q in enumerate([q for q in PRODUCTOS if q["id"] != p["id"]][:4])))
    meta = {"title": "%s · Tienda Padel Bularas" % p["nombre"], "description": p["descripcion"][:155], "nav": "tienda"}
    return meta, body

def render(text, ctx):
    # {{INCLUDE:nombre}} inserta src/partials/nombre.html (mapa, formulario…)
    text = re.sub(r"\{\{INCLUDE:([a-z_-]+)\}\}", lambda m: (SRC / "partials" / (m.group(1) + ".html")).read_text(encoding="utf-8"), text)
    text = text.replace("{{PRODUCTS_GRID}}", products_grid()).replace("{{FEATURED_PRODUCTS}}", featured()).replace("{{SHOP_FILTERS}}", filters()).replace("{{NUM_PRODUCTOS}}", str(len(PRODUCTOS)))
    text = re.sub(r"\{\{ICON:([a-z_]+)\}\}", lambda m: ICONS[m.group(1)], text)
    text = re.sub(r"\{\{PH:([^}]+)\}\}", lambda m: placeholder(m.group(1)), text)
    def sub(m):
        k = m.group(1)
        if k in ctx: return str(ctx[k])
        if k in DATA: return str(DATA[k])
        if k.startswith("CUR_"): return ""
        raise KeyError("Variable sin definir: {{%s}}" % k)
    return re.sub(r"\{\{([A-Za-z_]+)\}\}", sub, text)

def parse_page(path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"<!--(.*?)-->\s*", raw, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        k, v = line.split(":", 1); meta[k.strip()] = v.strip()
    return meta, raw[m.end():]

SCHEMA = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "name": DATA["CLUB"],
    "description": "Club de pádel en %s con %s pistas %s, academia, clases particulares, competición y eventos." % (DATA["CIUDAD"], DATA["NUM_PISTAS"], DATA["TIPO_PISTAS"]),
    "url": DATA["URL_WEB"],
    "image": DATA["URL_WEB"] + "/img/og-image.jpg",
    "logo": DATA["URL_WEB"] + "/img/logo-bularas.webp",
    "telephone": DATA["TELEFONO_LINK"],
    "email": DATA["EMAIL"],
    "address": {"@type": "PostalAddress", "streetAddress": DATA["CALLE"], "postalCode": DATA["CP"],
                "addressLocality": DATA["CIUDAD"], "addressRegion": DATA["PROVINCIA"], "addressCountry": "ES"},
    "openingHours": DATA["HORARIO_SCHEMA"],
    "sameAs": [DATA["INSTAGRAM_URL"], DATA["TIKTOK_URL"], DATA["LINKEDIN_URL"]],
    "sport": "Pádel",
    "amenityFeature": [{"@type": "LocationFeatureSpecification", "name": n, "value": True}
                       for n in ["Pistas cubiertas", "Parking gratuito", "Vestuarios", "Cafetería", "Tienda", "WiFi", "Acceso adaptado"]],
}

HEAD = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<meta name="description" content="{{DESCRIPTION}}">
<link rel="canonical" href="{{URL_WEB}}{{CANONICAL}}">
<meta name="theme-color" content="#0B1F3A">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Padel Bularas">
<meta property="og:title" content="{{TITLE}}">
<meta property="og:description" content="{{DESCRIPTION}}">
<meta property="og:url" content="{{URL_WEB}}{{CANONICAL}}">
<meta property="og:image" content="{{URL_WEB}}/img/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="48x48" href="{{ROOT}}img/favicon.png">
<link rel="apple-touch-icon" href="{{ROOT}}img/apple-touch-icon.png">
<link rel="preload" href="{{ROOT}}fonts/bebas-neue.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{{ROOT}}css/styles.css">
{{PRELOAD}}<script>document.documentElement.classList.add('js')</script>
{{SCHEMA_TAG}}</head>
<body id="top">
"""
FOOT = """<script>window.PB_WA = "{{WHATSAPP_LINK}}";</script>
<script src="{{ROOT}}js/productos.js" defer></script>
<script src="{{ROOT}}js/main.js" defer></script>
<script src="{{ROOT}}js/tienda.js" defer></script>
</body>
</html>
"""

def build():
    if DIST.exists(): shutil.rmtree(DIST)
    for d in ("css", "js", "img", "fonts"): shutil.copytree(SRC / d, DIST / d)
    header = (SRC / "partials/header.html").read_text(encoding="utf-8")
    footer = (SRC / "partials/footer.html").read_text(encoding="utf-8")
    # Datos de productos para el navegador (carrito)
    (DIST / "js/productos.js").write_text("window.PB_PRODUCTS = " + json.dumps({"productos": [
        {k: p.get(k) for k in ("id", "nombre", "categoria", "precio", "imagen", "stock", "variantes")} for p in PRODUCTOS]}, ensure_ascii=False) + ";\n", encoding="utf-8")
    pages = []
    for p in sorted((SRC / "pages").rglob("*.html")):
        meta, body = parse_page(p)
        pages.append((p.relative_to(SRC / "pages"), meta, body))
    for prod in PRODUCTOS:  # una página por producto: /tienda/<id>/
        meta, body = product_page(prod)
        meta["schema_product"] = prod
        pages.append((Path("tienda") / prod["id"] / "index.html", meta, body))
    sitemap = []
    for rel, meta, body in pages:
        depth = len(rel.parts) - 1
        canonical = "/" + str(rel).replace("index.html", "")
        ctx = {
            "ROOT": "../" * depth,
            "TITLE": render(meta["title"], {}),
            "DESCRIPTION": render(meta["description"], {}),
            "CANONICAL": canonical,
            "HEADER_CLASS": "site-header--overlay" if meta.get("header") == "overlay" else "",
            "SCHEMA_TAG": '<script type="application/ld+json">%s</script>\n' % json.dumps(SCHEMA, ensure_ascii=False) if meta.get("schema") == "si" else "",
            "PRELOAD": '<link rel="preload" as="image" href="%s%s" fetchpriority="high">\n' % ("../" * depth, meta["preload"]) if meta.get("preload") else "",
        }
        if meta.get("schema_product"):
            pr = meta["schema_product"]
            ctx["SCHEMA_TAG"] = '<script type="application/ld+json">%s</script>\n' % json.dumps({
                "@context": "https://schema.org", "@type": "Product", "name": pr["nombre"], "description": pr["descripcion"],
                "image": DATA["URL_WEB"] + "/img/" + pr["imagen"], "category": pr["categoria"],
                "offers": {"@type": "Offer", "price": "%.2f" % pr["precio"], "priceCurrency": "EUR",
                           "availability": "https://schema.org/" + ("OutOfStock" if pr.get("stock", 1) == 0 else "InStock"),
                           "url": DATA["URL_WEB"] + canonical}}, ensure_ascii=False)
        nav = meta.get("nav", "")
        ctx["CUR_" + nav] = 'aria-current="page"' if nav else ""
        html = render(HEAD + header + '<main id="main">\n' + body + "</main>\n" + footer + FOOT, ctx)
        if html.count("<h1") != 1: print("  ⚠ %s tiene %d H1" % (rel, html.count("<h1")))
        out = DIST / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        sitemap.append(DATA["URL_WEB"] + canonical)
        print("  ✓", rel)
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join("  <url><loc>%s</loc></url>\n" % u for u in sitemap) + "</urlset>\n", encoding="utf-8")
    (DIST / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n" % DATA["URL_WEB"], encoding="utf-8")
    print("Listo: %d páginas en dist/ (%d de producto)" % (len(pages), len(PRODUCTOS)))

if __name__ == "__main__":
    build()
