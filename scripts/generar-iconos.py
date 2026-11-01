"""Genera los iconos PNG/ICO de public/ a partir del dibujo de public/favicon.svg.

Uso: python3 scripts/generar-iconos.py   (requiere Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parent.parent / "public"
VERDE = (15, 118, 110, 255)  # #0F766E
AMARILLO = (250, 204, 21, 255)  # #FACC15
TINTA = (16, 32, 29, 255)  # #10201D
SUPER = 8  # supermuestreo para suavizar bordes


def dibujar_senal(d, k, ox, oy):
    """Dibuja la señal sobre un lienzo; coordenadas del viewBox 64 → píxeles."""

    def p(x, y):
        return (ox + x * k, oy + y * k)

    def poligono(pts, relleno):
        d.polygon([p(*q) for q in pts], fill=relleno)

    exterior = [(32, 8), (58, 54), (6, 54)]
    poligono(exterior, TINTA)
    # trazo de 4 unidades con uniones redondeadas
    for a, b in zip(exterior, exterior[1:] + exterior[:1]):
        d.line([p(*a), p(*b)], fill=TINTA, width=round(4 * k))
    for x, y in exterior:
        cx, cy = p(x, y)
        r = 2 * k
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TINTA)
    poligono([(32, 15), (51, 49), (13, 49)], AMARILLO)
    d.line([p(32, 24), p(32, 38)], fill=TINTA, width=round(5 * k))
    for cx, cy, r in ((32, 24, 2.5), (32, 38, 2.5), (32, 44, 3)):
        x, y = p(cx, cy)
        d.ellipse([x - r * k, y - r * k, x + r * k, y + r * k], fill=TINTA)


def icono(tam, redondeado, escala_senal=1.0):
    """redondeado=True → esquinas transparentes (como favicon.svg);
    False → fondo a sangre (apple-touch y maskable, el sistema recorta)."""
    g = tam * SUPER
    img = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if redondeado:
        d.rounded_rectangle([0, 0, g - 1, g - 1], radius=g * 14 / 64, fill=VERDE)
    else:
        d.rectangle([0, 0, g, g], fill=VERDE)
    k = g / 64 * escala_senal
    # la señal ocupa x 4–60, y 6–56: se centra en el lienzo
    dibujar_senal(d, k, (g - 64 * k) / 2, (g - 64 * k) / 2 - (31 - 32) * k)
    return img.resize((tam, tam), Image.LANCZOS)


def main():
    icono(192, True, 0.88).save(PUBLIC / "icon-192.png")
    icono(512, True, 0.88).save(PUBLIC / "icon-512.png")
    # maskable: toda la señal dentro del círculo seguro (40 % del lado)
    icono(512, False, 0.72).save(PUBLIC / "icon-maskable-512.png")
    icono(180, False, 0.86).convert("RGB").save(PUBLIC / "apple-touch-icon.png")
    icono(256, True, 0.94).save(
        PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print("Iconos generados en", PUBLIC)


if __name__ == "__main__":
    main()
