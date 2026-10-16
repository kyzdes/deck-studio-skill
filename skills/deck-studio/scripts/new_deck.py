"""Разворачивает новую презентацию из шаблона deck-studio.

    python3 new_deck.py <папка> [--title "Название"] [--minutes 20] [--force]

В папке появятся src/ (deck.html, engine.css, engine.js, fonts/, assets/, build.py)
и copy.md — заготовка текстов. Дальше: правите src/deck.html, собираете
python3 src/build.py, открываете index.html.
"""
import argparse
import pathlib
import re
import shutil
import sys

SKILL = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = SKILL / "assets" / "template"
COPY_TEMPLATE = SKILL / "assets" / "copy-template.md"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dest")
    ap.add_argument("--title", default="Название презентации")
    ap.add_argument("--minutes", type=int, default=20)
    ap.add_argument("--force", action="store_true", help="перезаписать src/, если уже есть")
    a = ap.parse_args()

    dest = pathlib.Path(a.dest).expanduser().resolve()
    src = dest / "src"
    if src.exists() and not a.force:
        sys.exit(f"{src} уже существует — добавьте --force, если правда нужно перезаписать")
    dest.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.rmtree(src)
    shutil.copytree(TEMPLATE / "src", src)

    deck = src / "deck.html"
    html = deck.read_text(encoding="utf-8")
    html = html.replace("<title>Название презентации</title>", f"<title>{a.title}</title>", 1)
    html = re.sub(r"window\.DECK_CONFIG = \{ minutes: \d+", f"window.DECK_CONFIG = {{ minutes: {a.minutes}", html, count=1)
    deck.write_text(html, encoding="utf-8")

    copy_md = dest / "copy.md"
    if not copy_md.exists():
        copy_md.write_text(COPY_TEMPLATE.read_text(encoding="utf-8").replace("{{TITLE}}", a.title).replace("{{MINUTES}}", str(a.minutes)), encoding="utf-8")

    print(f"Готово: {dest}")
    print("  src/deck.html — слайды и DECK_DATA (сейчас там каталог из 20 демо-макетов: оставьте нужные)")
    print("  copy.md       — тексты и заметки, держите в синхроне с deck.html")
    print(f"  сборка:  cd '{dest}' && python3 src/build.py")
    print(f"  проверка: python3 '{SKILL / 'scripts' / 'check_deck.py'}' '{dest}'")


if __name__ == "__main__":
    main()
