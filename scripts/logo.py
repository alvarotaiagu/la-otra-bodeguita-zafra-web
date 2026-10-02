"""Vectoriza el logo de La otra bodeguita en piezas, desde el mejor original
(ref/logo-ig-post-1080.jpg: logo plano en negro sobre verde claro, 1080 px).

Método (el de ref/_logo_vector.py, ampliado por piezas):
  1. Recorte a la zona del logo (fuera las flores de las esquinas) y umbral de
     tinta a baja resolución para ETIQUETAR componentes conexos:
       · el contorno troquelado es el componente con la caja más grande;
       · cáliz + pie + tenedor son uno (la «I» de BODEGUITA);
       · vino + salpicadura son otro, más las gotas sueltas por encima del borde;
       · el resto son letras.
  2. Ampliación ×ESC con LANCZOS + desenfoque suave y umbral otra vez: cada
     píxel oscuro de alta resolución se asigna a la pieza que tenía debajo.
  3. El vino y la salpicadura se cortan a la altura del borde de la copa.
     El cáliz se parte en tres por anchura de fila: copa, pie (filas estrechas)
     y tenedor.
  4. potracer traza los CEROS: se le pasa ~máscara. Motas sueltas fuera
     (turdsize) y piezas de menos de 20 px a baja resolución.
  5. Coordenadas devueltas al espacio del original (1080 px), dos decimales.

Salida (assets/logo/):
  logo-piezas.json   paths de cada pieza + medidas (pie, borde, tenedor)
  logo-tinta.svg     logo completo, solo tinta
  logo-panel.svg     panel troquelado: silueta blanca, contorno y tinta
  copa.svg           copa sola (cáliz con pie, vino y salpicadura)
  tenedor.svg        el tenedor solo
  favicon.svg        la copa sobre el hueso
  comprobacion-*.png superposiciones a 3x sobre el PNG (en scripts/fuentes/)

  python scripts/logo.py
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage
import potrace

sys.stdout.reconfigure(encoding='utf-8')
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..'))
ORIGEN = os.path.normpath(os.path.join(RAIZ, '..', 'la-otra-bodeguita-zafra-bocetos', 'ref', 'logo-ig-post-1080.jpg'))
DESTINO = os.path.join(RAIZ, 'assets', 'logo')
FUENTES = os.path.join(AQUI, 'fuentes')
os.makedirs(DESTINO, exist_ok=True)
os.makedirs(FUENTES, exist_ok=True)

ESC = 6
X0, Y0, X1, Y1 = 206, 264, 874, 810          # recorte (sin las flores)
UMBRAL = 112

gris = Image.open(ORIGEN).convert('L').crop((X0, Y0, X1, Y1))
bajo = np.asarray(gris).astype(float)
oscuro = bajo < UMBRAL
lab, n = ndimage.label(oscuro)
cajas = ndimage.find_objects(lab)
masa = ndimage.sum(oscuro, lab, range(1, n + 1))

def area_caja(s): return (s[0].stop - s[0].start) * (s[1].stop - s[1].start)
idx = list(range(1, n + 1))
contorno = max(idx, key=lambda i: area_caja(cajas[i - 1]))
# la «I»: el componente más alto que no es el contorno
copa = max((i for i in idx if i != contorno), key=lambda i: cajas[i - 1][0].stop - cajas[i - 1][0].start)
cy, cx = cajas[copa - 1]
borde_bajo = cy.start                                  # fila del borde de la copa
# vino + salpicadura: el componente grande que se solapa en x con la copa y empieza por encima del borde
vino = max((i for i in idx if i not in (contorno, copa) and cajas[i - 1][0].start < borde_bajo
            and cajas[i - 1][1].start < cx.stop and cajas[i - 1][1].stop > cx.start), key=lambda i: masa[i - 1])
gotas = [i for i in idx if i not in (contorno, copa, vino) and cajas[i - 1][0].stop <= borde_bajo + 2
         and cajas[i - 1][1].start > cx.start - 40 and masa[i - 1] >= 3]
letras = [i for i in idx if i not in (contorno, copa, vino) and i not in gotas and masa[i - 1] >= 20]
print('componentes', n, '· contorno', contorno, '· copa', copa, '· vino', vino, '· gotas', gotas, '· letras', len(letras))

# ── alta resolución ──
alto = gris.resize((gris.width * ESC, gris.height * ESC), Image.LANCZOS).filter(ImageFilter.GaussianBlur(ESC * 0.35))
A = np.asarray(alto).astype(float) < UMBRAL
lab_alto = np.kron(lab, np.ones((ESC, ESC), dtype=lab.dtype))
def pieza(ids, crecer=ESC):
    m = np.isin(lab_alto, ids)
    m = ndimage.binary_dilation(m, iterations=crecer)
    return A & m
m_contorno = pieza([contorno])
m_copa = pieza([copa])
m_vino_todo = pieza([vino] + gotas)
m_letras = pieza(letras)
# no compartir píxeles: el contorno y la copa mandan sobre las dilataciones vecinas
m_letras &= ~m_contorno & ~m_copa & ~m_vino_todo
m_vino_todo &= ~m_copa & ~m_contorno

corte = borde_bajo * ESC
filas = np.arange(A.shape[0])[:, None]
m_vino = m_vino_todo & (filas >= corte)
m_salp = m_vino_todo & (filas < corte)

# panel: lo que encierra el contorno
m_panel = ndimage.binary_fill_holes(m_contorno)
m_panel = ndimage.binary_opening(m_panel, iterations=2)

# cáliz / pie / tenedor por anchura de fila
ys, xs = np.where(m_copa)
anchos = {}
for y in range(ys.min(), ys.max() + 1):
    fila = np.where(m_copa[y])[0]
    anchos[y] = (fila.min(), fila.max()) if len(fila) else None
def ancho(y): a = anchos.get(y); return (a[1] - a[0] + 1) if a else 0
w = np.array([ancho(y) for y in range(ys.min(), ys.max() + 1)])
mediana_estrecha = np.median(w[w < np.percentile(w[w > 0], 30)])
estrecha = w <= mediana_estrecha * 1.35
# el tramo estrecho más largo es el pie
mejor, ini, run = (0, 0, 0), None, 0
for k, e in enumerate(estrecha):
    if e:
        if ini is None: ini = k
        run = k - ini + 1
        if run > mejor[0]: mejor = (run, ini, k)
    else:
        ini = None
_, a, b = mejor
pie_ini, pie_fin = ys.min() + a, ys.min() + b
pie_ancho = float(np.median(w[a:b + 1]))
pie_x = float(np.median([(anchos[y][0] + anchos[y][1]) / 2 for y in range(pie_ini, pie_fin + 1)]))
m_caliz = m_copa.copy(); m_caliz[pie_fin + 1:] = False            # copa con todo su pie
m_tenedor = m_copa.copy(); m_tenedor[:pie_fin + 1] = False
print('pie: filas', pie_ini / ESC, '→', pie_fin / ESC, '· ancho', pie_ancho / ESC, '· x', pie_x / ESC)

def trazar(mask, turd=ESC * ESC * 6):
    bm = potrace.Bitmap(~mask)                     # potracer traza los ceros
    curvas = bm.trace(turdsize=turd, alphamax=1.0, opticurve=True, opttolerance=0.3)
    def p(pt): return f'{pt.x / ESC + X0:.2f} {pt.y / ESC + Y0:.2f}'
    d = []
    for c in curvas:
        d.append('M' + p(c.start_point))
        for s in c.segments:
            if s.is_corner: d.append('L' + p(s.c) + 'L' + p(s.end_point))
            else: d.append('C' + p(s.c1) + ' ' + p(s.c2) + ' ' + p(s.end_point))
        d.append('Z')
    return ''.join(d)

def caja(mask, margen=0):
    yy, xx = np.where(mask)
    return [round(xx.min() / ESC + X0 - margen, 2), round(yy.min() / ESC + Y0 - margen, 2),
            round((xx.max() - xx.min()) / ESC + 2 * margen, 2), round((yy.max() - yy.min()) / ESC + 2 * margen, 2)]

P = {
    'panel': trazar(m_panel), 'contorno': trazar(m_contorno), 'letras': trazar(m_letras),
    'caliz': trazar(m_caliz), 'tenedor': trazar(m_tenedor), 'vino': trazar(m_vino), 'salpicadura': trazar(m_salp, turd=ESC * 2),
}
copa_completa = m_caliz | m_vino | m_salp
# los cuatro dientes: tramos oscuros en una fila cerca de la punta
yt, xt = np.where(m_tenedor)
fila_d = int(yt.max() - (yt.max() - yt.min()) * 0.08)
xs_d = np.where(m_tenedor[fila_d])[0]
tramos_d, ini_d = [], xs_d[0]
for a_, b_ in zip(xs_d[:-1], xs_d[1:]):
    if b_ - a_ > 1: tramos_d.append((ini_d, a_)); ini_d = b_
tramos_d.append((ini_d, xs_d[-1]))
dientes = [round((a_ + b_) / 2 / ESC + X0, 2) for a_, b_ in tramos_d]
punta = round(yt.max() / ESC + Y0, 2)
print('dientes', dientes, '· punta', punta)
assert len(dientes) == 4, 'el tenedor tiene que dar cuatro dientes'
medidas = {
    'logo': caja(m_panel, 1.5),
    'copa': caja(copa_completa, 1),
    'tenedor': caja(m_tenedor, 1),
    'vino': caja(m_vino),
    'pie': {'x': round(pie_x / ESC + X0, 2), 'ancho': round(pie_ancho / ESC, 2),
            'y0': round(pie_ini / ESC + Y0, 2), 'y1': round(pie_fin / ESC + Y0, 2)},
    'borde': round(borde_bajo + Y0, 2),
    'dientes': {'x': dientes, 'punta': punta},
}
json.dump({'nota': 'Generado por scripts/logo.py desde logo-ig-post-1080.jpg. Coordenadas en px del original (1080).',
           'medidas': medidas, 'paths': P}, open(os.path.join(DESTINO, 'logo-piezas.json'), 'w', encoding='utf8'), indent=1)

def vb(c): return ' '.join(str(v) for v in c)
TINTA, HUESO, PANEL = '#161514', '#F4F1EC', '#F4F3EE'
svg = lambda caja_, cuerpo, extra='': f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb(caja_)}"{extra}>{cuerpo}</svg>\n'
tinta_completa = (f'<path fill="{TINTA}" d="{P["letras"]}"/><path fill="{TINTA}" d="{P["caliz"]}"/>'
                  f'<path fill="{TINTA}" d="{P["tenedor"]}"/><path fill="{TINTA}" d="{P["vino"]}"/><path fill="{TINTA}" d="{P["salpicadura"]}"/>')
open(os.path.join(DESTINO, 'logo-tinta.svg'), 'w').write(svg(medidas['logo'], tinta_completa))
open(os.path.join(DESTINO, 'logo-panel.svg'), 'w').write(svg(medidas['logo'],
    f'<path fill="{PANEL}" d="{P["panel"]}"/><path fill="{TINTA}" d="{P["contorno"]}"/>' + tinta_completa))
copa_svg = (f'<path fill="{TINTA}" d="{P["caliz"]}"/><path fill="{TINTA}" d="{P["vino"]}"/><path fill="{TINTA}" d="{P["salpicadura"]}"/>')
open(os.path.join(DESTINO, 'copa.svg'), 'w').write(svg(medidas['copa'], copa_svg))
open(os.path.join(DESTINO, 'tenedor.svg'), 'w').write(svg(medidas['tenedor'], f'<path fill="{TINTA}" d="{P["tenedor"]}"/>'))
# favicon: la copa (sin el pie largo) centrada en un cuadrado hueso
cx_, cy_, cw_, ch_ = medidas['copa']
lado = ch_ * 0.82
fav_y = cy_ - 2
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{cx_ + cw_ / 2 - lado / 2:.2f} {fav_y:.2f} {lado:.2f} {lado:.2f}">'
       f'<rect x="{cx_ + cw_ / 2 - lado / 2 - 5:.2f}" y="{fav_y - 5:.2f}" width="{lado + 10:.2f}" height="{lado + 10:.2f}" rx="{lado * .18:.2f}" fill="{HUESO}"/>'
       + copa_svg + '</svg>\n')
open(os.path.join(DESTINO, 'favicon.svg'), 'w').write(fav)

# ── comprobación: cada pieza superpuesta al original a 3x ──
def comprobar(nombre, mascaras):
    base = Image.open(ORIGEN).convert('RGB').crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * 3, (Y1 - Y0) * 3), Image.LANCZOS)
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0))
    for m, color in mascaras:
        mm = Image.fromarray((m * 255).astype(np.uint8)).resize(base.size, Image.NEAREST)
        capa.paste(Image.new('RGBA', base.size, color), (0, 0), mm)
    Image.alpha_composite(base.convert('RGBA'), capa).convert('RGB').save(os.path.join(FUENTES, 'comprobacion-' + nombre + '.png'))
comprobar('piezas', [(m_panel & ~m_contorno & ~m_letras & ~m_copa & ~m_vino_todo, (255, 255, 255, 70)), (m_contorno, (0, 90, 255, 150)),
                     (m_letras, (230, 30, 30, 140)), (m_caliz, (0, 170, 60, 160)), (m_tenedor, (250, 160, 0, 170)),
                     (m_vino, (150, 0, 200, 170)), (m_salp, (0, 200, 200, 170))])
print(json.dumps(medidas))
