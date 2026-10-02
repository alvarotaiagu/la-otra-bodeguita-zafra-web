# La otra bodeguita (Zafra) · «De la copa al tenedor»

Web para **La otra bodeguita**, restaurante en C/ López Asme, 6, 06300 Zafra (Badajoz) · 924 19 44 20.
Negocio real, **sin encargo todavía**: la web está en local, sin publicar, y lleva `noindex, nofollow` en todas
las páginas. Hoy no tienen web (su ficha de Google enlaza un Google Sites vacío y labodeguitazafra.es está aparcado).

```
node scripts/servir.mjs          → http://127.0.0.1:4210        (la web tal cual la vería el cliente)
                                   http://127.0.0.1:4210/?revision  (con el mando de las dos versiones y los avisos)
node scripts/verificar.mjs       → 134 comprobaciones (añade --capturas para rehacer screenshots/)
```

La web también abre con doble clic: todo lo que sale de los datos ya está escrito en el HTML.

---

## El concepto

En su logo, la «I» de BODEGUITA es una **copa de vino**: el vino salpica por encima del borde y el pie baja
como la «I» hasta acabar en un **tenedor** de cuatro dientes. La web es esa letra en vertical:

1. **Cortina:** el rótulo retroiluminado de su comedor (el mismo logo, troquelado) parpadea sobre el jardín
   vertical, se enciende, y su halo crece hasta hacerse el papel de la web. Solo queda la tinta, que vuela a su
   sitio en el hero. El logo **se forma una sola vez** (aquí); después ya está.
2. **Hero:** la copa grande, real, con **platos en color dentro del vino** (pulpo → croquetas → T-bone →
   bacalao → carrilleras → tiramisú). No se llena ni se dibuja: es una ventana.
3. **El pie:** una línea **maciza y recta**, del grosor del pie del logo, sale de la copa, baja por la columna
   derecha (entre el texto y las fotos de «La casa», como el pie pasa entre «BODEGU» y «TA») cruzando la cinta de
   platos, y se posa en el **tenedor** de la carta.
4. **La carta:** los cuatro dientes del tenedor se abren en cuatro líneas que bajan a Entrantes · Del mar ·
   Carnes · Postres. Mientras se lee, los cuatro dientes se quedan **fijos en el margen** como índice.

Todo sale de lo que ya es suyo (logo, rótulo, vinilo del cristal, local): no afirma nada que pueda ser falso.
Las ideas de ángulo (la cámara de maduración, las opiniones) van como **módulos que se quitan**.

**Paleta** (hueso `#F4F1EC` · tinta `#161514` · piedra `#77716A` · jardín `#3E551F` · jardín oscuro `#141C0C` ·
luz `#FFF6DF`). El verde solo en la cortina, el pie de página y detalles; el color lo ponen las fotos.
`--piedra-texto` = 85 % piedra + 15 % tinta → `#68635D`, **5,3:1** sobre el hueso (la piedra a pelo da 4,3:1).
**Letra:** Josefin Sans (titulares en mayúsculas, alternando 700 y 300) + Red Hat Text. Interlineado mínimo 1,05.

## Mapa de secciones

| # | Sección | Qué lleva | De dónde salen los datos |
|---|---|---|---|
| — | Cortina | rótulo que parpadea, halo que se hace papel, logo que vuela | logo vectorizado |
| 1 | Hero | logo, titular con char-reveal, «Reservar mesa» (tel:, magnético), copa con 6 platos | — |
| 2 | La casa | titular, horario en frase, terraza, comedor privado, perros; cifras que cuentan; 3 fotos | `horario.json` |
| 3 | Cinta | dos filas en sentidos opuestos, separadas por la copa | `carta.json` → `marquee` |
| 4 | La carta | el tenedor, cuatro capítulos con lista y fotos grandes, carril de cuatro dientes | `carta.json` |
| 4b | **La cámara** (dentro de Carnes) · *se puede quitar* | cita, barra de acero con etiquetas de kraft → `<dialog>`, brasa y piedra | `camara.json` |
| 5 | En la plaza | la terraza «a través del cristal» con el vinilo, 2 fotos, distancias medidas, mapa bajo clic | `plaza.json` |
| 6 | **Opiniones** · *se puede quitar* | 4,6 que cuenta, 528 reseñas, 5 citas en pila sticky | literal en el HTML |
| 7 | Horario | franjas macizas de 8 a 24 h, «hoy» discreto, línea de vacaciones | `horario.json` |
| 8 | Reservar | teléfono enorme, comedor privado, dirección, «Cómo llegar», correo, WhatsApp apagado | `config.json` |
| — | Pie | el rótulo quieto sobre el jardín, redes, legales, «Abierto desde julio de 2021» | — |

## Qué es real y qué es provisional

**Real y comprobado:** nombre, logo (vectorizado de su post), dirección, teléfono fijo, correo, redes,
inauguración (1-7-2021), 4,6 con 528 reseñas en Google (2026-10-02), 20–30 €, terraza, comedor privado, perros,
la frase de la cámara, todas las fotos (de su Instagram), los platos y sus descripciones (literales de sus pies),
las 5 citas (literales de Google, sin nombre).

**Provisional, avisado en el mando de `?revision`:**
- **Horario:** el de Google (`horario.json`, `"confirmado": false`). No cuadra con su bio de Instagram ni con el
  cartel de 2024 («cerrado miércoles desde las 12:00 y jueves noche»).
- **Precios:** los de febrero de 2024 están en `carta.json` pero **ocultos** (`"mostrarPrecios": false`). El
  mando los enseña con el aviso «Precios de febrero de 2024: pendientes de confirmar». Carnes, del mar y
  postres nunca tuvieron precio publicado.
- **Carta:** 34 platos vigentes (en la carta de 2024 o publicados en 2025–2026). 6 no salen (`vigente:false`):
  arroz caldoso de marisco y arroz negro (último post: 2024), dorada a la espalda (2022), vieiras (2024),
  gambones (2024) y wagyu (2022). El mando los lista para preguntar.
- **La cámara:** las cinco etiquetas son las de sus cartelas (Chuletón, T-bone, Tomahawk, Solomillo, Picaña
  madurada). Tomahawk y Picaña no tienen texto en un pie de 2025–2026: la ficha dice «Pregunta por él al
  reservar» y enseña una pieza genérica de la cámara, rotulada como tal. Las marcas del proveedor van detrás de
  `"marcas": false`.
- **Distancias:** medidas, no copiadas (ver `plaza.json`). Lo que no figura en la web de turismo del
  Ayuntamiento se nombra sin título.

## Los datos mandan: cómo se cambia algo

Todo lo que cambia (carta, horario, cámara, distancias, WhatsApp) está en `data/*.json`. Tras tocar un JSON:

```
node scripts/construir.mjs     # escribe en index.html los bloques <!-- gen:… --> (idempotente)
node scripts/versionar.mjs     # ?v=<huella> en CSS/JS (si han cambiado)
node scripts/verificar.mjs
```

- **Precios:** `carta.json` → `"mostrarPrecios": true` (y actualizar `precio` de cada plato).
- **Un plato que vuelve o se va:** `"vigente": true/false`. Si está en la cinta (`marquee`), construir se niega
  a pintar un plato no vigente: hay que quitarlo de la cinta.
- **La cámara (cambia cada semana):** `camara.json` → `etiquetas`. `texto` solo si es suyo; si no, `null`.
- **Marcas del proveedor:** `camara.json` → `"marcas": true` (añade la foto Dc9VI6iI7UD y la línea de Discarlux).
- **WhatsApp:** `config.json` → `"whatsapp": "34XXXXXXXXX"` y el botón se enciende.
- **Horario confirmado:** `horario.json` → las franjas y `"confirmado": true`.
- **Vacaciones:** `horario.json` → `vacaciones.mostrar`.

**Fotos:** `python scripts/gradar.py` (recortes y gradación común, todo en color) → `node scripts/fotos.mjs`
(AVIF/WebP/JPG a 480/960/1440). Las de 2022–2024 llevan abajo una franja blanca con su logo: se recorta sola.
`DTlWShkDdgR` y `DP-5C53CODL` son la misma foto de la cámara con **dos encuadres sin cartelas del proveedor**.

**Logo:** `python scripts/logo.py` vectoriza `logo-ig-post-1080.jpg` por piezas (contorno troquelado, letras,
cáliz con pie, tenedor, vino, salpicadura) y deja la comprobación superpuesta a 3x en
`scripts/fuentes/comprobacion-piezas.png`. Después `node scripts/construir.mjs`.
**og:image:** `node scripts/generar-og.mjs` (logo sobre el hueso + la copa con el pulpo dentro).

## Módulos que se pueden quitar

Las dos recetas las ejecuta `verificar.mjs` sobre una copia temporal y comprueba que la web sigue sin errores,
sin 404, con el resto de secciones en orden y con el pie cayendo en el tenedor.

### «La cámara»
```
node scripts/quitar-camara.mjs --aqui        (o sobre una copia: node scripts/quitar-camara.mjs ../copia)
```
1. Borra en `index.html` la `<section id="camara" data-modulo="camara">` entre sus marcas `[MÓDULO CÁMARA]`.
2. Borra las dos líneas con `data-modulo="camara"` (el `<link>` de `css/camara.css` y el `<script>` de `js/camara.js`).
3. Borra `css/camara.css`, `js/camara.js` y `data/camara.json` (construir.mjs sabe pintar la web sin cámara).
4. Vuelve a versionar.

### «Opiniones»
```
node scripts/quitar-opiniones.mjs --aqui
```
1. Borra la `<section id="opiniones" data-modulo="opiniones">` entre sus marcas `[MÓDULO OPINIONES]`.
2. Borra las tres líneas con `data-modulo="opiniones"` (el enlace del menú, el `<link>` y el `<script>`).
3. Quita `aggregateRating` del JSON-LD (sin el módulo, la web no declara la nota).
4. Borra `css/opiniones.css` y `js/opiniones.js` y vuelve a versionar.

## Quitar el mando de maqueta (antes de entregar)

El mando (abajo a la izquierda, **solo con `?revision`**) cambia entre «De la copa al tenedor» y «Sobria» y
lista los pendientes. **No viaja al cliente.**

**Caso A, entregan la cargada:**
```
node scripts/quitar-mando.mjs ../la-otra-bodeguita-entrega
node scripts/comprobar-borrado.mjs ../la-otra-bodeguita-entrega     → «Sin rastros del mando»
```
Quita por marcas `[MANDO DE MAQUETA]`: el aviso y la lectura de la densidad en el `<head>`, el `<div class="mando">`
con sus datos, el botón y la hoja de «Carta para imprimir», los bloques CSS (estilos.css y opiniones.css), la
función `mandoMaqueta()` de main.js y la fila `lob-densidad` de privacidad.html.

**Caso B, eligen la sobria:** antes de quitar el mando, en `index.html` cambiar `class="sin-js densidad-copa"`
por `densidad-sobria`, y en `css/estilos.css` y `css/opiniones.css` sacar fuera del bloque marcado las reglas
`.densidad-sobria …` y las de impresión (`.hoja`, `@media print`); en `index.html`, sacar fuera de sus marcas el
botón `#imprimir` y la `<section id="hoja-carta">`. Después, los dos comandos del caso A (comprobar-borrado avisará
de `densidad-sobria`: es lo esperado en este caso).

**Qué cambia la sobria:** el pie solo en el hero (corto) y el tenedor en la carta; la carta en **cuatro pestañas**
que salen de los dientes, con dos fotos grandes por parte; la cinta pasa a una línea quieta; el cristal sin
reflejo; y **añade «Carta para imprimir»** (una hoja A4 con los cuatro capítulos y el logo).

**Mando de paleta (PLIEGO §5):** no se ha puesto. Es para plantillas ficticias; aquí la marca es suya (logo
negro sobre blanco y el verde de su jardín) y no se experimenta con ella.

## Pendientes para el dueño

1. **El logo:** ¿tienen el vector original? ¿Qué tipografía es? (El de la web está vectorizado de su post.)
2. **El horario real:** ¿abren por la mañana los fines de semana (Google dice desde las 12:00, Instagram desde
   las 8:30)? ¿Sigue el descanso del miércoles desde las 12:00 y del jueves por la noche? ¿Hora de cierre?
3. **La carta actual con precios**, la de carnes incluida. ¿Hay menú del día? ¿Siguen los arroces?
   (Tampoco salen hace tiempo la dorada, las vieiras, los gambones ni el wagyu.)
4. **La cámara:** ¿qué hay ahora? ¿Sigue en pie el «tú eliges cuánto quieres y nosotros lo maduramos en nuestra
   cámara hasta que queda perfecto» (Instagram, 21-08-2025)? ¿Se ve desde el comedor?
5. **Permiso para nombrar a Discarlux, Vaca Vella · Marela y Angus** (hoy `"marcas": false`).
6. **La Bodeguita:** ¿quieren que la web mencione la casa hermana de Villafranca de los Barros? (Hoy no sale, ni
   las fotos de los postres con su oblea.)
7. **El comedor privado:** ¿para cuántas personas? ¿Cómo se reserva?
8. **La terraza:** ¿está en la Plaza del Pilar Redondo o en la calle López Asme? (La web dice «junto a».)
9. **WhatsApp:** el 695 073 752 solo sale en una revista de 2022: ¿es suyo? ¿Tiene WhatsApp?
10. **Reseñas con nombre:** ¿permiso para citarlas con nombre? (Hoy van sin nombre, «Opinión en Google».)
11. **Las jornadas de carne** (2022–2024, 60 €): ¿quieren recuperarlas como sección?
12. **Titular y NIF** para el aviso legal y la privacidad (hoy `[PENDIENTE]`).
13. **El dominio:** labodeguitazafra.es está aparcado en IONOS: ¿es suyo? ¿Lo usamos para la web?

## Decisiones tomadas (y por qué)

- **Su ubicación real:** OpenStreetMap tiene el propio restaurante (nodo 11835758669, nº 6) donde López Asme llega
  a la Plazuela del Pilar Redondo, igual que Turismo Badajoz. El pin de Facebook/Instagram cae ~190 m al sur.
  La web (JSON-LD y «Cómo llegar») usa el de OSM.
- **Distancias medidas a pie** con OSRM (routing.openstreetmap.de) el 2-10-2026: plaza 92 m, Ayuntamiento 126 m,
  Candelaria 199 m, Plaza Grande 294 m, Plaza Chica 312 m, Alcázar/Parador 376 m. Restaurant Guru decía
  «50 m del Ayuntamiento y 80 m de la Candelaria»: falso.
- **Nombres comprobados en turismo.zafra.es:** «Parroquia de Ntr. Sra. de la Candelaria», «Plaza Grande»,
  «Plaza Chica», «Alcázar de los Duques de Feria» (hoy el Parador). El Ayuntamiento no figura allí como
  monumento: se nombra solo «el Ayuntamiento», sin el nombre del palacio, y no va en «Para ver».
- **Platos añadidos al reparto inicial** por estar publicados en 2025: calamar a la plancha (29-09-2025),
  piruletas de gambón (10-04-2025) y flan casero (10-07-2025). El flan va sin foto (la suya lleva la oblea).
- **Descripciones literales de sus pies.** Ninguna con «pura poesía», «inolvidable» ni «experiencia».
- **La marca verde de vegetariano no se pone** (en su carta marca la César, que lleva pollo).
- **«Tarta de queso»:** su foto lleva la oblea de LA OTRA BODEGUITA (la suya, no la de la casa hermana).
- **Cursor, cortina y pila** siguen el checklist de web desde cero; `verificar.mjs` tiene un test por punto.

## En qué se distingue de sus vecinas

- **Restaurante Gabi (a 300 m):** allí arcos, sello y una copa que **se llena** con el scroll, Fraunces + Inter y
  tarjetas en arco apiladas. Aquí la copa es una **ventana** a los platos y su nivel no sube; no hay arcos.
- **Bar Nizabel:** su «punto medio» rojo. Aquí las oes macizas del logo son letras; no hay «punto».
- **Raíces:** herbario y Zilla Slab. Aquí, ni lo uno ni lo otro.
- **Casa María (Olivenza):** un **hilo fino de cobre que serpentea** y enmarca fotos con el tejado. Aquí el pie es
  **macizo y recto**, del grosor del logo, y ninguna foto va enmarcada con la silueta de la copa.
- **A Lareira:** brasas en canvas y oscura entera. Aquí la brasa son fotos.
- **Foco / Contraluz:** un foco que **abre un haz**. Aquí no hay cono: la luz sale **de detrás del panel** como
  halo y se hace papel.
- **Xenlleiro:** se reutiliza la técnica del horario en franjas, con otro dibujo (barras macizas, extremos rectos).
  Sin revelados circulares.

## Créditos

Fotos: de su Instagram @laotrabodeguita.zafra (ver `CREDITOS.md`). Logo: el suyo, vectorizado.
Tipografías: Josefin Sans y Red Hat Text (Google Fonts, OFL). GSAP, ScrollTrigger y Lenis por jsDelivr.
