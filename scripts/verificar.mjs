/* Verificación de La otra bodeguita · «De la copa al tenedor».
   Levanta un servidor estático, abre la web con Playwright (Chromium) y comprueba:
     · un test por cada punto del checklist de web desde cero (cursor, pila
       sticky, menú móvil, cookies, cortina, hero en móviles bajos, con-movimiento,
       trazos con autoRound, clases de estado con prefijo);
     · la cortina: fotogramas del parpadeo, del halo a medio crecer y del logo en
       vuelo; el aterrizaje a menos de 2 px; la retirada sin CDN, sin JS y con
       movimiento reducido (display:none); el logo se forma UNA vez;
     · el pie: muestrea stroke-dashoffset al bajar, acaba en el tenedor y se
       recalcula al cambiar el ancho;
     · el carril: el diente activo cambia al cruzar cada capítulo y el clic salta;
     · la regla del C: fotos de platos siempre en color y grandes;
     · la carta: nada no vigente, sin precios, sin las obleas de La Bodeguita;
       y que carta.json, camara.json y config.json mandan (en una copia);
     · el borrado de la cámara y de las opiniones, en copias temporales;
     · la cámara: etiquetas → <dialog>, Escape cierra y devuelve el foco, y con
       "marcas": false no sale ninguna marca del proveedor;
     · las franjas: 7 filas visibles y una es-hoy;
     · enlaces tel: y WhatsApp apagado con null;
     · las dos densidades y la hoja de impresión (un A4); sin ?revision no hay mando;
     · textos prohibidos y citas sin nombre.
   Se baja con mouse.wheel: con Lenis, window.scrollTo no dispara ScrollTrigger.

   node scripts/verificar.mjs            (todo)
   node scripts/verificar.mjs --capturas (además guarda screenshots/)
*/
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const conCapturas = process.argv.includes('--capturas');
if (conCapturas) fs.mkdirSync(path.join(raiz, 'screenshots'), { recursive: true });
const foto = n => path.join(raiz, 'screenshots', n);
const tipos = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json'
};
function servir(dir, puerto) {
  const s = http.createServer((req, res) => {
    const limpia = decodeURIComponent(req.url.split('?')[0]);
    const destino = path.join(dir, limpia === '/' ? 'index.html' : limpia);
    if (!destino.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(dir, '404.html')));
      return;
    }
    res.writeHead(200, { 'content-type': tipos[path.extname(destino)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(destino));
  });
  return new Promise(r => s.listen(puerto, '127.0.0.1', () => r(s)));
}

const fallos = [], notas = [];
function comprobar(ok, mensaje) { (ok ? notas : fallos).push((ok ? 'OK   ' : 'FALLA') + ' · ' + mensaje); }
async function rueda(page, vueltas, paso = 600, espera = 160) {
  for (let i = 0; i < vueltas; i++) { await page.mouse.wheel(0, paso); await page.waitForTimeout(espera); }
}
async function hastaAbajo(page, paso = 700) {
  let ant = -1;
  for (let i = 0; i < 260; i++) {
    await page.mouse.wheel(0, paso);
    await page.waitForTimeout(130);
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === ant) break;
    ant = y;
  }
  await page.waitForTimeout(2500);
}
/* ir a un elemento con la rueda, llevando la cuenta de lo despachado (Lenis va por detrás de scrollY) */
async function irA(page, selector, margen = 0.15, espera = 1600) {
  const destino = await page.evaluate(([s, m]) => {
    const el = document.querySelector(s); if (!el) return null;
    return Math.round(el.getBoundingClientRect().top + window.scrollY - innerHeight * m);
  }, [selector, margen]);
  if (destino == null) return false;
  let restante = destino - await page.evaluate(() => window.scrollY);
  while (Math.abs(restante) > 12) {
    const d = Math.sign(restante) * Math.min(Math.abs(restante), 420);
    await page.mouse.wheel(0, d); restante -= d;
    await page.waitForTimeout(55);
  }
  await page.waitForTimeout(espera);
  return true;
}
const PUERTO = 4211;
const BASE = 'http://127.0.0.1:' + PUERTO + '/';
const CDN = /cdn\.jsdelivr\.net\/npm\/(gsap|lenis)/;
const carta = JSON.parse(fs.readFileSync(path.join(raiz, 'data/carta.json'), 'utf8'));
const fotosJson = JSON.parse(fs.readFileSync(path.join(raiz, 'data/fotos.json'), 'utf8'));
const OBLEAS = ['DUSseetiPpR', 'DM5vnNIoT3b', 'DL7eKyhIO1i'];
const MARCAS = /discarlux|vaca vella|marela|angus|old special|Dc9VI6iI7UD/i;

const servidor = await servir(raiz, PUERTO);
const navegador = await chromium.launch();
async function nuevaPagina(opciones = {}, { cookiesVistas = true, bloquearCDN = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, ...opciones });
  if (cookiesVistas) await ctx.addInitScript(() => { try { localStorage.setItem('lob-cookies', 'ok'); } catch (e) {} });
  if (bloquearCDN) await ctx.route(CDN, r => r.abort());
  const page = await ctx.newPage();
  page.errores = []; page.respuestas = [];
  page.on('console', m => { if (m.type() === 'error') page.errores.push(m.text()); });
  page.on('pageerror', e => page.errores.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) page.respuestas.push(r.status() + ' ' + r.url()); });
  return { ctx, page };
}
const tmpCopia = (sufijo, conScripts = false) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bodeguita-' + sufijo + '-'));
  const fuera = new Set(['screenshots', '.git', ...(conScripts ? ['fuentes'] : ['scripts'])]);
  const copiar = (de, a) => { fs.mkdirSync(a, { recursive: true }); for (const e of fs.readdirSync(de, { withFileTypes: true })) { if (fuera.has(e.name)) continue; const o = path.join(de, e.name), d = path.join(a, e.name); if (e.isDirectory()) copiar(o, d); else fs.copyFileSync(o, d); } };
  copiar(raiz, tmp);
  return tmp;
};

try {
  /* ═══════════════ 0 · los datos mandan (estático, en copias) ═══════════════ */
  {
    const r = execFileSync(process.execPath, [path.join(raiz, 'scripts/construir.mjs'), '--comprobar'], { encoding: 'utf8' });
    comprobar(/al día/.test(r), 'construir.mjs: index.html está al día con data/*.json');
    const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    comprobar(!OBLEAS.some(id => html.includes(id)), 'carta: no aparecen las fotos con la oblea «LA BODEGUITA» (' + OBLEAS.join(', ') + ')');
    /* copia con scripts: cambiar los JSON cambia la web */
    const tmp = tmpCopia('datos', true);
    const cj = p => path.join(tmp, p);
    const c2 = JSON.parse(fs.readFileSync(cj('data/carta.json'), 'utf8'));
    c2.mostrarPrecios = true; c2.platos.find(p => p.id === 'codillo').vigente = false;
    fs.writeFileSync(cj('data/carta.json'), JSON.stringify(c2));
    const cam = JSON.parse(fs.readFileSync(cj('data/camara.json'), 'utf8')); cam.marcas = true;
    fs.writeFileSync(cj('data/camara.json'), JSON.stringify(cam));
    const cfg = JSON.parse(fs.readFileSync(cj('data/config.json'), 'utf8')); cfg.whatsapp = '34600000000';
    fs.writeFileSync(cj('data/config.json'), JSON.stringify(cfg));
    execFileSync(process.execPath, [cj('scripts/construir.mjs')], { stdio: 'ignore' });
    const h2 = fs.readFileSync(cj('index.html'), 'utf8');
    comprobar(/class="plato__precio precio">18 €/.test(h2) && !/data-plato="codillo"/.test(h2), 'carta.json manda: con mostrarPrecios:true salen los precios de 2024 y un plato con vigente:false desaparece');
    comprobar(/Dc9VI6iI7UD/.test(h2) && /Discarlux/.test(h2), 'camara.json manda: con "marcas": true salen la foto y el nombre del proveedor');
    comprobar(/<a class="boton boton--linea" id="whatsapp" href="https:\/\/wa\.me\/34600000000"/.test(h2), 'config.json manda: con un número, el botón de WhatsApp se enciende');
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  /* ═══════════════ 1 · carga limpia: cortina muestreada dentro de la página y el pie al bajar ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await ctx.addInitScript(() => {
      window.__m = { panel: [], halo: [], vuelo: [], cubreAlCargar: null };
      document.addEventListener('DOMContentLoaded', () => {
        const c = document.getElementById('cortina');
        window.__m.cubreAlCargar = c ? getComputedStyle(c).display : 'sin cortina';
        (function paso() {
          const r = document.getElementById('cortina-rotulo'), h = document.getElementById('cortina-halo');
          if (r && c && getComputedStyle(c).display !== 'none') {
            window.__m.panel.push(getComputedStyle(r).getPropertyValue('--panel-logo').trim());
            const m = (getComputedStyle(h).transform.match(/matrix\(([-\d.]+)/) || [])[1];
            window.__m.halo.push(m ? +(+m).toFixed(3) : null);
            const v = r.style.transform.match(/scale\(([\d.]+)\)/);
            if (v) window.__m.vuelo.push(+v[1]);
          }
          if (!c || getComputedStyle(c).display !== 'none' || performance.now() < 5000) requestAnimationFrame(paso);
        })();
      });
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4300);
    const m = await page.evaluate(() => Object.assign(window.__m, { aterrizaje: window.Bodeguita.aterrizaje, formaciones: window.Bodeguita.formaciones }));
    comprobar(m.cubreAlCargar === 'block', 'checklist 5 · la cortina tapa la página al cargar (display ' + m.cubreAlCargar + ')');
    /* parpadeo: el panel pasa al menos dos veces de apagado a claro antes de quedarse encendido */
    const claro = v => /#f4f3ee|#c9c9c0|rgb\(244, 243, 238\)/i.test(v);
    let encendidos = 0; for (let i = 1; i < m.panel.length; i++) if (claro(m.panel[i]) && !claro(m.panel[i - 1])) encendidos++;
    comprobar(encendidos >= 2, 'cortina: el rótulo parpadea antes de encenderse (' + encendidos + ' encendidos en ' + m.panel.length + ' fotogramas)');
    const halos = m.halo.filter(x => x != null && x > 0.4 && x < 1.3);
    comprobar(new Set(halos.map(x => x.toFixed(2))).size >= 4, 'cortina: el halo crece de verdad hasta hacerse papel (' + halos.length + ' fotogramas intermedios)');
    comprobar(m.vuelo.filter(x => x > 0.6 && x < 0.99).length >= 3, 'cortina: el logo vuela al hero (' + m.vuelo.length + ' fotogramas de vuelo)');
    comprobar(m.aterrizaje && m.aterrizaje.dx < 2 && m.aterrizaje.dy < 2 && m.aterrizaje.dw < 2, 'cortina: el logo aterriza a menos de 2 px de su sitio ' + JSON.stringify(m.aterrizaje));
    comprobar(m.formaciones === 1, 'cortina: el logo se forma UNA sola vez por página (' + m.formaciones + ')');
    const estado = await page.evaluate(() => ({
      cortina: getComputedStyle(document.getElementById('cortina')).display,
      heroLogo: getComputedStyle(document.getElementById('hero-logo')).visibility,
      animLogo: document.getElementById('hero-logo').getAnimations({ subtree: true }).length,
      animCopa: document.getElementById('copa-svg').getAnimations({ subtree: true }).filter(a => !/opacity/.test(JSON.stringify(a.effect && a.effect.getKeyframes()))).length,
      movimiento: document.documentElement.classList.contains('con-movimiento'),
      lenis: document.documentElement.classList.contains('lenis')
    }));
    comprobar(estado.cortina === 'none', 'checklist 5 · la cortina acaba en display:none');
    comprobar(estado.heroLogo === 'visible' && estado.animLogo === 0 && estado.animCopa === 0, 'el logo del hero y la copa grande están ahí, sin dibujarse');
    comprobar(estado.movimiento, 'checklist 7 · con GSAP y sin movimiento reducido hay html.con-movimiento');
    comprobar(estado.lenis, 'Lenis carga (desde jsDelivr) y gobierna el scroll');
    /* el pie: muestrear stroke-dashoffset al bajar (no la captura final) */
    await page.mouse.move(700, 450);
    const muestras = [], dientes = [];
    let ant = -1;
    for (let i = 0; i < 110; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(90);
      const s = await page.evaluate(() => ({ y: Math.round(scrollY), off: parseFloat(getComputedStyle(document.getElementById('pie-copa-d')).strokeDashoffset), d: [0, 1, 2, 3].reduce((a, i) => a + parseFloat(getComputedStyle(document.getElementById('diente-' + i)).strokeDashoffset), 0) / 4, fin: document.getElementById('indice').getBoundingClientRect().top < innerHeight * 0.4 }));
      muestras.push(s.off); dientes.push(s.d);
      if (s.fin) break;
      ant = s.y;
    }
    await page.waitForTimeout(1500);
    const finPie = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('pie-copa-d')).strokeDashoffset));
    const inter = new Set(muestras.filter(v => v > 0.02 && v < 0.98).map(v => v.toFixed(3)));
    let retrocesos = 0; for (let i = 1; i < muestras.length; i++) if (muestras[i] > muestras[i - 1] + 0.02) retrocesos++;
    comprobar(inter.size >= 10, 'checklist 8 · el pie se dibuja con el scroll: stroke-dashoffset pasa por ' + inter.size + ' valores intermedios (autoRound:false)');
    comprobar(retrocesos === 0, 'el pie: al bajar nunca se desdibuja (' + retrocesos + ' retrocesos)');
    comprobar(finPie < 0.01, 'el pie: al llegar a la carta está entero (dashoffset ' + finPie.toFixed(3) + ')');
    const interD = new Set(dientes.filter(v => v > 0.02 && v < 0.98).map(v => v.toFixed(3)));
    comprobar(interD.size >= 4, 'checklist 8 · los dientes del tenedor se abren con scrub (' + interD.size + ' valores intermedios)');
    const llegada = await page.evaluate(() => {
      const p = window.Bodeguita.pie, t = document.getElementById('tenedor').getBoundingClientRect(), m = document.getElementById('contenido').getBoundingClientRect();
      return { dx: Math.abs(p.x0 - p.x1), dy: Math.abs(p.y1 - (t.top - m.top)), ancho: p.ancho };
    });
    comprobar(llegada.dx < 2 && llegada.dy < 3, 'el pie: es una línea recta que acaba en el tenedor de la carta ' + JSON.stringify(llegada));
    comprobar(page.errores.length === 0, 'consola limpia en escritorio' + (page.errores.length ? ': ' + page.errores.slice(0, 3).join(' | ') : ''));
    comprobar(page.respuestas.length === 0, 'sin respuestas 4xx/5xx' + (page.respuestas.length ? ': ' + page.respuestas.slice(0, 3).join(' | ') : ''));
    /* recalculado al cambiar el ancho */
    const antes = await page.evaluate(() => document.getElementById('pie-copa-d').getAttribute('d'));
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForTimeout(1300);
    const despues = await page.evaluate(() => ({ d: document.getElementById('pie-copa-d').getAttribute('d'), w: +document.getElementById('pie-copa').getAttribute('width'), p: window.Bodeguita.pie }));
    comprobar(antes !== despues.d && Math.abs(despues.w - 1200) < 20 && Math.abs(despues.p.x0 - despues.p.x1) < 2, 'el pie se recalcula al cambiar el ancho (svg a ' + despues.w + ' px, sigue cayendo en el tenedor)');
    await ctx.close();
  }

  /* ═══════════════ 2 · cortina: fotogramas a medias (línea de tiempo pausada) ═══════════════ */
  for (const [t, nombre, comprobacion] of [[0.28, 'parpadeo', 'parpadeo'], [1.5, 'halo', 'halo'], [2.12, 'vuelo', 'vuelo']]) {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.Bodeguita && window.Bodeguita.cortina && document.fonts.status === 'loaded');
    await page.waitForTimeout(520);
    await page.evaluate(tt => { const tl = window.Bodeguita.cortina.tl; tl.pause(); tl.seek(tt, false); 0; }, t);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const ro = document.getElementById('cortina-rotulo'), h = document.getElementById('cortina-halo');
      return { panel: getComputedStyle(ro).getPropertyValue('--panel-logo').trim(), halo: +(getComputedStyle(h).transform.match(/matrix\(([-\d.]+)/) || [0, 0])[1], op: +getComputedStyle(h).opacity, vuelo: ro.style.transform, display: getComputedStyle(document.getElementById('cortina')).display };
    });
    if (comprobacion === 'parpadeo') comprobar(r.display === 'block' && /f4f3ee/i.test(r.panel) && r.op > 0.3, 'cortina: fotograma del parpadeo (panel ' + r.panel + ', halo ' + r.op + ')');
    if (comprobacion === 'halo') comprobar(r.halo > 0.5 && r.halo < 1.4, 'cortina: fotograma del halo a medio crecer (escala ' + r.halo.toFixed(2) + ')');
    if (comprobacion === 'vuelo') comprobar(/scale\(0\.[2-9]/.test(r.vuelo), 'cortina: fotograma del logo en vuelo (' + r.vuelo + ')');
    if (conCapturas) await page.screenshot({ path: foto('cortina-' + nombre + '-1440.png') });
    await ctx.close();
  }
  if (conCapturas) {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.Bodeguita && window.Bodeguita.cortina && document.fonts.status === 'loaded');
    await page.waitForTimeout(520);
    await page.evaluate(() => { const tl = window.Bodeguita.cortina.tl; tl.pause(); tl.seek(0.95, false); 0; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: foto('cortina-encendida-a-medias-1440.png') });
    await ctx.close();
  }

  /* ═══════════════ 3 · retirada sin CDN, sin JS y con movimiento reducido ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({}, { bloquearCDN: true });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({
      cortina: getComputedStyle(document.getElementById('cortina')).display,
      mov: document.documentElement.classList.contains('con-movimiento'),
      titulo: getComputedStyle(document.querySelector('.hero__titulo .letra')).transform,
      logo: getComputedStyle(document.getElementById('hero-logo')).visibility,
      pie: getComputedStyle(document.getElementById('pie-copa-d')).strokeDashoffset
    }));
    comprobar(r.cortina === 'none', 'sin CDN: la cortina se retira (display ' + r.cortina + ')');
    comprobar(!r.mov, 'checklist 7 · sin GSAP no hay html.con-movimiento');
    comprobar(r.titulo === 'none' && r.logo === 'visible' && parseFloat(r.pie) === 0, 'sin CDN: titular, logo y pie de la copa entero se ven');
    if (conCapturas) await page.screenshot({ path: foto('sin-cdn-1440.png') });
    await ctx.close();
  }
  {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    const r = await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display).catch(() => null);
    /* sin JS evaluate no corre: se mide con un selector visible */
    const visible = await page.locator('#cortina').isVisible();
    comprobar(!visible && (r === null || r === 'none'), 'sin JS: la cortina no tapa nada (<noscript> + display:none)');
    const titulo = await page.locator('#hero-titulo').isVisible();
    comprobar(titulo, 'sin JS: el titular del hero se ve');
    await ctx.close();
  }
  {
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await ctx.addInitScript(() => {
      window.__vista = [];
      document.addEventListener('DOMContentLoaded', () => {
        const c = document.getElementById('cortina');
        window.__vista.push(c ? getComputedStyle(c).display : 'none');
        requestAnimationFrame(() => window.__vista.push(c ? getComputedStyle(c).display : 'none'));
      });
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const v = await page.evaluate(() => window.__vista);
    comprobar(v.length && v.every(d => d === 'none'), 'movimiento reducido: la cortina no pinta ni un fotograma (' + v.join(',') + ')');
    const r = await page.evaluate(() => ({
      mov: document.documentElement.classList.contains('con-movimiento'),
      titulo: getComputedStyle(document.querySelector('.hero__titulo .letra')).transform,
      cifra: document.querySelector('.cifras [data-contar="528"]').textContent,
      pie: parseFloat(getComputedStyle(document.getElementById('pie-copa-d')).strokeDashoffset),
      pieVisible: getComputedStyle(document.getElementById('pie-copa')).display,
      platos: document.querySelectorAll('.plato').length
    }));
    comprobar(!r.mov && r.titulo === 'none', 'checklist 7 · con movimiento reducido no hay con-movimiento y el titular se ve');
    comprobar(r.cifra === '528' && r.pie === 0 && r.pieVisible !== 'none' && r.platos === carta.platos.filter(p => p.vigente).length, 'movimiento reducido: cifras con su valor, el pie ya dibujado y la carta entera');
    /* el diente activo es contenido: también cambia con movimiento reducido */
    await irA(page, '#postres', 0.1, 600);
    const activo = await page.evaluate(() => window.Bodeguita.carta.activo);
    comprobar(activo === 'postres', 'movimiento reducido: el carril sigue marcando el capítulo en pantalla (' + activo + ')');
    if (conCapturas) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300); await page.screenshot({ path: foto('reducido-1440.png') }); }
    comprobar(page.errores.length === 0, 'consola limpia con movimiento reducido' + (page.errores.length ? ': ' + page.errores[0] : ''));
    await ctx.close();
  }

  /* ═══════════════ 4 · checklist 1 · cursor propio ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3600);
    await page.mouse.move(300, 300); await page.mouse.move(320, 310);
    await page.waitForTimeout(250);
    const r1 = await page.evaluate(() => ({ cur: getComputedStyle(document.body).cursor, html: document.documentElement.classList.contains('con-cursor'), aro: getComputedStyle(document.querySelector('.cursor')).opacity }));
    comprobar(r1.cur === 'none' && r1.html && parseFloat(r1.aro) > 0.9, 'checklist 1 · cursor propio: el del sistema se oculta y el aro se ve');
    const b = await page.locator('.hero__acciones .boton--tinta').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
    await page.waitForTimeout(500);
    const r2 = await page.evaluate(() => { const a = document.querySelector('.cursor'); const c = getComputedStyle(a).backgroundColor.match(/[\d.]+/g); return { activo: a.classList.contains('cursor--activo'), alfa: c && c[3] ? parseFloat(c[3]) : 1 }; });
    comprobar(r2.activo && r2.alfa >= 0.35, 'checklist 1 · sobre un botón el aro crece con relleno visible (alfa ' + r2.alfa + ')');
    /* la regla del C en hover: pasar por una foto de plato no la apaga */
    await irA(page, '#entrantes .capitulo__fotos', 0.2, 900);
    const fb = await page.locator('#entrantes .foto-plato img').first().boundingBox();
    await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2, { steps: 3 });
    await page.waitForTimeout(400);
    const filtroHover = await page.evaluate(() => getComputedStyle(document.querySelector('#entrantes .foto-plato img')).filter);
    comprobar(!/grayscale|sepia|saturate\(0/.test(filtroHover), 'regla del C · en hover la foto del plato sigue en color (filter ' + filtroHover + ')');
    await ctx.close();
  }

  /* ═══════════════ 5 · checklist 4 · cookies ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({}, { cookiesVistas: false });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3600);
    const d1 = await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display);
    await page.click('#cookies-aceptar');
    const d2 = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('cookies')).display, k: localStorage.getItem('lob-cookies') }));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
    const d3 = await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display);
    comprobar(d1 === 'flex' && d2.d === 'none' && d2.k === 'ok' && d3 === 'none', 'checklist 4 · cookies: sale, el botón lo cierra de verdad y no vuelve al recargar (' + [d1, d2.d, d3].join(' → ') + ')');
    await ctx.close();
  }

  /* ═══════════════ 6 · checklist 3 · menú móvil (con la cabecera ya fija) y barra del carril ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3600);
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(500);
    const cerrado = await page.evaluate(() => { const r = document.getElementById('navegacion').getBoundingClientRect(); return { bottom: r.bottom, vis: getComputedStyle(document.getElementById('navegacion')).visibility }; });
    await page.click('#hamburguesa');
    await page.waitForTimeout(700);
    const abierto = await page.evaluate(() => { const r = document.getElementById('navegacion').getBoundingClientRect(); return { top: r.top, h: r.height, exp: document.getElementById('hamburguesa').getAttribute('aria-expanded') }; });
    await page.click('#hamburguesa', { timeout: 3000 });
    await page.waitForTimeout(700);
    const otra = await page.evaluate(() => document.getElementById('hamburguesa').getAttribute('aria-expanded'));
    comprobar((cerrado.bottom <= 0 || cerrado.vis === 'hidden') && abierto.top === 0 && abierto.h >= 840 && abierto.exp === 'true' && otra === 'false',
      'checklist 3 · menú móvil: cerrado no asoma, abierto mide la pantalla (' + Math.round(abierto.h) + ' px) y el botón lo vuelve a cerrar');
    /* en móvil el pie no recorre la página y el carril es una barra fija arriba */
    const pie = await page.evaluate(() => getComputedStyle(document.getElementById('pie-copa')).display);
    comprobar(pie === 'none', 'móvil: el pie de la copa no recorre la página (la copa conserva su pie corto)');
    const y = await page.evaluate(() => document.getElementById('carnes').getBoundingClientRect().top + scrollY + 200);
    await page.evaluate(yy => window.scrollTo(0, yy), y);
    await page.waitForTimeout(700);
    const barra = await page.evaluate(() => { const c = document.getElementById('carril'); const r = c.getBoundingClientRect(); const cab = document.getElementById('cabecera').getBoundingClientRect(); return { pos: getComputedStyle(c).position, top: Math.round(r.top), cab: Math.round(cab.bottom), vis: c.classList.contains('es-visible'), segmentos: c.querySelectorAll('.carril__diente').length, activo: c.querySelector('.es-activo') && c.querySelector('.es-activo').dataset.parte, sobre: !!document.elementFromPoint(innerWidth / 2, r.top + r.height / 2).closest('#carril') }; });
    comprobar(barra.pos === 'fixed' && barra.vis && barra.top >= barra.cab - 1 && barra.segmentos === 4 && barra.activo === 'carnes' && barra.sobre, 'móvil: el carril es una barra fija bajo la cabecera con cuatro segmentos y «Carnes» activo ' + JSON.stringify(barra));
    if (conCapturas) await page.screenshot({ path: foto('carril-movil-390.png') });
    await ctx.close();
  }

  /* ═══════════════ 7 · checklist 6 · hero en móviles bajos + capturas de cada sección ═══════════════ */
  const SECCIONES = [['#la-casa', '2-la-casa'], ['#cinta', '3-cinta'], ['#carta', '4-carta'], ['#entrantes', '5-entrantes'], ['#carnes', '6-carnes'], ['#camara', '7-camara'], ['#postres', '8-postres'], ['#en-la-plaza', '9-plaza'], ['#opiniones', '10-opiniones'], ['#horario', '11-horario'], ['#reservar', '12-reservar'], ['.pie-pagina', '13-pie']];
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024], [1366, 768], [1440, 900]]) {
    const { ctx, page } = await nuevaPagina({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3800);
    const r = await page.evaluate(() => {
      const caja = s => { const e = document.querySelector(s).getBoundingClientRect(); return { l: e.left, t: e.top, r: e.right, b: e.bottom, w: e.width }; };
      const piezas = { cab: caja('#cabecera'), logo: caja('#logo-hero'), titulo: caja('#hero-titulo'), acciones: caja('.hero__acciones'), nota: caja('.hero__nota'), copa: caja('#copa-svg') };
      const choca = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
      const nombres = Object.keys(piezas), choques = [];
      for (let i = 0; i < nombres.length; i++) for (let j = i + 1; j < nombres.length; j++) if (choca(piezas[nombres[i]], piezas[nombres[j]])) choques.push(nombres[i] + '×' + nombres[j]);
      return { choques, piezas, ancho: document.documentElement.scrollWidth, vw: innerWidth };
    });
    comprobar(r.choques.length === 0, 'checklist 6 · hero ' + w + '×' + h + ': logo, titular, botones, nota y copa no se pisan' + (r.choques.length ? ' (' + r.choques.join(', ') + ')' : ''));
    comprobar(r.ancho <= r.vw, 'sin desbordamiento horizontal a ' + w + ' px (' + r.ancho + ')');
    if (w < 600) {
      const c = r.piezas.copa, k = c.w / w, centro = (c.l + c.r) / 2;
      comprobar(c.t >= r.piezas.nota.b && k > 0.33 && k < 0.43 && Math.abs(centro - w / 2) < 4, 'hero ' + w + ': la copa va debajo de los botones, centrada y al ' + Math.round(k * 100) + ' % del ancho');
    }
    /* regla del C: tamaño de las fotos de platos (fuera de la copa) */
    const tam = await page.evaluate(() => [...document.querySelectorAll('img[data-plato]')].filter(i => !i.closest('.copa') && i.getBoundingClientRect().width > 0).map(i => {
      const r = i.getBoundingClientRect(), b = i.closest('.capitulo__fotos, .camara__par, .camara__marcas') || i.parentElement;
      return { id: (i.getAttribute('src').match(/fotos\/(.+?)-\d+\.jpg/) || [])[1], w: Math.round(r.width), h: Math.round(r.height), bloque: Math.round(b.getBoundingClientRect().width) };
    }));
    if (w >= 1024) {
      const malas = tam.filter(t => Math.min(t.w, t.h) < 280 || t.w < t.bloque * 0.45);
      comprobar(tam.length >= 16 && malas.length === 0, 'regla del C · ' + w + ' px: las ' + tam.length + ' fotos de platos miden al menos 280 px de lado y el 45 % de su bloque' + (malas.length ? ' ' + JSON.stringify(malas.slice(0, 3)) : ''));
    } else if (w < 600) {
      const malas = tam.filter(t => t.w < t.bloque - 2);
      comprobar(tam.length >= 16 && malas.length === 0, 'regla del C · ' + w + ' px: las ' + tam.length + ' fotos de platos van a todo el ancho de su bloque' + (malas.length ? ' ' + JSON.stringify(malas.slice(0, 3)) : ''));
    }
    if (conCapturas) {
      await page.screenshot({ path: foto(`${w}x${h}-1-hero.png`) });
      for (const [sel, n] of SECCIONES) { await irA(page, sel, 0.04, 1300); await page.screenshot({ path: foto(`${w}x${h}-${n}.png`) }); }
    }
    if (page.errores.length) comprobar(false, 'consola a ' + w + ' px: ' + page.errores[0]);
    await ctx.close();
  }

  /* ═══════════════ 8 · regla del C (filtros), carta y textos ═══════════════ */
  {
    /* sin comentarios: el de cabecera dice «nada de grises, duotonos ni sepia» */
    const css = ['css/estilos.css', 'css/camara.css', 'css/opiniones.css'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    comprobar(!/grayscale|sepia|saturate\(\s*0?\.\d|duotone/i.test(css), 'regla del C · ninguna hoja de estilos apaga el color (sin grayscale, sepia ni saturate < 1)');
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({
      filtros: [...document.querySelectorAll('img[data-plato]')].map(i => getComputedStyle(i).filter + '|' + getComputedStyle(i.parentElement).filter).filter(f => /grayscale|sepia|saturate\(0/.test(f)),
      platos: [...document.querySelectorAll('.plato')].map(p => p.dataset.plato),
      precios: document.querySelectorAll('.capitulos .precio, .platos .precio').length,
      euro: /€/.test([...document.querySelectorAll('.platos')].map(u => u.textContent).join(' ')),
      pie: (document.querySelector('.carta__pie') || {}).textContent
    }));
    comprobar(r.filtros.length === 0, 'regla del C · ningún <img> de plato lleva grayscale, sepia ni saturate(<1)');
    const noVig = carta.platos.filter(p => !p.vigente).map(p => p.id);
    comprobar(r.platos.length === carta.platos.filter(p => p.vigente).length && !r.platos.some(id => noVig.includes(id)), 'carta: salen los ' + r.platos.length + ' platos vigentes y ninguno con vigente:false (' + noVig.join(', ') + ')');
    comprobar(r.precios === 0 && !r.euro, 'carta: con mostrarPrecios:false no hay ni un precio');
    comprobar(r.pie && r.pie.includes('Los platos son elaborados en el momento y requieren un tiempo mínimo de elaboración'), 'carta: lleva el pie literal de su carta');
    const partes = await page.evaluate(() => [...document.querySelectorAll('.capitulo')].map(c => ({ id: c.id, fotos: c.querySelectorAll(':scope > .capitulo__fotos img').length })));
    comprobar(partes.map(p => p.id).join(',') === 'entrantes,del-mar,carnes,postres' && partes.every(p => p.fotos >= 2), 'carta: cuatro capítulos en orden, todos con fotos grandes ' + JSON.stringify(partes));
    /* la copa del hero alterna mar, entrante, carne y postre: nunca dos carnes seguidas */
    const copa = await page.evaluate(() => [...document.querySelectorAll('.copa__foto')].map(i => i.dataset.foto));
    const carnes = new Set(carta.partes.find(p => p.id === 'carnes').fotos.map(f => f.id));
    let seguidas = 0; for (let i = 0; i < copa.length; i++) if (carnes.has(copa[i]) && carnes.has(copa[(i + 1) % copa.length])) seguidas++;
    comprobar(copa.length === 6 && copa[0] === 'DVa0L3MiLZH' && seguidas === 0, 'hero: la copa pasa 6 platos empezando por el pulpo, nunca dos carnes seguidas');
    /* contraste medido en el navegador (color-mix sale como color(srgb …)) */
    const contraste = await page.evaluate(() => {
      const lee = c => { const m = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/); if (m) return [+m[1], +m[2], +m[3]]; const n = c.match(/[\d.]+/g).map(Number); return [n[0] / 255, n[1] / 255, n[2] / 255]; };
      const L = c => { const [r, g, b] = c.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const fondo = lee(getComputedStyle(document.body).backgroundColor);
      return { piedra: cr(lee(getComputedStyle(document.querySelector('.antetitulo')).color), fondo), desc: cr(lee(getComputedStyle(document.querySelector('.plato__desc')).color), fondo) };
    });
    comprobar(contraste.piedra >= 4.5 && contraste.desc >= 4.5, 'contraste: --piedra-texto sobre el hueso ' + contraste.piedra.toFixed(2) + ':1 (AA)');
    /* titulares en mayúsculas con tildes: interlineado ≥ 1,05 */
    const lh = await page.evaluate(() => ['.hero__titulo', '.titular', '.capitulo__titulo', '.camara__titulo'].map(s => { const e = document.querySelector(s); const c = getComputedStyle(e); return { s, k: parseFloat(c.lineHeight) / parseFloat(c.fontSize) }; }));
    comprobar(lh.every(x => x.k >= 1.05 - 1e-3), 'titulares: interlineado ≥ 1,05 con mayúsculas acentuadas ' + lh.map(x => x.s + ' ' + x.k.toFixed(2)).join(' · '));
    await ctx.close();
  }

  /* ═══════════════ 9 · el carril: el diente activo y el salto ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3800);
    await page.mouse.move(700, 450);
    await irA(page, '#entrantes', 0.1, 900);
    const vistos = [];
    for (let i = 0; i < 260; i++) {
      await page.mouse.wheel(0, 160);
      await page.waitForTimeout(70);
      const s = await page.evaluate(() => ({ a: (document.querySelector('.carril__diente.es-activo') || {}).dataset, cur: document.querySelectorAll('.carril__diente[aria-current="true"]').length, fin: document.getElementById('postres').getBoundingClientRect().bottom < innerHeight * 0.5 }));
      const a = s.a && s.a.parte;
      if (a && vistos[vistos.length - 1] !== a) vistos.push(a);
      if (s.fin) break;
    }
    comprobar(vistos.join(',') === 'entrantes,del-mar,carnes,postres', 'carril: el diente activo cambia al cruzar cada capítulo (' + vistos.join(' → ') + ')');
    const fijo = await page.evaluate(() => ({ pos: getComputedStyle(document.getElementById('carril')).position, cur: document.querySelectorAll('.carril__diente[aria-current="true"]').length }));
    comprobar(fijo.pos === 'sticky' && fijo.cur === 1, 'carril: sticky en el margen izquierdo y un solo diente con aria-current');
    await irA(page, '#entrantes', 0.1, 800);
    await page.click('.carril__diente[data-parte="carnes"]');
    await page.waitForTimeout(2200);
    const salto = await page.evaluate(() => ({ top: Math.round(document.getElementById('carnes').getBoundingClientRect().top), cab: document.getElementById('cabecera').offsetHeight, activo: window.Bodeguita.carta.activo }));
    comprobar(Math.abs(salto.top - salto.cab) < 8 && salto.activo === 'carnes', 'carril: el clic en «Carnes» salta a su capítulo (top ' + salto.top + ', activo ' + salto.activo + ')');
    if (conCapturas) await page.screenshot({ path: foto('carril-carnes-activo-1440.png') });
    /* teclado: Tab llega a los dientes y Enter salta */
    await page.focus('.carril__diente[data-parte="postres"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2200);
    const t2 = await page.evaluate(() => Math.round(document.getElementById('postres').getBoundingClientRect().top));
    comprobar(Math.abs(t2 - salto.cab) < 8, 'carril: con teclado (Enter en «Postres») también salta');
    /* el tenedor abriéndose: captura a medio scrub */
    if (conCapturas) {
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
      await irA(page, '#carta-cabeza', 0.42, 900);
      await page.screenshot({ path: foto('tenedor-abriendose-1440.png') });
    }
    await ctx.close();
  }

  /* ═══════════════ 10 · checklist 2 · la pila sticky de opiniones ═══════════════ */
  for (const [w, h] of [[1440, 900], [1366, 768]]) {
    const { ctx, page } = await nuevaPagina({ viewport: { width: w, height: h } });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3800);
    await page.mouse.move(700, 450);
    await irA(page, '#opiniones', 0.6, 1200);
    const info = await page.evaluate(() => ({ alturas: [...document.querySelectorAll('.tarjeta')].map(t => t.offsetHeight), margenes: [...document.querySelectorAll('.pila__item')].map(li => getComputedStyle(li).marginBottom), desapilada: document.getElementById('pila').classList.contains('es-desapilada'), tope: document.getElementById('cabecera').offsetHeight + innerHeight * 0.03 }));
    comprobar(!info.desapilada && new Set(info.alturas).size === 1 && new Set(info.margenes).size === 1, 'checklist 2 · ' + w + ': todas las tarjetas igual de altas (' + info.alturas[0] + ' px) y el mismo margin-bottom, la última incluida');
    const muestras = [];
    for (let i = 0; i < 160; i++) {
      await page.mouse.wheel(0, 90);
      await page.waitForTimeout(90);
      const s = await page.evaluate(() => [...document.querySelectorAll('.tarjeta')].map(t => { const r = t.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }));
      muestras.push(s);
      if (s[s.length - 1][1] < 0) break;
    }
    const n = info.alturas.length, tope = info.tope;
    const asentada = muestras.findIndex(s => Math.abs(s[n - 1][0] - tope) <= 2);
    let antes = 0, asoma = 0, separadas = 0;
    muestras.forEach((s, k) => {
      if (asentada < 0 || k < asentada) s.slice(0, n - 1).forEach(([t]) => { if (t <= tope + 2 && t < tope - 2) antes++; });
      if (Math.abs(s[n - 1][0] - tope) <= 2) s.slice(0, n - 1).forEach(([, b]) => { if (b > s[n - 1][1] + 1) asoma++; });
      if (s.every(([t]) => t < tope - 4)) { const tops = s.map(x => x[0]); if (Math.max(...tops) - Math.min(...tops) > 3) separadas++; }
    });
    comprobar(asentada >= 0 && antes === 0, 'checklist 2 · ' + w + ': ninguna tarjeta se suelta antes de que se pose la última');
    comprobar(asoma === 0, 'checklist 2 · ' + w + ': nada asoma por debajo de la última');
    comprobar(separadas === 0, 'checklist 2 · ' + w + ': al acabarse, las tarjetas salen todas juntas');
    if (conCapturas && w === 1440) {
      await irA(page, '#opiniones', 0.02, 600); await rueda(page, 6, 240, 120); await page.waitForTimeout(900);
      await page.screenshot({ path: foto('opiniones-pila-1440.png') });
    }
    await ctx.close();
  }

  /* ═══════════════ 11 · la cámara: etiquetas, <dialog>, Escape y marcas ═══════════════ */
  {
    const camara = JSON.parse(fs.readFileSync(path.join(raiz, 'data/camara.json'), 'utf8'));
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3800);
    const dom = await page.evaluate(() => document.body.outerHTML);
    comprobar(camara.marcas === false && !MARCAS.test(dom), 'cámara: con "marcas": false no sale ninguna marca del proveedor en el DOM (ni la foto Dc9VI6iI7UD)');
    await page.mouse.move(700, 450);
    await irA(page, '#camara', 0.05, 1200);
    /* el péndulo: al pasar por encima se balancea y se para solo */
    const b0 = await page.locator('.etiqueta').first().boundingBox();
    await page.mouse.move(b0.x - 30, b0.y + b0.height / 2); await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2, { steps: 4 });
    const angulos = [];
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(60); angulos.push(await page.evaluate(() => window.Bodeguita.camara.botones[0]._pendulo.angulo)); }
    await page.waitForTimeout(2500);
    const quieto = await page.evaluate(() => window.Bodeguita.camara.botones[0]._pendulo.angulo);
    comprobar(Math.max(...angulos.map(Math.abs)) > 1 && angulos.some(a => a > 0) && angulos.some(a => a < 0) && quieto === 0, 'cámara: la etiqueta se balancea como un péndulo amortiguado y se para sola');
    if (conCapturas) await page.screenshot({ path: foto('camara-1440.png') });
    let bien = 0; const malas = [];
    for (const e of camara.etiquetas) {
      await page.click('.etiqueta[data-etiqueta="' + e.id + '"]');
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => ({ open: document.getElementById('camara-dialogo').open, nombre: document.getElementById('ficha-nombre').textContent, img: !!document.querySelector('#ficha-cuerpo img'), texto: (document.querySelector('#ficha-cuerpo .ficha__texto') || {}).textContent }));
      if (conCapturas && e.id === 'chuleton') await page.screenshot({ path: foto('camara-ficha-1440.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const f = await page.evaluate(() => ({ open: document.getElementById('camara-dialogo').open, foco: document.activeElement && document.activeElement.dataset.etiqueta }));
      const ok = r.open && r.nombre === e.nombre && r.img && (!e.texto || r.texto === e.texto) && !f.open && f.foco === e.id;
      if (ok) bien++; else malas.push(e.id + ' ' + JSON.stringify([r, f]));
    }
    comprobar(bien === camara.etiquetas.length, 'cámara: cada etiqueta abre su <dialog> con su foto y su texto, Escape lo cierra y el foco vuelve a la etiqueta (' + bien + '/' + camara.etiquetas.length + ')' + (malas.length ? ' ' + malas.join(' | ') : ''));
    comprobar(page.errores.length === 0, 'consola limpia con la cámara' + (page.errores.length ? ': ' + page.errores[0] : ''));
    await ctx.close();
  }

  /* ═══════════════ 12 · franjas, enlaces, mapa ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina({ reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(700);
    const f = await page.evaluate(() => {
      const filas = [...document.querySelectorAll('.franja-dia')].filter(li => li.getBoundingClientRect().height > 0 && getComputedStyle(li).display !== 'none' && getComputedStyle(li).visibility !== 'hidden');
      const hoy = filas.filter(li => li.classList.contains('es-hoy'));
      return { filas: filas.length, hoy: hoy.length, hoyDia: hoy[0] && hoy[0].dataset.dia, barras: filas.every(li => li.querySelectorAll('.franja').length === 2 && [...li.querySelectorAll('.franja')].every(b => b.getBoundingClientRect().width > 20)), dia: new Date().getDay(), radio: getComputedStyle(document.querySelector('.franja')).borderRadius };
    });
    comprobar(f.filas === 7 && f.hoy === 1 && +f.hoyDia === f.dia && f.barras && f.radio === '0px', 'checklist 9 · franjas: 7 filas visibles, una es-hoy (la de hoy) y dos barras macizas de extremos rectos por día');
    const enlaces = await page.evaluate(() => ({ tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href')), wa: document.getElementById('whatsapp'), waOff: document.getElementById('whatsapp').disabled && document.getElementById('whatsapp').tagName === 'BUTTON', maps: document.querySelector('a[href*="google.com/maps/dir"]') !== null }));
    comprobar(enlaces.tel.length >= 3 && enlaces.tel.every(h => h === 'tel:+34924194420'), 'enlaces: todos los tel: bien formados (tel:+34924194420 · ' + enlaces.tel.length + ')');
    comprobar(enlaces.waOff, 'enlaces: WhatsApp apagado con "whatsapp": null');
    comprobar(enlaces.maps, 'reservar: «Cómo llegar» abre Google Maps con la ruta');
    const antes = await page.evaluate(() => document.querySelectorAll('iframe').length);
    await page.click('.map-consent');
    const src = await page.evaluate(() => (document.querySelector('.mapa iframe') || {}).src || '');
    comprobar(antes === 0 && src.includes('maps?q=La+otra+bodeguita,+C.+L%C3%B3pez+Asme+6,+Zafra&output=embed'), 'mapa: no hay iframe hasta pulsar .map-consent');
    const ld = await page.evaluate(() => JSON.parse(document.getElementById('datos-estructurados').textContent));
    comprobar(ld['@type'] === 'Restaurant' && ld.servesCuisine === 'Mediterránea' && ld.priceRange === '20–30 €' && ld.address.streetAddress && ld.telephone && ld.openingHoursSpecification.length >= 2 && ld.aggregateRating && ld.aggregateRating.ratingCount === '528',
      'JSON-LD Restaurant con dirección, teléfono, cocina, precio, horario del JSON y aggregateRating (con el módulo de opiniones)');
    await ctx.close();
  }

  /* ═══════════════ 13 · borrado de la cámara y de las opiniones, en copias temporales ═══════════════ */
  for (const [modulo, script, puerto] of [['camara', 'quitar-camara.mjs', 4212], ['opiniones', 'quitar-opiniones.mjs', 4213]]) {
    const tmp = tmpCopia(modulo);
    execFileSync(process.execPath, [path.join(raiz, 'scripts', script), tmp], { stdio: 'ignore' });
    const s2 = await servir(tmp, puerto);
    const c2 = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
    await c2.addInitScript(() => { try { localStorage.setItem('lob-cookies', 'ok'); } catch (e) {} });
    const p2 = await c2.newPage(); const err2 = [], resp2 = [];
    p2.on('console', m => { if (m.type() === 'error') err2.push(m.text()); });
    p2.on('pageerror', e => err2.push(e.message));
    p2.on('response', rr => { if (rr.status() >= 400) resp2.push(rr.status() + ' ' + rr.url()); });
    await p2.goto('http://127.0.0.1:' + puerto + '/', { waitUntil: 'load' });
    await p2.waitForTimeout(3800);
    await p2.mouse.move(700, 450);
    await hastaAbajo(p2);
    const q = await p2.evaluate(m => ({
      seccion: !!document.querySelector('[data-modulo="' + m + '"]'),
      archivos: [...document.querySelectorAll('link[rel="stylesheet"], script[src]')].some(n => (n.href || n.src).includes('/' + m + '.')),
      orden: [...document.querySelectorAll('main section[id]')].filter(s => !s.parentElement.closest('section')).map(s => s.id).join(','),
      capitulos: [...document.querySelectorAll('.capitulo')].map(c => c.id).join(','),
      ld: JSON.parse(document.getElementById('datos-estructurados').textContent),
      pie: window.Bodeguita.pie && Math.abs(window.Bodeguita.pie.x0 - window.Bodeguita.pie.x1) < 2,
      off: parseFloat(getComputedStyle(document.getElementById('pie-copa-d')).strokeDashoffset)
    }), modulo);
    const ordenEsperado = modulo === 'opiniones' ? 'inicio,la-casa,cinta,carta,en-la-plaza,horario,reservar' : 'inicio,la-casa,cinta,carta,en-la-plaza,opiniones,horario,reservar';
    comprobar(!q.seccion && !q.archivos && !fs.existsSync(path.join(tmp, 'css', modulo + '.css')) && !fs.existsSync(path.join(tmp, 'js', modulo + '.js')), 'borrado de ' + modulo + ': sin sección, sin hoja, sin script y sin archivos');
    comprobar(q.orden === ordenEsperado && q.capitulos === 'entrantes,del-mar,carnes,postres', 'borrado de ' + modulo + ': el resto sigue en orden (' + q.orden + ')');
    if (modulo === 'opiniones') comprobar(!('aggregateRating' in q.ld) && !(await p2.evaluate(() => !!document.querySelector('a[href="#opiniones"]'))), 'borrado de opiniones: sin enlace en el menú y sin aggregateRating en el JSON-LD');
    comprobar(err2.length === 0 && resp2.length === 0 && q.pie && q.off < 0.01, 'borrado de ' + modulo + ': sin errores, sin 404 y el pie sigue cayendo en el tenedor' + (err2[0] ? ': ' + err2[0] : '') + (resp2[0] ? ' ' + resp2[0] : ''));
    await c2.close(); s2.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  /* ═══════════════ 14 · densidades: sin ?revision no hay mando; las dos versiones; la hoja ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const sin = await page.evaluate(() => ({ hidden: document.getElementById('mando').hidden, d: getComputedStyle(document.getElementById('mando')).display, imprimir: getComputedStyle(document.getElementById('imprimir')).display }));
    comprobar(sin.hidden && sin.d === 'none' && sin.imprimir === 'none', 'sin ?revision no hay mando (ni botón de imprimir)');
    await ctx.close();
  }
  {
    const { ctx, page } = await nuevaPagina({}, { cookiesVistas: false });
    await page.goto(BASE + '?revision', { waitUntil: 'load' }); await page.waitForTimeout(3800);
    const conCookies = await page.evaluate(() => getComputedStyle(document.getElementById('mando')).visibility);
    await page.click('#cookies-aceptar'); await page.waitForTimeout(500);
    const r0 = await page.evaluate(() => ({ vis: getComputedStyle(document.getElementById('mando')).visibility, avisos: window.Bodeguita.mando.avisos }));
    comprobar(conCookies === 'hidden' && r0.vis === 'visible', 'mando: se aparta mientras está el aviso de cookies y aparece al cerrarlo');
    const a = r0.avisos.join(' | ');
    comprobar(/Horario de Google: no cuadra con Instagram ni con el cartel de 2024/.test(a) && /Precios de febrero de 2024: pendientes de confirmar/.test(a) && /Platos sin publicar/.test(a) && /Distancias/.test(a) && /marcas/.test(a) && /casa hermana/.test(a), 'mando: lista los avisos pendientes (horario, precios, no vigentes, distancias, marcas, la casa hermana)');
    await page.locator('#mando-avisos summary').click();
    await page.check('#mando-precios'); await page.waitForTimeout(300);
    const pr = await page.evaluate(() => ({ n: document.querySelectorAll('.plato .precio').length, aviso: (document.getElementById('aviso-precios') || {}).textContent }));
    comprobar(pr.n >= 10 && /Precios de febrero de 2024: pendientes de confirmar/.test(pr.aviso || ''), 'mando: el interruptor enseña los precios de 2024 con su aviso (' + pr.n + ')');
    await page.uncheck('#mando-precios'); await page.waitForTimeout(200);
    if (conCapturas) await page.screenshot({ path: foto('densidad-copa-1440.png') });
    await page.click('[data-densidad="sobria"]'); await page.waitForTimeout(1300);
    const s = await page.evaluate(() => ({
      clase: document.documentElement.classList.contains('densidad-sobria'),
      pie: getComputedStyle(document.getElementById('pie-copa')).display,
      carril: getComputedStyle(document.getElementById('carril')).display,
      filas: getComputedStyle(document.querySelector('.cinta__fila')).display,
      quieta: getComputedStyle(document.querySelector('.cinta__quieta')).display,
      reflejo: getComputedStyle(document.getElementById('cristal-reflejo')).display,
      tabs: document.querySelectorAll('#indice [role="tab"]').length,
      paneles: [...document.querySelectorAll('.capitulo')].filter(c => !c.hidden).map(c => c.id),
      imprimir: getComputedStyle(document.getElementById('imprimir')).display,
      tenedor: document.getElementById('tenedor').getBoundingClientRect().height > 50,
      ancho: document.documentElement.scrollWidth, vw: innerWidth
    }));
    comprobar(s.clase && s.pie === 'none' && s.carril === 'none' && s.filas === 'none' && s.quieta === 'block' && s.reflejo === 'none' && s.tenedor, 'sobria: fuera el pie largo, el carril, la cinta en movimiento y el reflejo; el tenedor sigue en la carta');
    comprobar(s.tabs === 4 && s.paneles.join() === 'entrantes' && s.imprimir !== 'none', 'sobria: la carta en cuatro pestañas que salen de los dientes, y el botón «Carta para imprimir»');
    comprobar(s.ancho <= s.vw, 'sobria: sin desbordamiento horizontal');
    await irA(page, '#carta-cabeza', 0.05, 800);
    await page.click('#indice [data-parte="carnes"]'); await page.waitForTimeout(400);
    const tab = await page.evaluate(() => ({ sel: document.querySelector('#indice [aria-selected="true"]').dataset.parte, vis: [...document.querySelectorAll('.capitulo')].filter(c => !c.hidden).map(c => c.id).join(), fotos: [...document.querySelectorAll('#carnes img[data-plato]')].filter(i => i.getBoundingClientRect().width > 0).map(i => { const b = i.closest('.capitulo__fotos, .camara__par'); return i.getBoundingClientRect().width / b.getBoundingClientRect().width; }) }));
    comprobar(tab.sel === 'carnes' && tab.vis === 'carnes' && tab.fotos.length >= 2 && tab.fotos.every(k => k >= 0.45), 'sobria: la pestaña «Carnes» enseña su capítulo con las fotos grandes (≥ 45 %)');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    const tab2 = await page.evaluate(() => document.activeElement.dataset.parte);
    comprobar(tab2 === 'postres', 'sobria: las pestañas se recorren con las flechas');
    if (conCapturas) { await page.screenshot({ path: foto('densidad-sobria-carta-1440.png') }); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); await page.screenshot({ path: foto('densidad-sobria-1440.png') }); }
    /* la hoja de impresión: un solo A4 con los cuatro capítulos y el logo */
    await page.emulateMedia({ media: 'print' });
    const hoja = await page.evaluate(() => ({ hoja: getComputedStyle(document.getElementById('hoja-carta')).display, main: getComputedStyle(document.getElementById('contenido')).display, partes: document.querySelectorAll('.hoja__parte').length, logo: !!document.querySelector('.hoja__logo'), platos: document.querySelectorAll('.hoja__parte li').length }));
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    if (conCapturas) fs.writeFileSync(foto('carta-para-imprimir.pdf'), pdf);
    comprobar(hoja.hoja === 'block' && hoja.main === 'none' && hoja.partes === 4 && hoja.logo && hoja.platos === carta.platos.filter(p => p.vigente).length && paginas === 1, 'sobria: «Carta para imprimir» sale en ' + paginas + ' página A4 con los cuatro capítulos, ' + hoja.platos + ' platos y el logo');
    await page.emulateMedia({ media: 'screen' });
    await page.click('[data-densidad="copa"]'); await page.waitForTimeout(1300);
    const v = await page.evaluate(() => ({ clase: document.documentElement.classList.contains('densidad-copa'), pie: getComputedStyle(document.getElementById('pie-copa')).display, paneles: [...document.querySelectorAll('.capitulo')].filter(c => !c.hidden).length, tabs: document.querySelectorAll('#indice [role="tab"]').length }));
    comprobar(v.clase && v.pie !== 'none' && v.paneles === 4 && v.tabs === 0, 'densidades: se puede volver a «De la copa al tenedor»');
    comprobar(page.errores.length === 0, 'consola limpia en modo revisión' + (page.errores.length ? ': ' + page.errores[0] : ''));
    await ctx.close();
  }
  /* la copia que viaja al cliente, sin mando, comprobada contra los archivos */
  {
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'bodeguita-entrega-'));
    execFileSync(process.execPath, [path.join(raiz, 'scripts/quitar-mando.mjs'), destino], { stdio: 'ignore' });
    let ok = true;
    try { execFileSync(process.execPath, [path.join(raiz, 'scripts/comprobar-borrado.mjs'), destino], { stdio: 'ignore' }); } catch (e) { ok = false; }
    comprobar(ok, 'quitar-mando.mjs + comprobar-borrado.mjs: la copia de entrega sale sin rastros del mando');
    fs.rmSync(destino, { recursive: true, force: true });
  }

  /* ═══════════════ 15 · textos prohibidos, legales y estáticos ═══════════════ */
  {
    const { ctx, page } = await nuevaPagina();
    const prohibido = [/asador/i, /inolvidable/i, /explosi[oó]n de sabores/i, /para[ií]so/i, /Restautante/, /\bla bodeguita\b/i, /pura poes[ií]a/i, /el mejor de zafra/i];
    const permitidas = ['Buen sitio para picar, buena calidad y buena carta de cervezas.',
      'Surtido de ibéricos riquísimo y presa ibérica muy bien hecha y de gran calidad.',
      'Excelente el sabor de la carne y la variedad de platos que tienen en la carta. Imposible salir con hambre.',
      'Excelente opción si te gusta la carne. Cenamos en la terraza, con un ambiente acogedor y tranquilo. El camarero fue en todo momento muy amable y atento, y nos asesoró sobre los cortes disponibles.',
      'Excelente servicio, tanto los camareros como los cocineros son muy agradables. La comida está espectacular, y tienen mucha variedad, incluidas opciones para celíacos. Las carnes están increíbles. En la terraza se está fenomenal. Si no sabéis dónde comer en Zafra, recomendadísimo este sitio!'];
    for (const pag of ['', 'aviso-legal.html', 'privacidad.html', 'no-existe']) {
      const res = await page.goto(BASE + pag, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => ({ texto: document.body.textContent + ' ' + document.title + ' ' + [...document.querySelectorAll('[alt], [aria-label], [title]')].map(n => n.getAttribute('alt') || n.getAttribute('aria-label') || n.getAttribute('title')).join(' '), robots: (document.querySelector('meta[name="robots"]') || {}).content, primera: document.head.firstElementChild.getAttribute('charset') }));
      const malos = prohibido.filter(re => re.test(r.texto)).map(String);
      comprobar(malos.length === 0, 'textos prohibidos en /' + pag + ': ' + (malos.join(', ') || 'ninguno'));
      comprobar(r.robots === 'noindex, nofollow' && r.primera === 'utf-8', 'noindex en /' + pag);
      if (pag === '') {
        const citas = await page.evaluate(() => [...document.querySelectorAll('.tarjeta')].map(t => ({ q: t.querySelector('blockquote').textContent.trim(), f: t.querySelector('figcaption').textContent.trim() })));
        comprobar(citas.length === 5 && citas.every(c => permitidas.includes(c.q)), 'opiniones: las 5 citas, literales y sin recortar');
        comprobar(citas.every(c => c.f === 'Opinión en Google'), 'opiniones: ninguna cita lleva nombre (todas «Opinión en Google»)');
        comprobar(!/\[PENDIENTE\]|\bTODO\b/.test(r.texto) && !/lorem ipsum/i.test(r.texto), 'portada sin [PENDIENTE], TODO ni relleno');
        const og = await page.evaluate(() => document.querySelector('meta[property="og:image"]').content);
        comprobar(fs.existsSync(path.join(raiz, og)), 'og:image hecha a propósito existe (' + og + ')');
        const v = await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"], script[src]')].map(n => n.getAttribute('href') || n.getAttribute('src')).filter(u => !/^https?:/.test(u)));
        comprobar(v.length === 6 && v.every(u => /\?v=[0-9a-f]{8}$/.test(u)), 'CSS y JS propios versionados con ?v=<huella> (' + v.length + ')');
        comprobar(!(await page.evaluate(() => document.documentElement.outerHTML)).includes('cdnjs.cloudflare.com/ajax/libs/lenis'), 'Lenis no sale de cdnjs (404 silencioso)');
        const pend = await page.evaluate(() => document.querySelectorAll('.pendiente').length);
        comprobar(pend === 0, 'la portada no enseña marcas de pendiente');
      }
      if (pag === 'aviso-legal.html') comprobar(/Titular: \[PENDIENTE\]/.test(r.texto) && /NIF: \[PENDIENTE\]/.test(r.texto), 'aviso legal: titular y NIF como [PENDIENTE]');
      if (pag === 'no-existe') comprobar(res.status() === 404, '404.html responde en una ruta que no existe');
    }
    /* checklist 9 · clases de estado con prefijo (estático) */
    const js = ['js/main.js', 'js/camara.js', 'js/opiniones.js'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n');
    const clases = [...js.matchAll(/classList\.(?:add|toggle|remove)\('([^']+)'/g)].map(m => m[1]);
    const sinPrefijo = [...new Set(clases)].filter(c => !/^(es-|con-|sin-|cursor|menu-abierto|cabecera--|cortina-fuera|densidad-|cookies-visibles)/.test(c));
    comprobar(sinPrefijo.length === 0, 'checklist 9 · clases de estado con prefijo (es-…): ' + (sinPrefijo.join(', ') || 'todas'));
    const css = ['css/estilos.css', 'css/camara.css', 'css/opiniones.css'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n');
    const sueltas = css.match(/(^|[},])\s*\.es-[a-z-]+\s*[{,]/gm) || [];
    const bloques = new Set([...fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)).filter(c => !c.startsWith('es-')));
    const estados = [...new Set(clases.filter(c => c.startsWith('es-')).map(c => c.slice(3)))];
    const chocan = estados.filter(e => bloques.has(e));
    comprobar(sueltas.length === 0 && chocan.length === 0, 'checklist 9 · ninguna clase de estado coincide con un bloque' + (sueltas.length || chocan.length ? ': ' + sueltas.concat(chocan).join(' ') : ''));
    /* checklist 8 · todos los tweens de strokeDashoffset hacia 0 llevan autoRound:false */
    const tweens = [...js.matchAll(/\w+\.(to|fromTo)\(\s*[\w#'".-]+\s*,\s*\{[^}]*strokeDashoffset:\s*(?:0|off)\b[^}]*\}/g)].map(m => m[0]);
    const sinAuto = tweens.filter(t => !/autoRound:\s*false/.test(t));
    comprobar(tweens.length >= 2 && sinAuto.length === 0, 'checklist 8 · los tweens de strokeDashoffset llevan autoRound:false (' + tweens.length + ')');
    await ctx.close();
  }
} catch (e) {
  comprobar(false, 'el script se ha caído: ' + (e && e.stack || e));
} finally {
  await navegador.close();
  servidor.close();
}

console.log(notas.join('\n'));
if (fallos.length) console.log('\n' + fallos.join('\n'));
console.log('\n' + notas.length + ' bien · ' + fallos.length + ' mal');
process.exitCode = fallos.length ? 1 : 0;
