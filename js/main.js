/* ═══════════════════════════════════════════════════════════════════════════
   La otra bodeguita · «De la copa al tenedor»
   La «I» de su logo puesta en vertical: el rótulo del comedor se enciende en la
   cortina y su luz se hace papel; arriba, la copa con los platos dentro del
   vino; su pie, una línea maciza y recta, baja cosiendo la página hasta el
   tenedor de la carta, cuyos cuatro dientes reparten la carta en cuatro partes
   y se quedan como índice mientras se lee.

   Banderas separadas a propósito:
     gsapReady  → hay motor de animación (GSAP + ScrollTrigger cargados)
     movimiento → además el usuario NO ha pedido reducir el movimiento
   Con movimiento reducido el CONTENIDO sigue (cifras, diente activo, día de
   hoy, la carta, el pie ya dibujado); lo que se apaga es el viaje.

   «La cámara» vive en js/camara.js y «Opiniones» en js/opiniones.js: este
   archivo no depende de ninguno de los dos.
   Todos los trazos que GSAP anima con pathLength="1" llevan autoRound:false.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esTactil = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var gsapReady = !!(window.gsap && window.ScrollTrigger);
  var movimiento = gsapReady && !reduce;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;

  if (gsapReady) gsap.registerPlugin(ST);
  html.classList.add(movimiento ? 'con-movimiento' : 'sin-movimiento');

  var MAPA = 'https://www.google.com/maps?q=La+otra+bodeguita,+C.+L%C3%B3pez+Asme+6,+Zafra&output=embed';

  function $(s, r) { return (r || document).querySelector(s); }
  function todos(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function densidad() { return html.classList.contains('densidad-sobria') ? 'sobria' : 'copa'; }
  function esMovil() { return window.matchMedia('(max-width: 860px)').matches; }
  function alturaCabecera() { var c = $('#cabecera'); return c ? c.offsetHeight : 72; }
  function refrescar() { if (ST) ST.refresh(); }
  function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esperar(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function avisar(nombre, detalle) { document.dispatchEvent(new CustomEvent(nombre, { detail: detalle })); }
  function numeros(s) { return String(s).split(/[\s,]+/).map(Number); }

  function cuandoVisible(nodos, umbral, alEntrar, margen) {
    if (!('IntersectionObserver' in window)) { nodos.forEach(alEntrar); return; }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        alEntrar(en.target);
      });
    }, { threshold: umbral, rootMargin: margen || '0px' });
    nodos.forEach(function (n) { obs.observe(n); });
  }

  var B = window.Bodeguita = window.Bodeguita || {};
  B.densidad = densidad;
  B.movimiento = movimiento;
  B.formaciones = 0;
  B.refrescar = refrescar;

  /* ───────────────────────── Lenis (desde jsDelivr) ───────────────────────── */
  var lenis = null;
  if (movimiento && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  }
  B.lenis = lenis;

  function irA(destino) {
    var desfase = -alturaCabecera() + 1;
    if (destino === 0) { if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo(0, 0); return; }
    if (lenis) { lenis.scrollTo(destino, { offset: desfase, duration: 1.4 }); return; }
    var el = typeof destino === 'string' ? document.querySelector(destino) : destino;
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + desfase);
  }
  B.irA = irA;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('role') === 'tab') return;
    var id = a.getAttribute('href');
    if (id === '#' || !document.querySelector(id)) return;
    e.preventDefault();
    cerrarMenu();
    irA(id === '#inicio' ? 0 : id);
  });

  /* ───────────────────── titulares partidos (char-reveal) ───────────────────── */
  function partir(el) {
    var modo = el.dataset.revelar;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var piezas = [];
    function trocear(cadena, destino) {
      cadena.split(/(\s+)/).forEach(function (trozo) {
        if (!trozo) return;
        if (/^\s+$/.test(trozo)) { destino.appendChild(document.createTextNode(' ')); return; }
        var caja = document.createElement('span');
        caja.className = 'palabra';
        if (modo === 'letras') {
          Array.from(trozo).forEach(function (c) {
            var s = document.createElement('span');
            s.className = 'letra'; s.textContent = c;
            caja.appendChild(s); piezas.push(s);
          });
        } else {
          var s = document.createElement('span');
          s.className = 'palabra-int'; s.textContent = trozo;
          caja.appendChild(s); piezas.push(s);
        }
        destino.appendChild(caja);
      });
    }
    /* recorre la estructura (líneas, <b>, <i>) conservando cada envoltorio */
    function recorrer(origen, destino) {
      Array.prototype.slice.call(origen.childNodes).forEach(function (n) {
        if (n.nodeType === 3) { trocear(n.textContent, destino); return; }
        if (n.nodeType === 1) {
          var copia = n.cloneNode(false);
          destino.appendChild(copia);
          recorrer(n, copia);
        }
      });
    }
    var molde = el.cloneNode(true);
    el.textContent = '';
    recorrer(molde, el);
    todos('*', el).forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });
    return piezas;
  }
  function revelar(el, piezas, retardo) {
    var letras = el.dataset.revelar === 'letras';
    gsap.to(piezas, {
      y: 0, yPercent: 0, duration: 1.1, ease: 'expo.out', delay: retardo || 0,
      stagger: letras ? Math.min(0.026, 1.1 / piezas.length) : 0.06
    });
  }

  /* ─────────────────── la cortina avisa del momento de apertura ─────────────────── */
  var cortinaAbierta = false;
  function avisarApertura() {
    if (cortinaAbierta) return;
    cortinaAbierta = true;
    avisar('cortina-abre');
  }
  function alAbrirse(fn) { if (cortinaAbierta) fn(); else document.addEventListener('cortina-abre', fn, { once: true }); }
  B.alAbrirse = alAbrirse;

  todos('[data-revelar]').forEach(function (el) {
    var piezas = partir(el);
    if (!movimiento) return;
    if (el.closest('.hero')) { alAbrirse(function () { revelar(el, piezas, 0.85); }); return; }
    /* una sola vez: IntersectionObserver (ScrollTrigger once:true no dispara si ya está en pantalla) */
    cuandoVisible([el], 0.3, function () { revelar(el, piezas); });
  });

  /* ═══════════════ cortina: el rótulo se enciende y su luz se hace papel ═══════════════ */
  (function cortina() {
    var cort = $('#cortina');
    var heroLogo = $('#hero-logo');
    var logoHero = $('#logo-hero');
    if (!cort) { avisarApertura(); return; }
    var hecho = false;

    function retirar() {
      if (hecho) return;
      hecho = true;
      avisarApertura();
      if (heroLogo) heroLogo.classList.remove('es-esperando');
      cort.classList.add('es-fuera');
      html.classList.add('cortina-fuera');
      /* con Lenis, lagSmoothing(0) al retirarla, nunca antes */
      if (gsapReady) gsap.ticker.lagSmoothing(0);
      refrescar();
      avisar('cortina-retirada');
    }
    B.retirarCortina = retirar;

    if (!movimiento) {
      /* sin GSAP o con movimiento reducido se retira igual: nunca tapa la página */
      setTimeout(retirar, reduce ? 0 : 60);
      return;
    }

    /* reloj que se traga los atascos: un fotograma de más de 0,1 s cuenta como 1/30 */
    gsap.ticker.lagSmoothing(100, 1000 / 30);

    var rotulo = $('#cortina-rotulo'), panel = $('#cortina-panel');
    var halo = $('#cortina-halo'), luz = $('#cortina-luz'), hojas = $('.cortina__hojas', cort);

    /* la tinta del rótulo es un clon del logo del hero: ids renombrados y url(#…) actualizados */
    var clon = logoHero.cloneNode(true);
    ['id', 'role', 'aria-labelledby'].forEach(function (a) { clon.removeAttribute(a); });
    clon.setAttribute('aria-hidden', 'true');
    clon.setAttribute('class', 'logo-svg rotulo__tinta');
    var titulo = clon.querySelector('title'); if (titulo) titulo.remove();
    var mapa = {};
    todos('[id]', clon).forEach(function (n) { mapa[n.id] = n.id + '-cortina'; n.id = mapa[n.id]; });
    todos('*', clon).forEach(function (n) {
      ['mask', 'clip-path', 'fill', 'filter'].forEach(function (a) {
        var v = n.getAttribute(a);
        if (v && v.indexOf('url(#') === 0) { var id = v.slice(5, -1); if (mapa[id]) n.setAttribute(a, 'url(#' + mapa[id] + ')'); }
      });
    });
    rotulo.appendChild(clon);

    var APAGADO = { '--panel-logo': '#2A2D26', '--tinta-logo': '#10120E', '--contorno-logo': '#0B0C0A' };
    var ENCENDIDO = { '--panel-logo': '#F4F3EE', '--tinta-logo': '#161514', '--contorno-logo': '#161514' };
    var FLOJO = { '--panel-logo': '#C9C9C0', '--tinta-logo': '#161514', '--contorno-logo': '#161514' };

    /* cuánto tiene que crecer el halo para que su núcleo (52 % del radio) cubra la pantalla */
    function cubrir() {
      var W = window.innerWidth, H = window.innerHeight;
      var nucleo = 0.52 * 0.75 * Math.max(W, H);
      return (Math.hypot(W / 2, H / 2) / nucleo) * 1.06;
    }

    var inicio = null;
    var vuelo = { p: 0 };
    function prepararVuelo() {
      inicio = rotulo.getBoundingClientRect();
      panel.style.opacity = '0';
    }
    function volar() {
      if (!inicio) return;
      var t = logoHero.getBoundingClientRect();
      var esc = 1 + (t.width / inicio.width - 1) * vuelo.p;
      var x = (t.left - inicio.left) * vuelo.p, y = (t.top - inicio.top) * vuelo.p;
      rotulo.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + esc.toFixed(4) + ')';
    }
    function aterrizar() {
      /* medida para verificar.mjs: el clon tiene que acabar encima del logo real */
      var a = clon.getBoundingClientRect(), b = logoHero.getBoundingClientRect();
      B.aterrizaje = { dx: Math.abs(a.left - b.left), dy: Math.abs(a.top - b.top), dw: Math.abs(a.width - b.width) };
      heroLogo.classList.remove('es-esperando');
      rotulo.style.opacity = '0';
    }

    var tl = gsap.timeline({ paused: true, onComplete: retirar });
    B.cortina = { get tl() { return tl; } };
    gsap.set(rotulo, APAGADO);

    /* 1 · apagado (0–0,26 s) · 2 · parpadeo: un destello seco y otro largo y flojo */
    tl.addLabel('parpadeo', 0.26)
      .set(rotulo, ENCENDIDO, 0.26).set(halo, { opacity: 0.5, scale: 0.2 }, 0.26).set(luz, { opacity: 0.32 }, 0.26)
      .set(rotulo, APAGADO, 0.31).set(halo, { opacity: 0 }, 0.31).set(luz, { opacity: 0 }, 0.31)
      .set(rotulo, FLOJO, 0.43).set(halo, { opacity: 0.28, scale: 0.18 }, 0.43).set(luz, { opacity: 0.18 }, 0.43)
      .set(rotulo, APAGADO, 0.55).set(halo, { opacity: 0 }, 0.55).set(luz, { opacity: 0 }, 0.55)
    /* 3 · encendido: panel claro, halo cálido detrás y la luz aclara las hojas cercanas */
      .addLabel('encendido', 0.66)
      .call(function () { B.formaciones++; rotulo.classList.add('es-encendido'); }, null, 0.66)
      .to(rotulo, Object.assign({ duration: 0.2, ease: 'power2.out' }, ENCENDIDO), 0.66)
      .fromTo(halo, { opacity: 0, scale: 0.14 }, { opacity: 1, scale: 0.34, duration: 0.6, ease: 'power2.out', immediateRender: false }, 0.66)
      .to(luz, { opacity: 0.9, duration: 0.6, ease: 'power2.out' }, 0.66)
    /* 4 · la luz se hace papel: el halo crece hasta cubrirlo todo de hueso */
      .addLabel('papel', 1.1)
      .call(avisarApertura, null, 1.1)
      .to(halo, { scale: cubrir, duration: 0.95, ease: 'expo.inOut' }, 1.1)
      .to(rotulo, { '--panel-logo': '#F4F1EC', '--contorno-logo': '#F4F1EC', duration: 0.6, ease: 'power1.inOut' }, 1.22)
      .to([hojas, luz], { opacity: 0, duration: 0.6, ease: 'power1.in' }, 1.3)
      .call(function () { cort.classList.add('es-papel'); }, null, 1.95)
    /* 5 · traspaso: la tinta vuela a su sitio en el hero mientras el papel se aclara */
      .call(prepararVuelo, null, 1.86)
      .addLabel('vuelo', 1.86)
      .to(vuelo, { p: 1, duration: 0.62, ease: 'expo.inOut', onUpdate: volar, onComplete: aterrizar }, 1.86)
      .to(halo, { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, 1.98);

    /* arranca enseguida: el rótulo es SVG y no espera a la letra (como mucho 450 ms) */
    var arrancada = false;
    function arrancar() { if (!arrancada) { arrancada = true; tl.play(); } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(arrancar);
    setTimeout(arrancar, 450);

    /* quien empieza a bajar no espera: la cortina acelera, no se corta */
    function prisa() { if (!hecho) tl.timeScale(3); }
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, prisa, { passive: true, once: true }); });

    /* red de seguridad: pase lo que pase, a los 6 s la cortina se va */
    setTimeout(function () { if (!hecho) { if (!B.aterrizaje) aterrizar(); retirar(); } }, 6000);
  })();

  /* ═══════════════ hero: la copa grande, con platos dentro del vino ═══════════════ */
  (function hero() {
    var seccion = $('#inicio'), copaSvg = $('#copa-svg');
    if (!seccion || !copaSvg) return;
    var fotos = todos('.copa__foto', copaSvg), nombre = $('#copa-nombre');
    var actual = 0, temporizador = null;
    function mostrar(i) {
      actual = (i + fotos.length) % fotos.length;
      fotos.forEach(function (f, k) { f.classList.toggle('es-activa', k === actual); });
      /* el nombre cambia a mitad del fundido (1,4 s), cuando ya manda la foto nueva */
      var nuevo = fotos[actual].getAttribute('data-nombre');
      if (nombre) setTimeout(function () { nombre.textContent = nuevo; }, reduce ? 0 : 650);
    }
    /* un plato cada ~4,5 s; con movimiento reducido se queda el primero */
    function programar() {
      clearTimeout(temporizador);
      if (reduce) return;
      temporizador = setTimeout(function () { if (!document.hidden) mostrar(actual + 1); programar(); }, 4500);
    }
    alAbrirse(programar);
    B.copa = { mostrar: mostrar, get actual() { return actual; }, total: fotos.length };

    if (!movimiento) return;
    var resto = todos('.hero__acciones > *, .hero__nota', seccion);
    gsap.set(resto, { opacity: 0, y: 18 });
    alAbrirse(function () {
      gsap.to(resto, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 1.25 });
    });
    /* paralaje suave dentro del clipPath del vino (unidades del viewBox) */
    var caja = numeros(copaSvg.getAttribute('data-caja'));
    gsap.fromTo('#copa-fotos', { y: -caja[3] * 0.025 }, {
      y: caja[3] * 0.035, ease: 'none',
      scrollTrigger: { trigger: seccion, start: 'top top', end: 'bottom top', scrub: true }
    });

    /* las gotas de la salpicadura se mueven 2–4 px con el cursor (sin GSAP; quietas si no se mueve) */
    var gotas = todos('.copa__gota', copaSvg);
    if (esTactil || !gotas.length) return;
    var k = gotas.map(function (g, i) { return 2 + (i * 7 % 5) / 2; });
    var objetivo = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, corriendo = false;
    function paso() {
      pos.x += (objetivo.x - pos.x) * 0.12;
      pos.y += (objetivo.y - pos.y) * 0.12;
      var r = copaSvg.getBoundingClientRect();
      var s = r.width ? caja[2] / r.width : 1;             /* px de pantalla → unidades del viewBox */
      gotas.forEach(function (g, i) {
        g.setAttribute('transform', 'translate(' + (pos.x * k[i] * s).toFixed(2) + ' ' + (pos.y * k[i] * s).toFixed(2) + ')');
      });
      if (Math.abs(objetivo.x - pos.x) > 0.003 || Math.abs(objetivo.y - pos.y) > 0.003) requestAnimationFrame(paso);
      else corriendo = false;
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var r = copaSvg.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      objetivo.x = limitar((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.35), -1, 1);
      objetivo.y = limitar((e.clientY - (r.top + r.height * 0.22)) / (window.innerHeight * 0.35), -1, 1);
      if (!corriendo) { corriendo = true; requestAnimationFrame(paso); }
    });
  })();

  /* ═══════════════ el pie de la copa: de la copa del hero al tenedor de la carta ═══════════════ */
  (function pieCopa() {
    var svg = $('#pie-copa'), path = $('#pie-copa-d'), main = $('#contenido');
    var copaSvg = $('#copa-svg'), ten = $('#tenedor');
    if (!svg || !path || !main || !copaSvg || !ten) return;
    var y0 = 0, y1 = 1, listo = false;

    function construir() {
      listo = false;
      svg.classList.remove('es-listo');
      /* en la sobria y en móvil no recorre la página: la copa conserva su pie corto */
      if (densidad() !== 'copa' || esMovil()) { B.pie = null; return; }
      var m = main.getBoundingClientRect();
      var c = copaSvg.getBoundingClientRect(), cc = numeros(copaSvg.getAttribute('data-caja'));
      var s = c.height / cc[3];
      var px = parseFloat(copaSvg.getAttribute('data-pie-x'));
      var x0 = c.left - m.left + (px - cc[0]) * s;
      y0 = c.bottom - m.top - 1;
      var t = ten.getBoundingClientRect(), tc = numeros(ten.getAttribute('data-caja'));
      var st = t.width / tc[2];
      var x1 = t.left - m.left + (px - tc[0]) * st;
      y1 = t.top - m.top + 1;
      var W = main.clientWidth, H = main.scrollHeight;
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var ancho = parseFloat(copaSvg.getAttribute('data-pie-ancho')) * s;
      path.setAttribute('d', 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'V' + y1.toFixed(1));
      path.style.strokeWidth = ancho.toFixed(2) + 'px';
      B.pie = { x0: x0, x1: x1, y0: y0, y1: y1, ancho: ancho };
      listo = y1 > y0 + 40;
      if (listo) svg.classList.add('es-listo');
      actualizar(true);
    }
    function fraccion() {
      var m = main.getBoundingClientRect();
      var cabeza = window.innerHeight * 0.72 - m.top;
      return limitar((cabeza - y0) / (y1 - y0), 0, 1);
    }
    function actualizar(inmediato) {
      if (!listo) return;
      if (!movimiento) { path.style.strokeDashoffset = '0'; return; }
      var off = 1 - fraccion();
      if (inmediato === true) gsap.set(path, { strokeDashoffset: off });
      else gsap.to(path, { strokeDashoffset: off, duration: 0.5, ease: 'power3.out', overwrite: true, autoRound: false });
    }
    if (lenis) lenis.on('scroll', actualizar);
    else window.addEventListener('scroll', actualizar, { passive: true });
    var reconstruir = esperar(construir, 140);
    window.addEventListener('resize', reconstruir);
    if ('ResizeObserver' in window) new ResizeObserver(reconstruir).observe(main);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reconstruir);
    if (ST) ST.addEventListener('refresh', reconstruir);
    document.addEventListener('densidad-cambiada', reconstruir);
    document.addEventListener('cortina-retirada', reconstruir);
    construir();
    B.pieCopa = { construir: construir, fraccion: fraccion };
  })();

  /* ═══════════════ la carta: el tenedor se posa y sus dientes se abren ═══════════════ */
  var carta = (function () {
    var cab = $('#carta-cabeza'), ten = $('#tenedor'), svg = $('#dientes');
    var lineas = todos('.dientes__linea'), partes = todos('.indice__parte'), indice = $('#indice');
    var caps = todos('.capitulo'), dientes = todos('.carril__diente'), carril = $('#carril');
    var api = { activo: null };
    B.carta = api;
    if (!cab || !ten || !svg) return api;

    function construirDientes() {
      var c = cab.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + c.width.toFixed(1) + ' ' + c.height.toFixed(1));
      svg.setAttribute('width', c.width.toFixed(1)); svg.setAttribute('height', c.height.toFixed(1));
      var t = ten.getBoundingClientRect(), tc = numeros(ten.getAttribute('data-caja'));
      var st = t.width / tc[2];
      var xs = numeros(ten.getAttribute('data-dientes')), punta = parseFloat(ten.getAttribute('data-punta'));
      var yi = indice.getBoundingClientRect().top - c.top;
      lineas.forEach(function (p, i) {
        var x0 = t.left - c.left + (xs[i] - tc[0]) * st, y0 = t.top - c.top + (punta - tc[1]) * st - 1;
        var r = partes[i].getBoundingClientRect();
        var x1 = r.left - c.left + r.width / 2, y1 = yi;
        var dy = (y1 - y0) * 0.55;
        p.setAttribute('d', 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'C' + x0.toFixed(1) + ' ' + (y0 + dy).toFixed(1) + ' ' +
          x1.toFixed(1) + ' ' + (y1 - dy).toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1));
      });
    }
    construirDientes();
    var rehacer = esperar(function () { construirDientes(); }, 140);
    window.addEventListener('resize', rehacer);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rehacer);
    document.addEventListener('densidad-cambiada', rehacer);
    if (ST) ST.addEventListener('refresh', construirDientes);

    if (movimiento) {
      gsap.set(lineas, { strokeDashoffset: 1 });
      var tl = gsap.timeline({ paused: true });
      lineas.forEach(function (p, i) {
        tl.to(p, { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut', autoRound: false }, i * 0.12);
      });
      ST.create({ trigger: cab, start: 'top 60%', end: 'bottom 68%', scrub: 0.6, animation: tl });
      api.dientesTl = tl;
    }

    /* el diente activo: contenido, no movimiento (va con IntersectionObserver, también sin GSAP) */
    function activar(id) {
      api.activo = id;
      dientes.forEach(function (b) {
        var es = b.getAttribute('data-parte') === id;
        b.classList.toggle('es-activo', es);
        if (es) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }
    activar('entrantes');
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) activar(x.target.getAttribute('data-parte')); });
      }, { rootMargin: '-42% 0px -52% 0px' });
      caps.forEach(function (c) { obs.observe(c); });
      /* en móvil, la barra fija solo existe mientras se lee la carta */
      var cuerpo = $('.carta__cuerpo');
      var obsBarra = new IntersectionObserver(function (en) {
        carril.classList.toggle('es-visible', en[0].isIntersecting && densidad() === 'copa');
      }, { rootMargin: '-' + (alturaCabecera() + 60) + 'px 0px -55% 0px' });
      obsBarra.observe(cuerpo);
    }
    dientes.forEach(function (b) {
      b.addEventListener('click', function () { irA('#' + b.getAttribute('data-parte')); });
    });

    /* ── sobria: los cuatro títulos son pestañas y la carta cabe en una pantalla ── */
    var seleccion = 'entrantes';
    function seleccionar(id, foco) {
      seleccion = id;
      partes.forEach(function (a) {
        var es = a.getAttribute('data-parte') === id;
        a.setAttribute('aria-selected', es ? 'true' : 'false');
        a.tabIndex = es ? 0 : -1;
        if (es && foco) a.focus();
      });
      caps.forEach(function (c) { c.hidden = c.getAttribute('data-parte') !== id; });
      setTimeout(refrescar, 40);
    }
    function montar() {
      var sobria = densidad() === 'sobria';
      if (sobria) {
        indice.setAttribute('role', 'tablist');
        partes.forEach(function (a) {
          a.setAttribute('role', 'tab');
          a.id = 'pestana-' + a.getAttribute('data-parte');
          a.setAttribute('aria-controls', a.getAttribute('data-parte'));
        });
        caps.forEach(function (c) { c.setAttribute('role', 'tabpanel'); c.setAttribute('aria-labelledby', 'pestana-' + c.getAttribute('data-parte')); });
        seleccionar(seleccion);
      } else {
        indice.removeAttribute('role');
        partes.forEach(function (a) { ['role', 'id', 'aria-controls', 'aria-selected', 'tabindex'].forEach(function (k) { a.removeAttribute(k); }); });
        caps.forEach(function (c) { c.hidden = false; c.removeAttribute('role'); c.setAttribute('aria-labelledby', c.getAttribute('data-parte') + '-titulo'); });
        setTimeout(refrescar, 40);
      }
      api.modo = sobria ? 'pestanas' : 'capitulos';
    }
    partes.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (densidad() !== 'sobria') return;
        e.preventDefault();
        seleccionar(a.getAttribute('data-parte'));
      });
      a.addEventListener('keydown', function (e) {
        if (densidad() !== 'sobria' || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
        e.preventDefault();
        var sig = partes[(i + (e.key === 'ArrowRight' ? 1 : -1) + partes.length) % partes.length];
        seleccionar(sig.getAttribute('data-parte'), true);
      });
    });
    montar();
    document.addEventListener('densidad-cambiada', montar);
    api.seleccionar = seleccionar;
    var imprimir = $('#imprimir');
    if (imprimir) imprimir.addEventListener('click', function () { window.print(); });
    return api;
  })();

  /* ───────────────── cifras que cuentan al entrar ───────────────── */
  function formatear(v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); }
  function contar(el, atributo) {
    var fin = parseFloat(el.getAttribute(atributo || 'data-contar'));
    var desde = parseFloat(el.getAttribute('data-desde') || '0');
    var dec = parseInt(el.getAttribute('data-decimales') || '0', 10);
    if (!movimiento) { el.textContent = formatear(fin, dec); return; }
    var t0 = null, dur = 1500;
    (function paso(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 4);
      el.textContent = formatear(desde + (fin - desde) * e, dec);
      if (k < 1) requestAnimationFrame(paso);
    })(performance.now());
  }
  B.contar = contar;
  var cifras = todos('[data-contar]');
  if (movimiento) cifras.forEach(function (el) { el.textContent = formatear(parseFloat(el.getAttribute('data-desde') || '0'), parseInt(el.getAttribute('data-decimales') || '0', 10)); });
  cuandoVisible(cifras, 0.6, function (el) { contar(el); });

  /* ───────────────── la cinta de platos (dos filas, sentidos opuestos) ───────────────── */
  (function cinta() {
    var filas = todos('.cinta__fila');
    if (!filas.length) return;
    filas.forEach(function (fila) {
      var pista = fila.querySelector('.cinta__pista');
      var originales = todos(':scope > li', pista);
      var anchoGrupo = pista.scrollWidth;
      var copias = Math.max(1, Math.ceil((window.innerWidth * 2) / Math.max(1, anchoGrupo)));
      for (var c = 0; c < copias; c++) {
        originales.forEach(function (li) { var x = li.cloneNode(true); x.setAttribute('aria-hidden', 'true'); pista.appendChild(x); });
      }
      fila._ancho = function () {
        var gap = parseFloat(getComputedStyle(pista).columnGap) || 0;
        return originales.reduce(function (a, li) { return a + li.offsetWidth; }, 0) + originales.length * gap;
      };
    });
    if (!movimiento) return;
    var extra = 0, visible = true;
    if (lenis) lenis.on('scroll', function (e) { extra = Math.min(Math.abs(e.velocity || 0) * 0.25, 7); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe($('#cinta'));
    var pos = filas.map(function (f) { return f.getAttribute('data-sentido') === '-1' ? -f._ancho() : 0; });
    /* rAF propio: ningún tween de GSAP toca esta propiedad */
    (function paso() {
      if (visible && densidad() === 'copa') {
        filas.forEach(function (f, i) {
          var ancho = f._ancho(), s = parseFloat(f.getAttribute('data-sentido'));
          pos[i] -= s * (0.5 + extra);
          if (pos[i] <= -ancho) pos[i] += ancho;
          if (pos[i] > 0) pos[i] -= ancho;
          f.firstElementChild.style.transform = 'translate3d(' + pos[i].toFixed(2) + 'px,0,0)';
        });
        extra *= 0.94;
      }
      requestAnimationFrame(paso);
    })();
  })();

  /* ───────────────── en la plaza: el cristal y la foto, a distinta velocidad ───────────────── */
  (function cristal() {
    var caja = $('#cristal');
    if (!caja || !movimiento) return;
    var st = { trigger: caja, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo('#cristal-fondo', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: st });
    gsap.fromTo('#cristal-vidrio', { y: 26 }, { y: -26, ease: 'none', scrollTrigger: Object.assign({}, st) });
    /* el reflejo recorre el cristal en diagonal (la sobria no lo tiene) */
    gsap.fromTo('#cristal-reflejo', { xPercent: -40 }, { xPercent: 640, ease: 'none', scrollTrigger: { trigger: caja, start: 'top 85%', end: 'bottom 15%', scrub: 0.4 } });
  })();

  /* ───────────────── horario: el día de hoy y las franjas ───────────────── */
  (function horario() {
    var franjas = $('#franjas');
    if (!franjas) return;
    var hoy = franjas.querySelector('.franja-dia[data-dia="' + new Date().getDay() + '"]');
    if (hoy) {
      hoy.classList.add('es-hoy');
      var lectura = hoy.querySelector('.visualmente-oculto');
      if (lectura) lectura.textContent = 'Hoy, ' + lectura.textContent.charAt(0).toLowerCase() + lectura.textContent.slice(1);
    }
    cuandoVisible([franjas], 0.35, function () { franjas.classList.add('es-visible'); });
  })();

  /* ───────────────── botones magnéticos ───────────────── */
  (function imanes() {
    if (!movimiento || esTactil) return;
    todos('.iman').forEach(function (el) {
      var aX = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' });
      var aY = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' });
      var fuerza = el.classList.contains('reservar__telefono') ? 0.12 : 0.3;
      el.addEventListener('pointermove', function (e) {
        var c = el.getBoundingClientRect();
        aX((e.clientX - (c.left + c.width / 2)) * fuerza);
        aY((e.clientY - (c.top + c.height / 2)) * fuerza * 1.3);
      });
      el.addEventListener('pointerleave', function () { aX(0); aY(0); });
    });
  })();

  /* ───────────────── cursor propio: punto de tinta + aro ───────────────── */
  (function cursor() {
    if (!movimiento || esTactil) return;
    var aro = document.createElement('div');
    var pt = document.createElement('div');
    aro.className = 'cursor';
    pt.className = 'cursor-punto';
    [aro, pt].forEach(function (n) { n.setAttribute('aria-hidden', 'true'); document.body.appendChild(n); });
    var aX = gsap.quickTo(aro, 'x', { duration: 0.28, ease: 'power3.out' });
    var aY = gsap.quickTo(aro, 'y', { duration: 0.28, ease: 'power3.out' });
    var ultimo = null;
    function mostrar(si) { aro.classList.toggle('cursor--vivo', si); pt.classList.toggle('cursor--vivo', si); }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!aro.classList.contains('cursor--vivo')) { gsap.set(aro, { x: e.clientX, y: e.clientY }); mostrar(true); }
      /* el del sistema se oculta solo cuando el propio ya se ve */
      if (!html.classList.contains('con-cursor')) html.classList.add('con-cursor');
      gsap.set(pt, { x: e.clientX, y: e.clientY });
      aX(e.clientX); aY(e.clientY);
      /* el estado se decide aquí, por el objetivo (pointerover no siempre llega) */
      if (e.target !== ultimo) {
        ultimo = e.target;
        var t = e.target.closest ? e.target : null;
        var sobre = !!(t && t.closest('a, button, label, input, select, textarea, summary, [role="button"], [role="tab"]'));
        var oscuro = !!(t && t.closest('.pie-pagina, .cristal, .cookies, .mando'));
        aro.classList.toggle('cursor--activo', sobre);
        aro.classList.toggle('cursor--oscuro', oscuro);
        pt.classList.toggle('cursor-punto--activo', sobre);
      }
    });
    html.addEventListener('mouseleave', function () { mostrar(false); });
    html.addEventListener('mouseenter', function () { if (html.classList.contains('con-cursor')) mostrar(true); });
  })();

  /* ───────────────── cabecera fija y menú móvil ───────────────── */
  var cabecera = $('#cabecera');
  var boton = $('#hamburguesa');
  (function cabeceraFija() {
    if (!cabecera) return;
    function actualizar() { cabecera.classList.toggle('cabecera--fija', window.pageYOffset > 40); }
    window.addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  })();
  function cerrarMenu() {
    if (!cabecera || !boton || !cabecera.classList.contains('menu-abierto')) return;
    cabecera.classList.remove('menu-abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.querySelector('.visualmente-oculto').textContent = 'Abrir menú';
    if (lenis) lenis.start();
  }
  if (boton) {
    boton.addEventListener('click', function () {
      var abierto = cabecera.classList.toggle('menu-abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      boton.querySelector('.visualmente-oculto').textContent = abierto ? 'Cerrar menú' : 'Abrir menú';
      if (lenis) { if (abierto) lenis.stop(); else lenis.start(); }
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  /* ───────────────── mapa: Google solo bajo clic ───────────────── */
  (function mapa() {
    var btn = $('#mapa-boton'), caja = $('#mapa-consentimiento');
    if (!btn || !caja) return;
    btn.addEventListener('click', function () {
      var marco = document.createElement('iframe');
      marco.src = MAPA;
      marco.loading = 'lazy';
      marco.title = 'Mapa: La otra bodeguita, C/ López Asme 6, Zafra';
      marco.allowFullscreen = true;
      marco.referrerPolicy = 'no-referrer-when-downgrade';
      caja.parentNode.replaceChild(marco, caja);
      setTimeout(refrescar, 60);
    });
  })();

  /* ───────────────── aviso de cookies ───────────────── */
  (function cookies() {
    var caja = $('#cookies'), ok = $('#cookies-aceptar'), reabrir = $('#cookies-reabrir');
    if (!caja || !ok) return;
    function ver(si) {
      caja.hidden = !si;                      /* el CSS pone display solo si NO hay [hidden] */
      document.body.classList.toggle('cookies-visibles', si);
    }
    var guardado = null;
    try { guardado = localStorage.getItem('lob-cookies'); } catch (e) {}
    if (guardado !== 'ok') ver(true);
    ok.addEventListener('click', function () {
      ver(false);
      try { localStorage.setItem('lob-cookies', 'ok'); } catch (e) {}
    });
    if (reabrir) reabrir.addEventListener('click', function () { ver(true); ok.focus(); });
  })();

  var anio = $('#anio');
  if (anio) anio.textContent = new Date().getFullYear();

  if (gsapReady && document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);
  /* contenido que cambia de alto (mapa, pestañas, imágenes): el fin de página de ScrollTrigger se queda viejo */
  if (gsapReady && 'ResizeObserver' in window) {
    var altoPrevio = 0;
    var refrescarTarde = esperar(refrescar, 150);
    new ResizeObserver(function () {
      var a = document.body.offsetHeight;
      if (Math.abs(a - altoPrevio) < 40) return;
      altoPrevio = a;
      refrescarTarde();
    }).observe(document.body);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     [MANDO DE MAQUETA] — SOLO REVISIÓN INTERNA. NO PUBLICAR.
     Borrar este bloque entero, los bloques CSS marcados igual en estilos.css
     y opiniones.css, el <div class="mando">, el botón y la hoja de «Carta
     para imprimir» del HTML, y la parte de densidad del script bloqueante del
     <head>. Lo hace node scripts/quitar-mando.mjs; receta en el README.
     ═══════════════════════════════════════════════════════════════════════ */
  (function mandoMaqueta() {
    var mando = $('#mando');
    if (!mando) return;
    /* solo con ?revision: el enlace que recibe el cliente sale limpio */
    if (!/[?&]revision\b/.test(window.location.search)) return;
    mando.hidden = false;                       /* sin JS no haría nada: lo enseña el JS */
    var botones = todos('[data-densidad]', mando);
    function aplicar(d) {
      html.classList.remove('densidad-copa', 'densidad-sobria');
      html.classList.add('densidad-' + d);
      botones.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-densidad') === d ? 'true' : 'false'); });
      try { localStorage.setItem('lob-densidad', d); } catch (e) {}
      avisar('densidad-cambiada', d);
      setTimeout(refrescar, 90);
    }
    var actual = densidad();
    botones.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-densidad') === actual ? 'true' : 'false');
      b.addEventListener('click', function () { aplicar(b.getAttribute('data-densidad')); });
    });
    if (actual !== 'copa') avisar('densidad-cambiada', actual);

    /* los avisos pendientes, desde los datos */
    var datos = {};
    try { datos = JSON.parse($('#mando-datos').textContent); } catch (e) {}
    var lista = $('#mando-lista'), avisos = [];
    function item(texto, detalle, extra) {
      var li = document.createElement('li');
      li.textContent = texto;
      if (detalle) { var s = document.createElement('small'); s.textContent = detalle; li.appendChild(s); }
      if (extra) li.appendChild(extra);
      lista.appendChild(li); avisos.push(texto);
      return li;
    }
    if (datos.horario && !datos.horario.confirmado) item(datos.horario.aviso, 'Se enseña el de Google. Preguntar: fines de semana por la mañana, miércoles y jueves, hora de cierre.');
    if (datos.precios && !datos.precios.mostrar) {
      var etiqueta = document.createElement('label');
      etiqueta.className = 'mando__interruptor';
      var caja = document.createElement('input'); caja.type = 'checkbox'; caja.id = 'mando-precios';
      etiqueta.appendChild(caja); etiqueta.appendChild(document.createTextNode('Ver los precios de 2024 en la carta'));
      item(datos.precios.aviso, 'Ocultos en la web. Carnes, del mar y postres no tienen precio publicado.', etiqueta);
      caja.addEventListener('change', function () { precios(caja.checked); });
    }
    if (datos.noVigentes && datos.noVigentes.length) item('Platos sin publicar desde hace tiempo (no salen): ' + datos.noVigentes.length, datos.noVigentes.join(' · '));
    item(datos.sinMedir && datos.sinMedir.length ? 'Distancias sin medir: ' + datos.sinMedir.join(', ') : 'Distancias: todas medidas a pie (' + datos.medido + ')',
      datos.terraza == null ? 'Sin confirmar si la terraza está en la plaza o en la calle: se dice «junto a la Plaza del Pilar Redondo».' : '');
    if (datos.marcas === false) item('Cámara con "marcas": false', 'Sin permiso todavía para nombrar a Discarlux, Vaca Vella o Angus.');
    if (datos.bodeguita) item(datos.bodeguita);
    $('#mando-cuenta').textContent = '(' + avisos.length + ')';

    function precios(si) {
      todos('.precio[data-maqueta]').forEach(function (n) { n.remove(); });
      var aviso = $('#aviso-precios'); if (aviso) aviso.remove();
      if (!si) return;
      var mapa = (datos.precios && datos.precios.platos) || {};
      todos('.plato[data-plato]').forEach(function (li) {
        var p = mapa[li.getAttribute('data-plato')];
        if (!p) return;
        var s = document.createElement('span');
        s.className = 'plato__precio precio'; s.setAttribute('data-maqueta', ''); s.textContent = p;
        li.insertBefore(s, li.querySelector('.plato__desc'));
      });
      var a = document.createElement('p');
      a.className = 'carta__aviso-precios'; a.id = 'aviso-precios'; a.textContent = datos.precios.aviso + '.';
      $('#carta-cabeza').insertAdjacentElement('afterend', a);
      setTimeout(refrescar, 60);
    }
    B.mando = { avisos: avisos, precios: precios, aplicar: aplicar };
  })();
  /* ═══════════ fin del bloque [MANDO DE MAQUETA] ═══════════ */
})();
