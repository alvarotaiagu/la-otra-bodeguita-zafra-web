"""Gradación común de las fotos de su Instagram (memoria «food photo consistency»)
y fondo de hojas de la cortina.

Fotos de móvil y de cámara, de 2021 a 2026, con luz de ventana, de bombilla y de
llama. La receta iguala el TONO sin tocar lo que hay en la foto. TODO en color:
la regla de la web es que los platos y el verde del local se vean como son.

  0. Recortes:
     · la franja blanca con el logo (su marca de agua de 2022–2024): se detecta
       sola, de abajo arriba, como filas casi blancas;
     · la piedra (3376 × 6000): un encuadre más corto alrededor de la piedra;
     · la cámara (DTlWShkDdgR / DP-5C53CODL, la misma foto): dos encuadres
       distintos SIN la cartela del proveedor (va detrás de "marcas": false).
  1. Balance de blancos por «mundo gris» suave (como mucho un 35 %).
  2. Un punto cálido común (+rojo, −azul muy leve).
  3. Brillo medio hacia un objetivo común, con una S suave.
  4. Saturación intacta (factor 1,03): nada de grises, duotonos ni sepia.
  Sin desenfoque simulado: ningún fondo choca (mantelitos salvia, madera,
  cerámica azul: son suyos y van con la marca).

Entrada: la-otra-bodeguita-zafra-bocetos/ref/ig/<id>.jpg (originales, no se tocan)
Salida:  scripts/fuentes/graduadas/<id>.jpg (máster, q 94)
         assets/cortina/hojas.jpg y hojas-luz.jpg (fondo de la cortina)
Después: node scripts/fotos.mjs

  python scripts/gradar.py
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageFilter, ImageOps

sys.stdout.reconfigure(encoding='utf-8')
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..'))
IG = os.path.normpath(os.path.join(RAIZ, '..', 'la-otra-bodeguita-zafra-bocetos', 'ref', 'ig'))
DESTINO = os.path.join(AQUI, 'fuentes', 'graduadas')
os.makedirs(DESTINO, exist_ok=True)

datos = json.load(open(os.path.join(RAIZ, 'data', 'fotos.json'), encoding='utf8'))

def franja_blanca(im):
    """Alto de la franja blanca de abajo (0 si no hay)."""
    a = np.asarray(im.convert('L')).astype(float)
    h = a.shape[0]
    blanca = (a > 232).mean(1)
    # la raya gris y el logo pequeño de la franja bajan el blanco de alguna fila:
    # se para en la primera de tres filas seguidas con poco blanco (ya es foto)
    k = 0
    while k < h * 0.2 and not all(blanca[h - 1 - k - j] < 0.3 for j in range(3)): k += 1
    return k + 4 if k > h * 0.04 else 0

def recortar(im, r):
    w, h = im.size
    if not r: return im
    if r == 'franja':
        k = franja_blanca(im)
        return im.crop((0, 0, w, h - k)) if k else im
    x0, y0, x1, y1 = r                       # fracciones
    return im.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))

def gradar(im):
    x = np.asarray(im.convert('RGB')).astype(np.float64) / 255.0
    # 1 · mundo gris suave
    medio = x.reshape(-1, 3).mean(0)
    gan = medio.mean() / np.maximum(medio, 1e-4)
    gan = 1 + (np.clip(gan, 0.85, 1.18) - 1) * 0.35
    x = x * gan
    # 2 · punto cálido común
    x = x * np.array([1.025, 1.0, 0.965])
    # 3 · brillo hacia el objetivo + S suave
    L = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    med = float(np.median(L))
    objetivo = 0.50 if med > 0.30 else 0.38          # las de llama y cámara, más oscuras de por sí
    g = np.clip(np.log(objetivo) / np.log(max(med, 1e-3)), 0.86, 1.16)
    x = np.power(np.clip(x, 0, 1), g)
    L = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    S = L + 0.06 * np.sin(np.pi * (L - 0.5)) * (1 - np.abs(2 * L - 1)) * 1.6
    x = x * (np.clip(S, 0, 1) / np.maximum(L, 1e-4))[..., None]
    # 4 · saturación intacta (un pelo arriba)
    L = (0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2])[..., None]
    x = L + (x - L) * 1.03
    return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))

for f in datos['fotos']:
    origen = os.path.join(IG, f['id'] + '.jpg')
    im = ImageOps.exif_transpose(Image.open(origen)).convert('RGB')
    antes = im.size
    im = recortar(im, f.get('recorte'))
    if max(im.size) > 2400: im.thumbnail((2400, 2400), Image.LANCZOS)
    gradar(im).save(os.path.join(DESTINO, f['id'] + '.jpg'), quality=94, subsampling=0)
    print(f"{f['id']:<16} {antes[0]}×{antes[1]} → {im.size[0]}×{im.size[1]}  {f.get('recorte') or ''}")

# ── fondo de la cortina: hojas sin rótulo, ampliadas, desenfocadas y casi negras ──
hojas = Image.open(os.path.join(IG, 'DSgDcBjiF1N.jpg')).convert('RGB')
# sin espejos (salen simetrías con «cara»): las dos franjas sin rótulo, estiradas a
# media anchura cada una y fundidas en la costura; el desenfoque disimula el estirado
izq = hojas.crop((0, 0, 340, 960)).resize((900, 1302), Image.LANCZOS)
der = hojas.crop((1190, 90, 1440, 960)).resize((900, 1302), Image.LANCZOS)
fondo = Image.new('RGB', (1600, 1302))
fondo.paste(izq, (0, 0))
m = np.zeros((1302, 900), dtype=np.uint8)
m[:, 200:] = 255
m[:, :200] = np.linspace(0, 255, 200)[None, :].astype(np.uint8)
fondo.paste(der, (700, 0), Image.fromarray(m))
fondo = fondo.filter(ImageFilter.GaussianBlur(10))
os.makedirs(os.path.join(RAIZ, 'assets', 'cortina'), exist_ok=True)
a = np.asarray(fondo).astype(np.float64) / 255.0
def tono(k, verde):
    y = np.power(a, 1.25) * k
    y = y * np.array([0.82, 1.0, 0.72]) * verde + (1 - verde) * y
    return Image.fromarray((np.clip(y, 0, 1) * 255).astype(np.uint8))
tono(0.17, 1.0).save(os.path.join(RAIZ, 'assets', 'cortina', 'hojas.jpg'), quality=78)
tono(0.62, 0.6).save(os.path.join(RAIZ, 'assets', 'cortina', 'hojas-luz.jpg'), quality=78)
print('cortina: hojas.jpg y hojas-luz.jpg (1600×1302)')
