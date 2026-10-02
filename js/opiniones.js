/* ═══════════════════════════════════════════════════════════════════════════
   Módulo «Opiniones». Se puede quitar entero (node scripts/quitar-opiniones.mjs):
   main.js no depende de este archivo.

   · La nota grande (4,6) cuenta al entrar.
   · La pila sticky sigue la receta del checklist: todas las tarjetas miden lo
     que la más alta (medida con height:auto, otra vez en resize y fonts.ready);
     si la más alta no cabe bajo la cabecera, o en móvil, se desapila.
   · La de debajo se encoge con scrub: trigger = el <li> siguiente y el final
     EXACTAMENTE en su top. Nada de opacidad (dejaría una tarjeta invisible).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var pila = document.getElementById('pila');
  if (!pila) return;
  var html = document.documentElement;
  var B = window.Bodeguita = window.Bodeguita || {};
  var items = Array.prototype.slice.call(pila.querySelectorAll('.pila__item'));
  var tarjetas = items.map(function (li) { return li.querySelector('.tarjeta'); });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsapReady = !!(window.gsap && window.ScrollTrigger);
  var movimiento = gsapReady && !reduce;

  function cabecera() { var c = document.getElementById('cabecera'); return c ? c.offsetHeight : 72; }
  function tope() { return cabecera() + window.innerHeight * 0.03; }
  function refrescar() { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }

  function medir() {
    pila.style.removeProperty('--alto-tarjeta');
    pila.classList.remove('es-desapilada');
    tarjetas.forEach(function (t) { t.style.height = 'auto'; });
    var mayor = Math.max.apply(null, tarjetas.map(function (t) { return t.offsetHeight; }));
    tarjetas.forEach(function (t) { t.style.height = ''; });
    var cabe = mayor <= window.innerHeight - tope() - 24;
    var desapilar = window.matchMedia('(max-width: 860px)').matches || !cabe || html.classList.contains('densidad-sobria');
    pila.classList.toggle('es-desapilada', desapilar);
    if (!desapilar) pila.style.setProperty('--alto-tarjeta', mayor + 'px');
    B.opiniones = { alto: mayor, desapilada: desapilar };
    setTimeout(refrescar, 30);
  }
  medir();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(medir, 160); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
  document.addEventListener('densidad-cambiada', medir);

  if (movimiento) {
    items.forEach(function (li, i) {
      if (i === items.length - 1) return;
      window.gsap.to(tarjetas[i], {
        scale: 0.94, ease: 'none',
        scrollTrigger: { trigger: items[i + 1], start: 'top bottom', end: function () { return 'top ' + tope() + 'px'; }, scrub: true, invalidateOnRefresh: true }
      });
    });
  }

  /* la nota grande, que cuenta al entrar */
  var cifra = document.querySelector('[data-contar-op]');
  if (cifra && 'IntersectionObserver' in window) {
    if (movimiento) cifra.textContent = '0,0';
    var obs = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      obs.disconnect();
      if (B.contar) B.contar(cifra, 'data-contar-op');
      else cifra.textContent = '4,6';
    }, { threshold: 0.6 });
    obs.observe(cifra);
  }
})();
