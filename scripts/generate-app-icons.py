"""Generate Drop-branded Expo/Android/web icons from drop-logo.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'images'
SRC_RAW = Image.open(ROOT / 'drop-logo.png').convert('RGBA')
BG_GREEN = (27, 67, 50, 255)


def remove_white_bg(img: Image.Image, threshold: int = 245) -> Image.Image:
    """Make near-white opaque pixels transparent so adaptive icons aren't a white square."""
    px = img.copy()
    data = px.getdata()
    out = []
    for r, g, b, a in data:
        if a > 0 and r >= threshold and g >= threshold and b >= threshold:
            out.append((r, g, b, 0))
        else:
            out.append((r, g, b, a))
    px.putdata(out)
    return px


SRC = remove_white_bg(SRC_RAW)


def fit_logo(size: int, pad_ratio: float = 0.14, bg=BG_GREEN) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), bg)
    pad = int(size * pad_ratio)
    max_side = size - pad * 2
    logo = SRC.copy()
    logo.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas


def save_rgb(img: Image.Image, path: Path) -> None:
    out = Image.new('RGB', img.size, (27, 67, 50))
    out.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
    out.save(path, 'PNG', optimize=True)
    print(f'wrote {path.name} {out.size}')


def main() -> None:
    save_rgb(fit_logo(1024, 0.16, BG_GREEN), ROOT / 'icon.png')
    save_rgb(fit_logo(1024, 0.22, BG_GREEN), ROOT / 'splash-icon.png')
    save_rgb(fit_logo(48, 0.10, BG_GREEN), ROOT / 'favicon.png')

    fg_size = 1024
    safe = int(fg_size * 0.66)
    fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    logo = SRC.copy()
    logo.thumbnail((safe, safe), Image.Resampling.LANCZOS)
    fg.alpha_composite(logo, ((fg_size - logo.width) // 2, (fg_size - logo.height) // 2))
    fg.save(ROOT / 'android-icon-foreground.png', 'PNG', optimize=True)
    print(f'wrote android-icon-foreground.png {fg.size}')

    Image.new('RGB', (1024, 1024), (27, 67, 50)).save(
        ROOT / 'android-icon-background.png', 'PNG', optimize=True
    )
    print('wrote android-icon-background.png')

    alpha = SRC.split()[-1]
    white = Image.new('RGBA', SRC.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    mono = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    wlogo = white.copy()
    wlogo.thumbnail((safe, safe), Image.Resampling.LANCZOS)
    mono.alpha_composite(wlogo, ((1024 - wlogo.width) // 2, (1024 - wlogo.height) // 2))
    mono.save(ROOT / 'android-icon-monochrome.png', 'PNG', optimize=True)
    print('wrote android-icon-monochrome.png')

    public = ROOT.parents[1] / 'public'
    public.mkdir(exist_ok=True)
    for size, name in ((192, 'icon-192.png'), (512, 'icon-512.png')):
        save_rgb(fit_logo(size, 0.14, BG_GREEN), public / name)

    print('done')


if __name__ == '__main__':
    main()
