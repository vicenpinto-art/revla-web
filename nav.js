(function () {

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = `
    nav {
      position: fixed; top: 0; width: 100%; z-index: 100;
      padding: 18px 40px;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(161,131,255,0.15);
      transition: box-shadow .3s;
    }
    nav.scrolled { box-shadow: 0 2px 24px rgba(161,131,255,0.12); }
    .nav-logo { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; letter-spacing: 0.04em; text-decoration: none; color: var(--black); }
    .nav-logo em { font-style: italic; color: var(--lila); }
    nav ul { list-style: none; display: flex; gap: 32px; align-items: center; }
    nav ul a { text-decoration: none; color: var(--gray); font-size: 14px; font-weight: 500; letter-spacing: 0.3px; transition: color .2s; }
    nav ul a:hover, nav ul a.active { color: var(--lila); }
    .nav-cta { background: var(--lila) !important; color: #fff !important; padding: 10px 22px; border-radius: 100px; font-weight: 600 !important; transition: transform .2s, box-shadow .2s !important; }
    .nav-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(161,131,255,.45) !important; }
    .nav-mobile-bar { display: none; align-items: center; gap: 10px; }
    .nav-menu-btn { background: none; border: 1.5px solid rgba(0,0,0,.12); border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 18px; color: #333; }
    .nav-cart-btn { position:relative; background:none; border:1.5px solid var(--lila-pale); cursor:pointer; display:inline-flex; align-items:center; gap:6px; color:var(--black); font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; padding:8px 16px; border-radius:100px; transition:all .2s; }
    .nav-cart-btn:hover { border-color:var(--lila); color:var(--lila); }
    .cart-count { background:var(--lila); color:white; font-size:11px; font-weight:700; width:18px; height:18px; border-radius:50%; display:none; align-items:center; justify-content:center; position:absolute; top:-6px; right:-6px; }
    .cart-count.visible { display:flex; }
    @media (max-width: 768px) {
      nav ul { display: none; }
      nav ul.nav-open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: white; padding: 16px; border-bottom: 1px solid var(--lila-pale); gap: 0; }
      nav ul.nav-open a { display: block; padding: 12px 16px; font-size: 15px; border-bottom: 1px solid rgba(0,0,0,.05); }
      .nav-mobile-bar { display: flex; }
      nav { padding: 14px 20px; }
    }

    /* CARRITO */
    .cart-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:300; opacity:0; pointer-events:none; transition:opacity .3s; }
    .cart-overlay.open { opacity:1; pointer-events:all; }
    .cart-panel { position:fixed; top:0; right:0; bottom:0; width:400px; max-width:100vw; background:white; z-index:301; display:flex; flex-direction:column; transform:translateX(100%); transition:transform .35s cubic-bezier(0.25,0.46,0.45,0.94); box-shadow:-8px 0 48px rgba(0,0,0,.12); }
    .cart-panel.open { transform:translateX(0); }
    .cart-header { padding:24px 28px; border-bottom:1px solid var(--lila-pale); display:flex; align-items:center; justify-content:space-between; }
    .cart-header h3 { font-family:'Playfair Display',serif; font-size:22px; font-style:italic; }
    .cart-close { background:var(--lila-ghost); border:none; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
    .cart-close svg { width:16px; height:16px; stroke:var(--black); }
    .cart-items { flex:1; overflow-y:auto; padding:24px 28px; display:flex; flex-direction:column; gap:20px; }
    .cart-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--gray); text-align:center; padding:40px; }
    .cart-empty .empty-icon { width:64px; height:64px; border-radius:50%; background:var(--lila-ghost); display:flex; align-items:center; justify-content:center; margin-bottom:8px; }
    .cart-empty h4 { font-family:'Playfair Display',serif; font-size:20px; font-style:italic; color:var(--black); }
    .cart-empty p { font-size:14px; line-height:1.6; }
    .cart-item { display:flex; gap:16px; align-items:flex-start; }
    .cart-item-img { width:72px; height:90px; border-radius:10px; background:var(--nude); flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .cart-item-info { flex:1; }
    .ci-sub { font-size:11px; color:var(--gray); text-transform:uppercase; letter-spacing:.05em; }
    .ci-name { font-weight:600; font-size:14px; margin-top:2px; }
    .ci-talla { font-size:12px; color:var(--gray); margin-top:2px; }
    .cart-item-bottom { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; }
    .ci-price { font-weight:700; font-size:14px; }
    .ci-qty { display:flex; align-items:center; gap:8px; }
    .ci-qty button { width:26px; height:26px; border-radius:50%; border:1px solid var(--lila-pale); background:none; cursor:pointer; font-size:14px; color:var(--black); }
    .ci-qty span { font-size:14px; font-weight:600; min-width:16px; text-align:center; }
    .ci-remove { background:none; border:none; cursor:pointer; color:var(--gray); font-size:18px; line-height:1; padding:0 4px; }
    .cart-footer { padding:24px 28px; border-top:1px solid var(--lila-pale); }
    .cart-subtotal { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .cart-subtotal span { font-size:14px; color:var(--gray); }
    .cart-subtotal strong { font-size:20px; font-weight:700; }
    .cart-note { font-size:12px; color:var(--gray); margin-bottom:20px; line-height:1.5; }
    .btn-checkout { width:100%; padding:16px; border-radius:100px; background:var(--lila); color:white; border:none; font-family:'Outfit',sans-serif; font-size:15px; font-weight:700; cursor:pointer; transition:transform .2s,box-shadow .2s; }
    .btn-checkout:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(161,131,255,.45); }
    .btn-seguir { width:100%; padding:12px; border-radius:100px; background:transparent; color:var(--gray); border:none; font-family:'Outfit',sans-serif; font-size:14px; font-weight:500; cursor:pointer; margin-top:10px; }

    /* TOAST */
    .toast { position:fixed; bottom:32px; left:50%; transform:translateX(-50%) translateY(20px); background:var(--black); color:white; padding:14px 24px; border-radius:100px; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px; z-index:400; opacity:0; transition:opacity .3s,transform .3s; white-space:nowrap; box-shadow:0 8px 32px rgba(0,0,0,.2); }
    .toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
    .toast-dot { width:8px; height:8px; border-radius:50%; background:var(--lila); flex-shrink:0; }
  `;
  document.head.appendChild(style);

  /* ── Base path (para páginas en subcarpetas) ── */
  // Si la página está en capsula1/, agrega data-base="../" al div nav-root
  // Ejemplo: <div id="nav-root" data-base="../"></div>
  var root = document.getElementById('nav-root');
  var base = root.dataset.base || '';

  /* ── Detectar página activa ── */
  var pagina = window.location.pathname.split('/').pop() || 'index.html';
  var activos = {
    'index-real.html': 'inicio',
    'index.html':      'inicio',
    'colecciones.html':'colecciones',
    'sobre.html':      'sobre',
    'contacto.html':   'contacto',
    'prodshort.html':  'colecciones',
    'prodtop.html':    'colecciones',
    'prodlarg.html':   'colecciones',
    'prodpant.html':   'colecciones',
  };
  var paginaActiva = activos[pagina] || '';

  function activo(key) {
    return paginaActiva === key ? ' class="active"' : '';
  }

  /* ── HTML ── */
  root.innerHTML = `
    <div class="cart-overlay" id="cart-overlay" onclick="cerrarCarrito()"></div>
    <div class="cart-panel" id="cart-panel">
      <div class="cart-header">
        <h3>Mi carrito</h3>
        <button class="cart-close" onclick="cerrarCarrito()">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-footer" id="cart-footer" style="display:none;">
        <div class="cart-subtotal"><span>Subtotal</span><strong id="cart-total">$0</strong></div>
        <p class="cart-note">Envío calculado al finalizar. MercadoPago disponible al lanzamiento.</p>
        <button class="btn-checkout" onclick="irCheckout()">Ir a pagar →</button>
        <button class="btn-seguir" onclick="cerrarCarrito()">← Seguir comprando</button>
      </div>
    </div>
    <div class="toast" id="toast"><span class="toast-dot"></span><span id="toast-msg"></span></div>

    <nav id="main-nav">
      <a href="${base}index-real.html" class="nav-logo">rev<em>la</em></a>
      <ul id="nav-menu">
        <li><a href="${base}index-real.html"${activo('inicio')}>Inicio</a></li>
        <li><a href="${base}colecciones.html"${activo('colecciones')}>Colecciones</a></li>
        <li><a href="${base}sobre.html"${activo('sobre')}>Sobre Revla</a></li>
        <li><a href="${base}contacto.html"${activo('contacto')}>Contacto</a></li>
        <li><a href="${base}login.html" class="nav-cta">Mi cuenta</a></li>
      </ul>
      <div class="nav-mobile-bar">
        <button class="nav-cart-btn" onclick="abrirCarrito()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Carrito<span class="cart-count" id="cart-count-mobile">0</span>
        </button>
        <a href="${base}login.html" style="width:36px;height:36px;border-radius:50%;background:var(--lila-pale);display:inline-flex;align-items:center;justify-content:center;text-decoration:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lila)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </a>
        <button class="nav-menu-btn" onclick="document.getElementById('nav-menu').classList.toggle('nav-open')">☰</button>
      </div>
    </nav>
  `;

  /* ── Nav scroll ── */
  window.addEventListener('scroll', function () {
    var nav = document.getElementById('main-nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  /* ── Cerrar menú mobile al hacer click en link ── */
  document.querySelectorAll('#nav-menu a').forEach(function (a) {
    a.addEventListener('click', function () {
      document.getElementById('nav-menu').classList.remove('nav-open');
    });
  });

  /* ── CARRITO ── */
  window.carrito = JSON.parse(localStorage.getItem('revla-carrito') || '[]');

  window.abrirCarrito = function () {
    document.getElementById('cart-overlay').classList.add('open');
    document.getElementById('cart-panel').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCarrito();
  };

  window.cerrarCarrito = function () {
    document.getElementById('cart-overlay').classList.remove('open');
    document.getElementById('cart-panel').classList.remove('open');
    document.body.style.overflow = '';
  };

  function renderCarrito() {
    var c = document.getElementById('cart-items');
    var f = document.getElementById('cart-footer');
    if (carrito.length === 0) {
      c.innerHTML = '<div class="cart-empty"><div class="empty-icon"><svg width="28" height="28" fill="none" stroke="var(--lila)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><h4>Tu carrito está vacío</h4><p>Explora las cápsulas para agregar prendas.</p></div>';
      f.style.display = 'none';
      return;
    }
    c.innerHTML = carrito.map(function (item, i) {
      return '<div class="cart-item"><div class="cart-item-img"><svg width="24" height="24" fill="none" stroke="var(--lila)" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 9 4-4 4 4 4-4 4 4"/></svg></div><div class="cart-item-info"><p class="ci-sub">' + item.categoria + '</p><p class="ci-name">' + item.nombre + '</p><p class="ci-talla">Talla: ' + item.talla + '</p><div class="cart-item-bottom"><span class="ci-price">' + item.precio + '</span><div class="ci-qty"><button onclick="cambiarCantidad(' + i + ',-1)">-</button><span>' + item.cantidad + '</span><button onclick="cambiarCantidad(' + i + ',1)">+</button></div><button class="ci-remove" onclick="eliminarItem(' + i + ')">×</button></div></div></div>';
    }).join('');
    f.style.display = 'block';
    document.getElementById('cart-total').textContent = calcularTotal();
    actualizarContador();
  }

  function calcularTotal() {
    var t = carrito.reduce(function (s, i) {
      var p = parseInt(i.precio.replace(/\D/g, '')) || 0;
      return s + p * i.cantidad;
    }, 0);
    return t === 0 ? 'Por confirmar' : '$' + t.toLocaleString('es-CL');
  }

  window.cambiarCantidad = function (i, d) {
    carrito[i].cantidad = Math.max(1, carrito[i].cantidad + d);
    guardarCarrito();
    renderCarrito();
  };

  window.eliminarItem = function (i) {
    carrito.splice(i, 1);
    guardarCarrito();
    renderCarrito();
  };

  function guardarCarrito() {
    localStorage.setItem('revla-carrito', JSON.stringify(carrito));
    actualizarContador();
  }

  function actualizarContador() {
    var t = carrito.reduce(function (s, i) { return s + i.cantidad; }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = t;
      el.classList.toggle('visible', t > 0);
    });
  }

  window.irCheckout = function () {
    window.location.href = base + 'checkout.html';
  };

  window.mostrarToast = function (msg) {
    var t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3000);
  };

  actualizarContador();

})();
