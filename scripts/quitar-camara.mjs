/* Quita el módulo «La cámara» (dentro de Carnes) de una carpeta de la web.

   node scripts/quitar-camara.mjs ../copia-de-la-web     (sobre una copia)
   node scripts/quitar-camara.mjs --aqui                 (en esta misma carpeta, sin vuelta atrás)

   Lo que hace es exactamente la receta del README:
     1. index.html: borra la <section id="camara"> entre sus marcas
        «[MÓDULO CÁMARA]» y las dos líneas con data-modulo="camara":
        el <link> de su hoja y el <script>.
     2. Si el mando de maqueta sigue, deja de avisar de "marcas": false.
     3. Borra css/camara.css, js/camara.js y data/camara.json
        (construir.mjs ya sabe pintar la web sin cámara).
     4. Vuelve a versionar CSS y JS (?v=).
   No toca nada más: main.js y estilos.css no dependen del módulo; el capítulo
   de Carnes sigue con su lista, sus fotos y su frase.
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
if (!arg) { console.error('Uso: node scripts/quitar-camara.mjs <carpeta> | --aqui'); process.exit(1); }
const raiz = arg === '--aqui' ? aqui : path.resolve(arg);

const ruta = path.join(raiz, 'index.html');
const antes = fs.readFileSync(ruta, 'utf8');
let t = antes;
const bloque = /[ \t]*<!-- ═+ \[MÓDULO CÁMARA\][^>]*-->[\s\S]*?<!-- ═+ fin \[MÓDULO CÁMARA\] ═+ -->\r?\n?/;
if (!bloque.test(t)) { console.error('No encuentro las marcas [MÓDULO CÁMARA] en index.html: ¿ya se quitó?'); process.exit(1); }
t = t.replace(bloque, '');
const lineas = t.split(/\r?\n/);
const quedan = lineas.filter(l => !/data-modulo="camara"/.test(l));
const quitadas = lineas.length - quedan.length;
t = quedan.join('\n');
/* el mando (si sigue) ya no tiene marcas de las que avisar */
t = t.replace(/(<script type="application\/json" id="mando-datos">)([\s\S]*?)(<\/script>)/, (todo, a, json, c) => {
  const datos = JSON.parse(json);
  datos.marcas = null;
  return a + JSON.stringify(datos) + c;
});
if (t.length < antes.length * 0.6) { console.error('Me niego: index.html perdería demasiado.'); process.exit(1); }
fs.writeFileSync(ruta, t);
console.log('index.html: sección de la cámara quitada y ' + quitadas + ' líneas con data-modulo="camara" (hoja y script)');

for (const f of ['css/camara.css', 'js/camara.js', 'data/camara.json']) {
  const r = path.join(raiz, f);
  if (fs.existsSync(r)) { fs.rmSync(r); console.log('borrado ' + f); }
}
execFileSync(process.execPath, [path.join(aqui, 'scripts/versionar.mjs'), raiz], { stdio: 'ignore' });
console.log('Módulo de la cámara quitado de ' + raiz);
