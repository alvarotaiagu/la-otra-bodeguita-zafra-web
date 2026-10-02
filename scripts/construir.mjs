/* Pinta en index.html todo lo que sale de los datos, entre sus marcas
   <!-- gen:NOMBRE --> … <!-- /gen:NOMBRE -->:

     data/carta.json     los cuatro capítulos (solo platos con vigente:true; los
                         precios solo si mostrarPrecios:true), la cinta, el pie
                         de la carta y la hoja para imprimir
     data/horario.json   las franjas, la frase de «La casa» y el JSON-LD
     data/camara.json    el módulo «La cámara» (etiquetas, fichas, brasa y piedra;
                         con "marcas": false no sale ninguna marca del proveedor)
     data/plaza.json     las distancias medidas y «Para ver»
     data/config.json    el botón de WhatsApp (apagado con null)
     data/fotos.json     cada <picture data-foto="ID"> con AVIF/WebP/JPG
     assets/logo/logo-piezas.json  los símbolos del logo, la copa del hero y el tenedor

   Además escribe el viewBox real de cada <svg data-vb="logo|copa|tenedor">.
   Idempotente: la segunda pasada dice «sin cambios».

   node scripts/construir.mjs           (escribe)
   node scripts/construir.mjs --comprobar  (no escribe; sale con 1 si el HTML no está al día)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => JSON.parse(fs.readFileSync(path.join(raiz, f), 'utf8'));
const carta = leer('data/carta.json');
const horario = leer('data/horario.json');
const plaza = leer('data/plaza.json');
const config = leer('data/config.json');
const fotos = Object.fromEntries(leer('data/fotos.json').fotos.map(f => [f.id, f]));
const logo = leer('assets/logo/logo-piezas.json');
const camaraRuta = path.join(raiz, 'data/camara.json');
const camara = fs.existsSync(camaraRuta) ? JSON.parse(fs.readFileSync(camaraRuta, 'utf8')) : null;
const M = logo.medidas, P = logo.paths;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const vb = c => c.map(v => +(+v).toFixed(2)).join(' ');
const num = v => +(+v).toFixed(2);
const platosVigentes = carta.platos.filter(p => p.vigente);
const porId = Object.fromEntries(carta.platos.map(p => [p.id, p]));
const precio = v => (v == null ? '' : String(v).replace('.', ',') + ' €');

/* ───────── fotos ───────── */
export function picture(id, { sizes = '100vw', carga = 'lazy', alt = null, sangria = '', clase = '' } = {}) {
  const f = fotos[id];
  if (!f || !f.anchos) throw new Error('Foto sin versiones (node scripts/fotos.mjs): ' + id);
  const set = ext => f.anchos.map(a => `assets/fotos/${id}-${a}.${ext} ${a}w`).join(', ');
  const mayor = f.anchos[f.anchos.length - 1];
  const alto = Math.round(f.h * mayor / f.w);
  const extra = carga === 'eager' ? ' fetchpriority="high"' : ' loading="lazy"';
  const plato = f.tipo === 'plato' ? ' data-plato' : '';
  return [
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`,
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`,
    `<img${clase ? ` class="${clase}"` : ''} src="assets/fotos/${id}-${mayor}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${mayor}" height="${alto}" alt="${esc(alt ?? f.alt)}" decoding="async"${extra}${plato}>`
  ].map(l => sangria + l).join('\n');
}
const pic = (id, sizes, sangria = '') => `<picture data-foto="${id}" data-sizes="${sizes}">\n${picture(id, { sizes, sangria: sangria + '  ' })}\n${sangria}</picture>`;

/* ───────── logo: símbolos ───────── */
const tinta = 'style="fill:var(--tinta-logo,#161514)"';
const simbolos = `<svg class="simbolos" width="0" height="0" aria-hidden="true" focusable="false"><defs>` +
  `<path id="lb-letras" ${tinta} d="${P.letras}"/>` +
  `<path id="lb-caliz" ${tinta} d="${P.caliz}"/>` +
  `<path id="lb-tenedor-p" ${tinta} d="${P.tenedor}"/>` +
  `<path id="lb-vino" style="fill:var(--vino-logo,var(--tinta-logo,#161514))" d="${P.vino}"/>` +
  `<path id="lb-salp" ${tinta} d="${P.salpicadura}"/>` +
  `<g id="lb-copa"><use href="#lb-caliz"/><use href="#lb-vino"/><use href="#lb-salp"/></g>` +
  `<g id="lb-tinta"><use href="#lb-letras"/><use href="#lb-copa"/><use href="#lb-tenedor-p"/></g>` +
  `<path id="lb-panel" style="fill:var(--panel-logo,#F4F3EE)" d="${P.panel}"/>` +
  `<path id="lb-contorno" style="fill:var(--contorno-logo,#161514)" d="${P.contorno}"/>` +
  `</defs></svg>`;

/* subtrayectos de un path: el mayor es el chorro, el resto, gotas */
function subtrayectos(d) {
  return d.split(/(?=M)/).filter(Boolean).map(s => {
    const n = s.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
    const caja = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    return { d: s, caja, area: (caja[2] - caja[0]) * (caja[3] - caja[1]) };
  });
}

/* ───────── la copa grande del hero ───────── */
const PLATOS_COPA = [
  ['DVa0L3MiLZH', 'Pulpo a la plancha', [0.5, 0.5]],
  ['DMXNJK4ImGg', 'Croquetas caseras', [0.33, 0.68]],
  ['DV-8EuriCKd', 'T-bone a la brasa', [0.42, 0.52]],
  ['DOk1vFaiGAA', 'Bacalao a la nata', [0.52, 0.5]],
  ['DWgJmFxiBVu', 'Carrilleras al vino tinto', [0.55, 0.55]],
  ['DQSGjqniL1j', 'Tiramisú casero', [0.56, 0.5]]
];
function copa() {
  const [vx, vy, vw, vh] = M.vino;
  const extra = 0.16;                                  /* margen para el paralaje dentro del vino */
  const imgs = PLATOS_COPA.map(([id, nombre, foco], i) => {
    const f = fotos[id];
    const aspecto = f.w / f.h;
    const winH = vh * (1 + extra), winW = vw;
    let w = winW, h = winW / aspecto;
    if (h < winH) { h = winH; w = h * aspecto; }
    let x = vx + vw / 2 - foco[0] * w, y = vy + vh / 2 - foco[1] * h;
    x = Math.min(vx, Math.max(vx + vw - w, x));
    y = Math.min(vy - vh * extra / 2, Math.max(vy + vh * (1 + extra / 2) - h, y));
    const ancho = f.anchos.includes(960) ? 960 : f.anchos[f.anchos.length - 1];
    return `<image class="copa__foto${i === 0 ? ' es-activa' : ''}" href="assets/fotos/${id}-${ancho}.jpg" x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" preserveAspectRatio="none" data-nombre="${esc(nombre)}" data-foto="${id}"/>`;
  });
  const salp = subtrayectos(P.salpicadura).sort((a, b) => b.area - a.area);
  const gotas = salp.slice(1).map((g, i) => `<path class="copa__gota" data-k="${i}" ${tinta} d="${g.d}"/>`).join('');
  return `
      <figure class="copa" id="copa">
        <svg class="copa__svg" id="copa-svg" viewBox="${vb(M.copa)}" data-pie="inicio" data-pie-x="${M.pie.x}" data-pie-ancho="${M.pie.ancho}" data-caja="${vb(M.copa)}" role="img" aria-labelledby="copa-titulo">
          <title id="copa-titulo">La copa del logo, con platos de la casa dentro del vino</title>
          <defs><clipPath id="vino-hero"><path d="${P.vino}"/></clipPath></defs>
          <g clip-path="url(#vino-hero)"><rect x="${vx - 2}" y="${vy - 2}" width="${vw + 4}" height="${vh + 4}" fill="#161514"/><g class="copa__fotos" id="copa-fotos">${imgs.join('')}</g></g>
          <path class="copa__caliz" ${tinta} d="${P.caliz}"/>
          <path class="copa__chorro" ${tinta} d="${salp[0].d}"/>
          <g class="copa__gotas" id="copa-gotas">${gotas}</g>
        </svg>
        <figcaption class="copa__nombre" id="copa-nombre">${esc(PLATOS_COPA[0][1])}</figcaption>
      </figure>
      `;
}

/* ───────── el tenedor de la carta ───────── */
function tenedor() {
  return `
      <div class="tenedor" id="tenedor" data-pie="fin" data-caja="${vb(M.tenedor)}" data-dientes="${M.dientes.x.join(',')}" data-punta="${M.dientes.punta}" data-pie-x="${M.pie.x}">
        <svg class="tenedor__svg" viewBox="${vb(M.tenedor)}" aria-hidden="true" focusable="false"><use href="#lb-tenedor-p"/></svg>
      </div>
      <svg class="dientes" id="dientes" aria-hidden="true" focusable="false">${[0, 1, 2, 3].map(i => `<path class="dientes__linea" id="diente-${i}" pathLength="1" d="M0 0"/>`).join('')}</svg>
      `;
}

/* ───────── capítulos ───────── */
function capitulo(parte, i) {
  const lista = platosVigentes.filter(p => p.parte === parte.id);
  if (!lista.length) throw new Error('Capítulo vacío: ' + parte.id);
  const lis = lista.map(p => {
    const desc = p.descripcion ? `<span class="plato__desc">${esc(p.descripcion)}</span>` : '';
    const pr = carta.mostrarPrecios && p.precio != null ? `<span class="plato__precio precio">${precio(p.precio)}</span>` : '';
    return `            <li class="plato" data-plato="${p.id}"><span class="plato__nombre">${esc(p.nombre)}</span>${pr}${desc}</li>`;
  }).join('\n');
  const figs = parte.fotos.map(f => `            <figure class="foto-plato">
              ${pic(f.id, '(max-width: 860px) 100vw, 40vw', '              ')}
              <figcaption>${esc(f.pie)}</figcaption>
            </figure>`).join('\n');
  return `
          <header class="capitulo__cabeza">
            <p class="capitulo__num"><span>${String(i + 1).padStart(2, '0')}</span> de 04</p>
            <h3 class="capitulo__titulo" id="${parte.id}-titulo">${esc(parte.nombre)}</h3>
            <p class="capitulo__entrada">${esc(parte.entrada)}</p>
          </header>
          <ul class="platos" aria-label="${esc(parte.nombre)}: platos">
${lis}
          </ul>
          <div class="capitulo__fotos capitulo__fotos--${parte.fotos.length}">
${figs}
          </div>
          `;
}

/* ───────── la cinta ───────── */
function cinta() {
  const sep = `<li class="cinta__copa" aria-hidden="true"><svg viewBox="${vb(M.copa)}" focusable="false"><use href="#lb-copa"/></svg></li>`;
  const filas = carta.marquee.map((fila, i) => {
    fila.forEach(it => { const p = porId[it.ref]; if (!p || !p.vigente) throw new Error('La cinta nombra un plato no vigente: ' + it.texto); });
    const lis = fila.map(it => `<li class="cinta__plato">${esc(it.texto)}</li>${sep}`).join('');
    return `
    <div class="cinta__fila" data-sentido="${i % 2 ? -1 : 1}" aria-hidden="${i ? 'true' : 'false'}"><ul class="cinta__pista">${lis}</ul></div>`;
  }).join('');
  const quieta = carta.marquee.flat().map(it => esc(it.texto)).join(' · ');
  return filas + `
    <p class="cinta__quieta">${quieta}</p>
    `;
}

/* ───────── horario ───────── */
const hm = t => { const [h, m] = t.split(':').map(Number); return h + m / 60; };
const bonita = t => t.replace(/^0/, '');
function frasesHorario() {
  const dias = horario.dias;
  const manana = {};
  dias.forEach(d => { const k = d.franjas[0][0]; (manana[k] = manana[k] || []).push(d.dia); });
  const rango = l => l.length === 1 ? l[0] : (l.length === 2 ? l.join(' y ') : 'de ' + l[0] + ' a ' + l[l.length - 1]);
  const partes = Object.entries(manana).map(([h, l]) => {
    const nombre = l.join(',') === 'sábado,domingo' ? 'sábados y domingos' : rango(l);
    return nombre + ' desde las ' + bonita(h);
  });
  const noches = [...new Set(dias.map(d => (d.franjas[1] || []).join('–')))];
  const noche = noches.length === 1 && noches[0] ? ', y por la noche, de ' + noches[0].split('–').map(bonita).join(' a ') : '';
  return `Abrimos todos los días, de mañana y de noche: ${partes.join(' y ')}${noche}.`;
}
function franjas() {
  const ini = 8, fin = 24, tramo = fin - ini;
  const ticks = [];
  for (let h = ini; h <= fin; h += 2) ticks.push(`<span style="--x:${num((h - ini) / tramo * 100)}%">${h}</span>`);
  const filas = horario.dias.map((d, i) => {
    const barras = d.franjas.map(([a, b]) => `<span class="franja" style="--ini:${num((hm(a) - ini) / tramo * 100)}%;--fin:${num((hm(b) - ini) / tramo * 100)}%"></span>`).join('');
    const texto = d.franjas.map(([a, b]) => bonita(a) + '–' + bonita(b)).join(' · ');
    const lectura = d.dia[0].toUpperCase() + d.dia.slice(1) + ': ' + d.franjas.map(([a, b]) => 'de ' + bonita(a) + ' a ' + bonita(b)).join(' y de ').replace(/ y de de /g, ' y de ');
    return `        <li class="franja-dia" data-dia="${(i + 1) % 7}"><span class="franja-dia__nombre">${d.dia[0].toUpperCase() + d.dia.slice(1)}</span><span class="franja-dia__pista" aria-hidden="true">${barras}</span><span class="franja-dia__horas" aria-hidden="true">${texto}</span><span class="visualmente-oculto">${lectura}</span></li>`;
  }).join('\n');
  const vac = horario.vacaciones && horario.vacaciones.mostrar ? `\n    <p class="horario__vacaciones">${esc(horario.vacaciones.texto)}</p>` : '';
  return `
    <div class="franjas" id="franjas">
      <div class="franjas__eje" aria-hidden="true">${ticks.join('')}</div>
      <ol class="franjas__dias" aria-label="Horario por días">
${filas}
      </ol>
    </div>${vac}
    `;
}
function horasSchema() {
  const grupos = new Map();
  horario.dias.forEach(d => d.franjas.forEach(([a, b]) => {
    const k = a + '|' + b;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(d.schema);
  }));
  return [...grupos].map(([k, dias]) => {
    const [a, b] = k.split('|');
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: dias, opens: a, closes: b === '24:00' ? '23:59' : b };
  });
}

/* ───────── la cámara ───────── */
const MARCAS = /discarlux|vaca vella|marela|angus|old special/i;
function camaraHtml() {
  if (!camara) return '';
  const fichas = camara.etiquetas.map(e => {
    if (!camara.marcas && (MARCAS.test(e.nombre) || MARCAS.test(e.texto || '') || e.foto === camara.conMarcas.foto)) throw new Error('Marca del proveedor con "marcas": false: ' + e.nombre);
    const generica = !e.texto && e.foto === 'DSixXvdCEb8';
    const pie = generica ? esc(camara.fotoGenerica) : esc(fotos[e.foto].alt);
    const texto = e.texto ? `<p class="ficha__texto">${esc(e.texto)}</p>` : `<p class="ficha__texto">Pregunta por él al reservar: la cámara cambia cada semana.</p>`;
    const fuente = e.texto ? `<p class="ficha__fuente">Lo contamos en nuestro Instagram.</p>` : '';
    return `            <template class="ficha" data-etiqueta="${e.id}" data-nombre="${esc(e.nombre)}">
              <figure class="ficha__foto">
                ${pic(e.foto, '(max-width: 860px) 92vw, 560px', '                ')}
                <figcaption>${pie}</figcaption>
              </figure>
              ${texto}${fuente}
            </template>`;
  }).join('\n');
  const tags = camara.etiquetas.map((e, i) => `              <li class="camara__gancho" style="--i:${i}"><button class="etiqueta" type="button" data-etiqueta="${e.id}" aria-haspopup="dialog"><span class="etiqueta__cuerda" aria-hidden="true"></span><span class="etiqueta__carton">${esc(e.nombre)}</span></button></li>`).join('\n');
  const F = camara.fuegos;
  const marcas = camara.marcas ? `
            <figure class="camara__marcas foto-plato">
              ${pic(camara.conMarcas.foto, '(max-width: 860px) 100vw, 40vw', '              ')}
              <figcaption>${esc(camara.conMarcas.texto)}</figcaption>
            </figure>` : '';
  return `
            <div class="camara__cabeza">
              <p class="antetitulo">Dentro de las carnes</p>
              <h4 class="camara__titulo" id="camara-titulo">La cámara</h4>
              <blockquote class="camara__cita">
                <p>«${esc(camara.cita.texto)}»</p>
                <footer>Lo contamos así en Instagram, en agosto de 2025.</footer>
              </blockquote>
            </div>
            <div class="camara__barra">
              <span class="camara__acero" aria-hidden="true"></span>
              <ul class="camara__etiquetas" aria-label="Lo que madura en la cámara">
${tags}
              </ul>
              <p class="camara__ayuda">Toca una etiqueta para ver la pieza.</p>
            </div>
${fichas}
            <dialog class="ficha-dialogo" id="camara-dialogo" aria-labelledby="ficha-nombre">
              <div class="ficha-dialogo__caja">
                <button class="ficha-dialogo__cerrar" id="ficha-cerrar" type="button" aria-label="Cerrar"><span aria-hidden="true">×</span></button>
                <h5 class="ficha-dialogo__nombre" id="ficha-nombre"></h5>
                <div class="ficha-dialogo__cuerpo" id="ficha-cuerpo"></div>
              </div>
            </dialog>
            <div class="camara__fuegos">
              <h4 class="camara__subtitulo">${esc(F.titulo)}</h4>
              <div class="camara__par">
                <figure class="foto-plato camara__brasa">
                  ${pic(F.brasa.foto, '(max-width: 860px) 100vw, 40vw', '                  ')}
                  <figcaption>A la brasa</figcaption>
                </figure>
                <figure class="foto-plato camara__piedra">
                  ${pic(F.piedra.foto, '(max-width: 860px) 100vw, 40vw', '                  ')}
                  <figcaption>A la piedra</figcaption>
                </figure>
              </div>
              <p class="camara__linea">${esc(F.brasa.texto)}</p>
              <p class="camara__linea">${esc(F.piedra.texto)}</p>
            </div>${marcas}
            `;
}

/* ───────── la plaza ───────── */
function plazaHtml() {
  const li = l => `          <li><b class="distancia">${l.metros != null ? l.metros + ' m' : ''}</b><span class="distancia__lugar">${esc(l.nombre)}</span>${l.minutos != null ? `<span class="distancia__min">${l.minutos} min a pie</span>` : ''}</li>`;
  const cerca = plaza.lugares.filter(l => !l.paraVer), ver = plaza.lugares.filter(l => l.paraVer);
  const fecha = new Date(plaza.medido + 'T12:00:00');
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `
        <div class="distancias">
          <h3 class="distancias__titulo">A pie desde la puerta</h3>
          <ul class="distancias__lista">
${cerca.map(li).join('\n')}
          </ul>
          <h3 class="distancias__titulo">Para ver, cerca</h3>
          <ul class="distancias__lista">
${ver.map(li).join('\n')}
          </ul>
          <p class="distancias__nota">Distancias a pie medidas con OpenStreetMap el ${fecha.getDate()} de ${MES[fecha.getMonth()]} de ${fecha.getFullYear()}.</p>
        </div>
        `;
}

/* ───────── WhatsApp ───────── */
function whatsapp() {
  if (config.whatsapp) return `
      <p class="reservar__whatsapp"><a class="boton boton--linea" id="whatsapp" href="https://wa.me/${esc(config.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></p>
      `;
  return `
      <p class="reservar__whatsapp"><button class="boton boton--linea es-apagado" id="whatsapp" type="button" disabled>WhatsApp</button><span class="reservar__nota" id="whatsapp-nota">Por ahora, mejor por teléfono.</span></p>
      `;
}

/* ───────── hoja para imprimir ───────── */
function hoja() {
  const cols = carta.partes.map(p => `    <div class="hoja__parte"><h3>${esc(p.nombre)}</h3><ul>${platosVigentes.filter(x => x.parte === p.id).map(x => `<li>${esc(x.nombre)}${carta.mostrarPrecios && x.precio != null ? ` <span class="precio">${precio(x.precio)}</span>` : ''}</li>`).join('')}</ul></div>`).join('\n');
  return `
  <header class="hoja__cabeza"><svg class="hoja__logo" viewBox="${vb(M.logo)}" data-vb="logo" aria-hidden="true" focusable="false"><use href="#lb-tinta"/></svg><p>La carta</p></header>
  <div class="hoja__partes">
${cols}
  </div>
  <p class="hoja__pie">${esc(carta.pie)}</p>
  <p class="hoja__datos">C/ López Asme, 6 · Zafra · ${esc(config.telefono)} · @laotrabodeguita.zafra</p>
  `;
}

/* ───────── JSON-LD ───────── */
function jsonld(html) {
  const conOpiniones = /data-modulo="opiniones"/.test(html);
  const d = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': '#la-otra-bodeguita',
    name: 'La otra bodeguita',
    image: 'assets/og-la-otra-bodeguita.jpg',
    telephone: '+34 924 19 44 20',
    email: config.email,
    address: { '@type': 'PostalAddress', streetAddress: 'C/ López Asme, 6', postalCode: '06300', addressLocality: 'Zafra', addressRegion: 'Badajoz', addressCountry: 'ES' },
    geo: { '@type': 'GeoCoordinates', latitude: plaza.origen.lat, longitude: plaza.origen.lon },
    servesCuisine: 'Mediterránea',
    priceRange: '20–30 €',
    acceptsReservations: true,
    openingHoursSpecification: horasSchema(),
    sameAs: [config.instagram, config.facebook]
  };
  if (conOpiniones) d.aggregateRating = { '@type': 'AggregateRating', ratingValue: '4.6', bestRating: '5', ratingCount: '528' };
  return '\n' + JSON.stringify(d, null, 2) + '\n';
}

/* ───────── datos del mando (solo maqueta) ───────── */
function mando() {
  return JSON.stringify({
    horario: { confirmado: horario.confirmado, aviso: horario.aviso },
    precios: { mostrar: carta.mostrarPrecios, aviso: carta.avisoPrecios, platos: Object.fromEntries(platosVigentes.filter(p => p.precio != null).map(p => [p.id, precio(p.precio)])) },
    noVigentes: carta.platos.filter(p => !p.vigente).map(p => p.nombre + ' (' + p.fuente + ')'),
    sinMedir: plaza.lugares.filter(l => l.metros == null).map(l => l.nombre),
    medido: plaza.medido,
    terraza: plaza.terrazaEnLaPlaza,
    marcas: camara ? camara.marcas : null,
    bodeguita: 'La casa hermana de Villafranca de los Barros no se nombra: preguntar si quieren mencionarla.'
  });
}

/* ───────── escribir ───────── */
const comprobar = process.argv.includes('--comprobar');
const rutaHtml = path.join(raiz, 'index.html');
const antes = fs.readFileSync(rutaHtml, 'utf8');
let html = antes;
function bloque(nombre, contenido, obligatorio = true) {
  const re = new RegExp('(<!-- gen:' + nombre + ' -->)[\\s\\S]*?(<!-- /gen:' + nombre + ' -->)');
  if (!re.test(html)) { if (obligatorio) throw new Error('Falta la marca gen:' + nombre); return; }
  html = html.replace(re, (m, a, b) => a + contenido + b);
}
bloque('simbolos', simbolos);
bloque('copa', copa());
bloque('tenedor', tenedor());
bloque('casa-horario', `<p>${esc(frasesHorario())}</p>`);
bloque('cinta', cinta());
carta.partes.forEach((p, i) => bloque('capitulo-' + p.id, capitulo(p, i)));
bloque('carta-pie', `\n    <p class="carta__pie">${esc(carta.pie)}</p>\n    `);
bloque('camara', camaraHtml(), false);
bloque('vinilo', `\n        <svg class="vinilo" viewBox="${vb(M.logo)}" data-vb="logo" aria-hidden="true" focusable="false"><use href="#lb-contorno"/><use href="#lb-tinta"/></svg>\n        `);
bloque('plaza', plazaHtml());
bloque('horario', franjas());
bloque('whatsapp', whatsapp());
bloque('hoja', hoja(), false);
html = html.replace(/(<script type="application\/ld\+json" id="datos-estructurados">)[\s\S]*?(<\/script>)/, (m, a, b) => a + jsonld(html) + b);
html = html.replace(/(<script type="application\/json" id="mando-datos">)[\s\S]*?(<\/script>)/, (m, a, b) => a + mando() + b);
/* viewBox real de cada svg marcado */
const cajas = { logo: M.logo, copa: M.copa, tenedor: M.tenedor };
html = html.replace(/viewBox="[^"]*"(\s+data-vb="(logo|copa|tenedor)")/g, (m, resto, k) => `viewBox="${vb(cajas[k])}"` + resto);
html = html.replace(/(<svg class="rotulo" viewBox=")[^"]*(" id="cortina-panel")/, (m, a, b) => a + vb(M.logo) + b);
/* <picture data-foto> sueltos (los escritos a mano en el HTML) */
html = html.replace(/([ \t]*)<picture([^>]*\sdata-foto="([\w-]+)"[^>]*)>[\s\S]*?<\/picture>/g, (todo, sangria, atributos, id) => {
  const sizes = (atributos.match(/\sdata-sizes="([^"]*)"/) || [])[1] || '100vw';
  const carga = (atributos.match(/\sdata-carga="([^"]*)"/) || [])[1] || 'lazy';
  return `${sangria}<picture${atributos}>\n${picture(id, { sizes, carga, sangria: sangria + '  ' })}\n${sangria}</picture>`;
});

if (html.length < antes.length * 0.7) throw new Error('Me niego: index.html perdería demasiado');

/* el 404 es autónomo: la copa va con sus paths dentro */
const ruta404 = path.join(raiz, '404.html');
let al404 = true;
if (fs.existsSync(ruta404)) {
  const a404 = fs.readFileSync(ruta404, 'utf8');
  const copa404 = `<svg viewBox="${vb(M.copa)}" aria-hidden="true" focusable="false"><path fill="#161514" d="${P.caliz}"/><path fill="#161514" d="${P.vino}"/><path fill="#161514" d="${P.salpicadura}"/></svg>`;
  const d404 = a404.replace(/(<!-- gen:copa404 -->)[\s\S]*?(<!-- \/gen:copa404 -->)/, (m, a, b) => a + copa404 + b);
  al404 = d404 === a404;
  if (!comprobar && !al404) fs.writeFileSync(ruta404, d404);
}
if (comprobar) {
  const alDia = html === antes && al404;
  console.log(alDia ? 'index.html y 404.html al día con los datos' : 'El HTML NO está al día: node scripts/construir.mjs');
  process.exitCode = alDia ? 0 : 1;
} else {
  if (html !== antes) fs.writeFileSync(rutaHtml, html);
  console.log((html !== antes ? 'actualizado ' : 'sin cambios ') + 'index.html · ' + platosVigentes.length + ' platos vigentes · ' +
    carta.platos.filter(p => !p.vigente).length + ' no vigentes · cámara ' + (camara ? (camara.marcas ? 'con marcas' : 'sin marcas') : 'quitada'));
}
