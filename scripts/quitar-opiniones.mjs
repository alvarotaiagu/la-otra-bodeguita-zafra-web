/* Quita el módulo «Opiniones» de una carpeta de la web.

   node scripts/quitar-opiniones.mjs ../copia-de-la-web     (sobre una copia)
   node scripts/quitar-opiniones.mjs --aqui                 (en esta misma carpeta, sin vuelta atrás)

   Lo que hace es exactamente la receta del README:
     1. index.html: borra la <section id="opiniones"> entre sus marcas
        «[MÓDULO OPINIONES]» y las tres líneas con data-modulo="opiniones":
        el enlace del menú, el <link> de su hoja y el <script>.
     2. Quita "aggregateRating" del JSON-LD (sin el módulo, la web no enseña
        las opiniones, así que tampoco las declara).
     3. Borra css/opiniones.css y js/opiniones.js.
     4. Vuelve a versionar CSS y JS (?v=).
   No toca nada más: main.js y estilos.css no dependen del módulo.
   verificar.mjs lo ejecuta sobre una copia temporal y comprueba que la web
   sigue sin errores y con el resto de secciones en orden.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
if (!arg) { console.error('Uso: node scripts/quitar-opiniones.mjs <carpeta> | --aqui'); process.exit(1); }
const raiz = arg === '--aqui' ? aqui : path.resolve(arg);

const ruta = path.join(raiz, 'index.html');
const antes = fs.readFileSync(ruta, 'utf8');
let t = antes;
const bloque = /[ \t]*<!-- ═+ \[MÓDULO OPINIONES\][^>]*-->[\s\S]*?<!-- ═+ fin \[MÓDULO OPINIONES\] ═+ -->\r?\n?/;
if (!bloque.test(t)) { console.error('No encuentro las marcas [MÓDULO OPINIONES] en index.html: ¿ya se quitó?'); process.exit(1); }
t = t.replace(bloque, '');
const lineas = t.split(/\r?\n/);
const quedan = lineas.filter(l => !/data-modulo="opiniones"/.test(l));
const quitadas = lineas.length - quedan.length;
t = quedan.join('\n');
/* JSON-LD: fuera aggregateRating */
t = t.replace(/(<script type="application\/ld\+json" id="datos-estructurados">)([\s\S]*?)(<\/script>)/, (todo, a, json, c) => {
  const datos = JSON.parse(json);
  delete datos.aggregateRating;
  return a + '\n' + JSON.stringify(datos, null, 2) + '\n' + c;
});
if (t.length < antes.length * 0.6) { console.error('Me niego: index.html perdería demasiado.'); process.exit(1); }
fs.writeFileSync(ruta, t);
console.log('index.html: sección quitada, ' + quitadas + ' líneas con data-modulo="opiniones" (menú, hoja y script) y aggregateRating fuera del JSON-LD');

for (const f of ['css/opiniones.css', 'js/opiniones.js']) {
  const r = path.join(raiz, f);
  if (fs.existsSync(r)) { fs.rmSync(r); console.log('borrado ' + f); }
}
execFileSync(process.execPath, [path.join(aqui, 'scripts/versionar.mjs'), raiz], { stdio: 'ignore' });
console.log('Módulo de opiniones quitado de ' + raiz);
