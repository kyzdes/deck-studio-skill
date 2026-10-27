"""Разворачивает новую презентацию из шаблона deck-studio.

    python3 new_deck.py <папка> [--title "Название"] [--minutes 20] [--style particles|grid]
                        [--theme dark|light] [--accent terracotta|blue|violet|green|amber|rose|mono|#hex] [--force]

--style grid — светлая «Сетка» без поля частиц (assets/styles/grid): --theme для неё не действует,
--accent задаёт цвет данных.

В папке появятся src/ (deck.html, engine.css, engine.js, fonts/, assets/, build.py)
и copy.md — заготовка текстов. Дальше: правите src/deck.html, собираете
python3 src/build.py, открываете index.html.
"""
import argparse
import pathlib
import re
import shutil
import sys

BG_DARK, BG_LIGHT = "#07080b", "#f4f1ea"  # --bg тёмной и светлой темы в engine.css


def accents():
    js = (TEMPLATE / "src" / "engine.js").read_text(encoding="utf-8")
    return re.findall(r"'(\w+)'", js.split("const ACCENTS = [", 1)[1].split("]", 1)[0])


def contrast(a, b):
    def lum(h):
        c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def readable(color, bg, toward):
    """Смешивает цвет с белым или чёрным, пока мелкий текст не станет читаемым на фоне (4,5:1)."""
    rgb, t = [int(color[i:i + 2], 16) for i in (1, 3, 5)], int(toward[1:3], 16)
    for step in range(21):
        f = step / 20
        out = "#" + "".join(f"{round(c + (t - c) * f):02x}" for c in rgb)
        if contrast(out, bg) >= 4.5:
            return out
    return toward

SKILL = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = SKILL / "assets" / "template"
STYLES = SKILL / "assets" / "styles"
COPY_TEMPLATE = SKILL / "assets" / "copy-template.md"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dest")
    ap.add_argument("--title", default="Название презентации")
    ap.add_argument("--minutes", type=int, default=20)
    ap.add_argument("--style", choices=("particles", "grid"), default="particles", help="grid — светлая «Сетка» без частиц")
    ap.add_argument("--theme", choices=("dark", "light"), default="dark")
    ap.add_argument("--accent", help="готовый акцент или свой цвет #rrggbb; по умолчанию terracotta, у «Сетки» violet")
    ap.add_argument("--force", action="store_true", help="перезаписать src/, если уже есть")
    a = ap.parse_args()
    a.accent = a.accent or ("violet" if a.style == "grid" else "terracotta")
    custom = re.fullmatch(r"#[0-9a-fA-F]{6}", a.accent)
    names = accents()
    if a.accent not in names and not custom:
        sys.exit(f"--accent: один из {', '.join(names)} или цвет #rrggbb")

    dest = pathlib.Path(a.dest).expanduser().resolve()
    src = dest / "src"
    if src.exists() and not a.force:
        sys.exit(f"{src} уже существует — добавьте --force, если правда нужно перезаписать")
    dest.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.rmtree(src)
    shutil.copytree(TEMPLATE / "src", src)
    if a.style != "particles":
        shutil.copy(STYLES / a.style / "deck.html", src / "deck.html")

    deck = src / "deck.html"
    html = deck.read_text(encoding="utf-8")
    html = html.replace("<title>Название презентации</title>", f"<title>{a.title}</title>", 1)
    html = re.sub(r"window\.DECK_CONFIG = \{ minutes: \d+", f"window.DECK_CONFIG = {{ minutes: {a.minutes}", html, count=1)
    html = html.replace('data-theme="dark"', f'data-theme="{a.theme}"', 1)
    if custom:
        html = re.sub(r' data-accent="\w+"', "", html, count=1)
        dark, light = readable(a.accent.lower(), BG_DARK, "#ffffff"), readable(a.accent.lower(), BG_LIGHT, "#000000")
        brand = (f":root {{ --accent: {dark}; }}  /* свой акцент {a.accent}, подогнан до контраста 4,5:1 */\n"
                 f"[data-theme=\"light\"] {{ --accent: {light}; }}\n")
        html = html.replace("</style>\n</head>", brand + "</style>\n</head>", 1)
    else:
        html = re.sub(r'data-accent="\w+"', f'data-accent="{a.accent}"', html, count=1)
    deck.write_text(html, encoding="utf-8")

    copy_md = dest / "copy.md"
    if not copy_md.exists():
        copy_md.write_text(COPY_TEMPLATE.read_text(encoding="utf-8").replace("{{TITLE}}", a.title).replace("{{MINUTES}}", str(a.minutes)), encoding="utf-8")

    theme = "светлая «Сетка»" if a.style == "grid" else a.theme
    print(f"Готово: {dest} · тема {theme} · акцент {a.accent}")
    print(f"  src/deck.html — слайды и DECK_DATA (сейчас там каталог из {16 if a.style == 'grid' else 20} демо-макетов: оставьте нужные)")
    print("  copy.md       — тексты и заметки, держите в синхроне с deck.html")
    print(f"  сборка:  cd '{dest}' && python3 src/build.py")
    print(f"  проверка: python3 '{SKILL / 'scripts' / 'check_deck.py'}' '{dest}'")


if __name__ == "__main__":
    main()
