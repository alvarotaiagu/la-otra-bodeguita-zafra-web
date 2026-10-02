/* ═══════════════════════════════════════════════════════════════════════════
   Módulo «La cámara»: las etiquetas de kraft que cuelgan de la barra.
   Se puede quitar entero (node scripts/quitar-camara.mjs): main.js no depende
   de este archivo, y si falta, las etiquetas se quedan quietas sin romper nada.

   · Cada etiqueta es un <button> que se balancea al pasar o enfocar: un péndulo
     amortiguado (θ'' = −k·θ − c·θ'), con su propio rAF y sin GSAP.
   · Al pulsarla abre un <dialog> con su foto y su texto (de una <template> que
     escribe construir.mjs desde data/camara.json). Escape lo cierra y el foco
     vuelve a la etiqueta.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var seccion = document.getElementById('camara');
  var dlg = document.getElementById('camara-dialogo');
  if (!seccion || !dlg || typeof dlg.showModal !== 'function') return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nombre = document.getElementById('ficha-nombre');
  var cuerpo = document.getElementById('ficha-cuerpo');
  var botones = Array.prototype.slice.call(seccion.querySelectorAll('.etiqueta'));
  var B = window.Bodeguita = window.Bodeguita || {};
  var origen = null;

  /* ── péndulo amortiguado ── */
  var RIGIDEZ = 70, ROCE = 3.4;
  botones.forEach(function (b) {
    var th = 0, w = 0, corre = false, previo = 0;
    function paso(t) {
      var dt = Math.min(0.033, (t - previo) / 1000 || 0.016);
      previo = t;
      w += (-RIGIDEZ * th - ROCE * w) * dt;
      th += w * dt;
      if (Math.abs(th) < 0.03 && Math.abs(w) < 0.08) { th = w = 0; b.style.transform = ''; corre = false; return; }
      b.style.transform = 'rotate(' + th.toFixed(3) + 'deg)';
      requestAnimationFrame(paso);
    }
    function empujar(v) {
      if (reduce) return;
      w += v;
      if (!corre) { corre = true; previo = performance.now(); requestAnimationFrame(paso); }
    }
    b.addEventListener('pointerenter', function (e) { empujar((e.movementX || 1) >= 0 ? 55 : -55); });
    b.addEventListener('focus', function () { empujar(45); });
    b.addEventListener('click', function () { abrir(b); });
    b._pendulo = { get angulo() { return th; } };
  });

  /* ── la ficha ── */
  function abrir(b) {
    var id = b.getAttribute('data-etiqueta');
    var tpl = seccion.querySelector('template.ficha[data-etiqueta="' + id + '"]');
    if (!tpl) return;
    origen = b;
    nombre.textContent = tpl.getAttribute('data-nombre');
    cuerpo.textContent = '';
    cuerpo.appendChild(tpl.content.cloneNode(true));
    dlg.showModal();
    if (B.lenis) B.lenis.stop();
    document.getElementById('ficha-cerrar').focus({ preventScroll: true });
  }
  document.getElementById('ficha-cerrar').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    if (B.lenis) B.lenis.start();
    if (origen && origen.focus) origen.focus({ preventScroll: true });
  });

  B.camara = { abrir: abrir, botones: botones };
})();
