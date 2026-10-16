"""Собирает самодостаточный мудборд: подставляет картинки-референсы в шаблон как base64.

    python3 build_moodboard.py <шаблон.html> <папка с картинками> <выход.html>

В шаблоне картинка задаётся как src="{{имя-файла-без-расширения}}" (ищется .webp/.png/.jpg).
Пример шаблона с тремя направлениями и живыми образцами движения:
assets/moodboard/moodboard.template.html
"""
import base64
import mimetypes
import pathlib
import re
import sys


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    tpl, refs, out = map(pathlib.Path, sys.argv[1:4])
    html = tpl.read_text(encoding="utf-8")

    def sub(m):
        for ext in (".webp", ".png", ".jpg", ".jpeg"):
            f = refs / (m.group(1) + ext)
            if f.exists():
                mime = mimetypes.guess_type(f.name)[0] or "image/webp"
                return f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode()
        print("  ! нет картинки", m.group(1))
        return ""

    html = re.sub(r"\{\{([A-Za-z0-9_-]+)\}\}", sub, html)
    out.write_text(html, encoding="utf-8")
    print(out, round(out.stat().st_size / 1e6, 2), "MB")


if __name__ == "__main__":
    main()
