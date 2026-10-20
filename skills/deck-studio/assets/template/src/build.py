"""deck-studio build: собирает презентацию в один файл index.html.

Встраивает в deck.html всё локальное: <link rel="stylesheet" href="…"> (шрифты, engine.css),
<script src="…"></script> (engine.js) и картинки src="assets/…" как data URI.
Готовый файл открывается без интернета и без сервера. Если картинки из assets/ нет,
файл всё равно пишется, но код возврата 1 — такую деку нельзя отдавать.

Запуск из папки презентации:  python3 src/build.py
"""
import base64
import mimetypes
import pathlib
import re
import sys

here = pathlib.Path(__file__).resolve().parent
html = (here / "deck.html").read_text(encoding="utf-8")
missing = []


def inline_css(m):
    return "<style>\n" + (here / m.group(1)).read_text(encoding="utf-8") + "\n</style>"


def inline_js(m):
    return "<script>\n" + (here / m.group(1)).read_text(encoding="utf-8") + "\n</script>"


def inline_asset(m):
    f = here / "assets" / m.group(1)
    if not f.exists():
        missing.append(f)
        return m.group(0)
    mime = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
    return 'src="data:%s;base64,%s"' % (mime, base64.b64encode(f.read_bytes()).decode())


html = re.sub(r'<link rel="stylesheet" href="((?!https?:)[^"]+)">', inline_css, html)
html = re.sub(r'<script src="((?!https?:)[^"]+)"></script>', inline_js, html)
html = re.sub(r'src="assets/([^"]+)"', inline_asset, html)

out = here.parent / "index.html"
out.write_text(html, encoding="utf-8")
print(out, round(out.stat().st_size / 1e3), "KB")
if missing:
    for f in missing:
        print("  ! нет файла", f)
    sys.exit("Сборка неполная: на слайдах будут пустые картинки")
