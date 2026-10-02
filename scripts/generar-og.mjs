/* og:image hecha a propósito (1200 × 630): el logo sobre el hueso y, a la
   derecha, la copa del logo con el pulpo a la plancha dentro del vino.
   Se compone en HTML y se fotografía con Playwright.

   node scripts/generar-og.mjs   → assets/og-la-otra-bodeguita.jpg
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'file:///C:/Users/alvar/Desktop/WEBS%20NEGOCIOS/alvarotaiagu.github.io/node_modules/playwright/index.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { medidas: M, paths: P } = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/logo/logo-piezas.json'), 'utf8'));
/* en base64: una página about:blank no puede leer file:// */
const pulpo = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(raiz, 'assets/fotos/DVa0L3MiLZH-960.jpg')).toString('base64');
const vb = c => c.join(' ');
const [vx, vy, vw, vh] = M.vino;
/* la foto cubre el vino centrada en el pulpo (960 × 640) */
const ih = vh * 1.1, iw = ih * 1.5;
const W = 1200, H = 630;
const tinta = '#161514';
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@700&display=swap" rel="stylesheet">
<style>
  body{margin:0;width:${W}px;height:${H}px;background:#F4F1EC;position:relative;overflow:hidden;font-family:'Josefin Sans',sans-serif}
  .logo{position:absolute;left:78px;top:142px;width:540px}
  .logo svg{width:100%;height:auto;overflow:visible}
  .lugar{position:absolute;left:84px;top:66px;margin:0;font:700 21px/1 'Josefin Sans';letter-spacing:.26em;text-transform:uppercase;color:#68635D}
  .lugar::before{content:"";display:inline-block;width:5px;height:20px;margin-right:14px;background:${tinta};vertical-align:-3px}
  .copa{position:absolute;right:120px;top:30px;height:600px}
  .copa svg{height:100%;width:auto;overflow:visible}
</style></head><body>
<div class="logo"><svg viewBox="${vb(M.logo)}"><path fill="${tinta}" d="${P.letras}"/><path fill="${tinta}" d="${P.caliz}"/><path fill="${tinta}" d="${P.tenedor}"/><path fill="${tinta}" d="${P.vino}"/><path fill="${tinta}" d="${P.salpicadura}"/></svg></div>
<p class="lugar">De la copa al tenedor · Zafra</p>
<div class="copa"><svg viewBox="${vb(M.copa)}">
  <defs><clipPath id="v"><path d="${P.vino}"/></clipPath></defs>
  <g clip-path="url(#v)"><image href="${pulpo}" x="${vx + vw / 2 - iw / 2}" y="${vy - vh * 0.05}" width="${iw}" height="${ih}" preserveAspectRatio="none"/></g>
  <path fill="${tinta}" d="${P.caliz}"/><path fill="${tinta}" d="${P.salpicadura}"/>
</svg></div>
</body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: W, height: H } });
await pagina.setContent(html, { waitUntil: 'networkidle' });
await pagina.screenshot({ path: path.join(raiz, 'assets/og-la-otra-bodeguita.jpg'), type: 'jpeg', quality: 88 });
await navegador.close();
console.log('assets/og-la-otra-bodeguita.jpg');
