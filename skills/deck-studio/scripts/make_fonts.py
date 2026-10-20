"""Скачивает шрифты Google Fonts (кириллица + латиница) и пишет src/fonts/fonts.css
с base64-встроенными файлами, чтобы презентация работала без интернета.

    python3 make_fonts.py <папка деки> "Cormorant Garamond:ital,wght@0,500;0,600;1,500" "Inter Tight:wght@300;400;500" "JetBrains Mono:wght@400;500"

Нужен интернет. Семейства и оси — как в адресе fonts.googleapis.com/css2.
Файл пишется заново: перечислите ВСЕ семейства деки, иначе пропущенные заменит системный шрифт.
После замены шрифтов поправьте --serif / --sans / --mono в deck.html (references/themes.md).
"""
import base64
import pathlib
import re
import sys
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
SUBSETS = ("cyrillic", "latin")


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30).read()


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    deck = pathlib.Path(sys.argv[1]).expanduser()
    out = deck / "src" / "fonts" / "fonts.css"
    query = "&".join("family=" + urllib.parse.quote(f, safe=":,;@") for f in sys.argv[2:])
    css = fetch(f"https://fonts.googleapis.com/css2?{query}&display=swap").decode()
    faces, cache, merged = [], {}, {}
    for subset, body in re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.S):
        if subset not in SUBSETS:
            continue
        fam = re.search(r"font-family: '([^']+)'", body).group(1)
        style = re.search(r"font-style: (\w+)", body).group(1)
        weight = int(re.search(r"font-weight: (\d+)", body).group(1))
        url = re.search(r"url\((.*?)\)", body).group(1)
        rng = re.search(r"unicode-range: (.*?);", body).group(1)
        if url not in cache:
            cache[url] = base64.b64encode(fetch(url)).decode()
        merged.setdefault((fam, style, url, rng), []).append(weight)
    for (fam, style, url, rng), ws in merged.items():
        wr = f"{min(ws)} {max(ws)}" if len(set(ws)) > 1 else str(ws[0])
        faces.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{wr};font-display:block;"
                     f"src:url(data:font/woff2;base64,{cache[url]}) format('woff2');unicode-range:{rng};}}")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(faces), encoding="utf-8")
    print(out, len(faces), "faces,", len(cache), "files,", round(out.stat().st_size / 1e3), "KB")
    families = sorted({f for f, *_ in merged})
    print("  в файле:", ", ".join(families), "— остальные семейства деки упадут на системный шрифт")
    cyr = {re.search(r"font-family: '([^']+)'", b).group(1) for sub, b in re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{(.*?)\}", css, re.S) if sub == "cyrillic"}
    for fam in families:
        if fam not in cyr:
            print(f"  ! у «{fam}» нет кириллицы: русский текст покажется системным шрифтом")


if __name__ == "__main__":
    main()
