"""
Genera ic_launcher_foreground.png con el LOGOTIPO para el icono adaptativo.

Zona segura de Android: del lienzo de 108dp solo esta garantizado el circulo
central de 66dp (61,1% del ancho). El logotipo mide 603,7 x 217,3, relacion
2,778:1, asi que el ancho maximo que cabe en ese circulo es

    w * raiz(1 + (1/2,778)^2) = 0,611 * lienzo   ->   w = 0,575 * lienzo

Se usa 57% para dejar un margen. Por eso el logotipo se ve mas pequeño que el
isotipo que habia antes: el isotipo es casi cuadrado y aprovecha el circulo,
el logotipo es casi tres veces mas ancho que alto y no puede.
"""
import subprocess, pathlib
from PIL import Image

SVG   = 'resources/alyto-logotipo-blanco.svg'
ANCHO = 0.57
TAM   = {'ldpi':81, 'mdpi':108, 'hdpi':162, 'xhdpi':216, 'xxhdpi':324, 'xxxhdpi':432}

for dens, s in TAM.items():
    w = round(s * ANCHO)
    tmp = f'/tmp/dis/logo-{dens}.png'
    subprocess.run(['inkscape', SVG, '--export-type=png', f'--export-filename={tmp}',
                    f'--export-width={w}'], check=True, capture_output=True)
    logo   = Image.open(tmp).convert('RGBA')
    lienzo = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    lienzo.paste(logo, ((s - logo.width)//2, (s - logo.height)//2), logo)
    destino = f'android/app/src/main/res/mipmap-{dens}/ic_launcher_foreground.png'
    lienzo.save(destino)
    diag = (logo.width**2 + logo.height**2) ** .5
    seguro = s * 0.611
    print(f'  {dens:8s} {s}x{s}  logo {logo.width}x{logo.height}  '
          f'diagonal {diag:.0f} / zona segura {seguro:.0f}  '
          f'{"OK" if diag <= seguro else "SE SALE"}')
