"""Проверка деки deck-studio перед показом.

    python3 check_deck.py <папка деки | путь к src/deck.html> [--minutes 20]

Печатает таблицу слайдов (номер, раздел, время, шаги по клику, формация, заголовок),
сумму времени против цели, незаполненные поля DECK_DATA (null или пустая строка), поля data-f,
которых нет в DECK_DATA, неизвестные формации и пометки [в квадратных скобках]
в заметках — это открытые вопросы к автору, и соседние слайды с одной формацией
(переход частиц не виден — это предупреждение, не ошибка). Код возврата 1, если есть проблемы.
"""
import argparse
import html as htmllib
import pathlib
import re
import sys

KNOWN_THEMES = {"dark", "light"}
TEMPLATE_ENGINE = pathlib.Path(__file__).resolve().parent.parent / "assets" / "template" / "src" / "engine.js"
STRING_OR_COMMENT = r"('(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`[^`]*`)|//[^\n]*"


def engine_names(engine):
    """Формации, фигуры и акценты берём из самого движка, чтобы списки не расходились."""
    js = engine.read_text(encoding="utf-8")
    block = lambda name: js.split(f"const {name} = {{", 1)[1].split("\n  };", 1)[0]
    keys = lambda name: set(re.findall(r"^\s{4}([a-z]\w*)\s*:", block(name), re.M))
    accents = set(re.findall(r"'(\w+)'", js.split("const ACCENTS = [", 1)[1].split("]", 1)[0]))
    return keys("FORMS"), keys("ICONS"), accents


def deck_data(src):
    """Ключи DECK_DATA и пустые поля (null, '' — как в движке) по всему блоку, а не по строкам."""
    m = re.search(r"window\.DECK_DATA\s*=\s*\{(.*?)\n\s*\};?", src, re.S)
    if not m:
        return set(), []
    body = re.sub(STRING_OR_COMMENT, lambda x: x.group(1) or "", m.group(1))
    pairs = re.findall(r"([A-Za-z_]\w*)\s*:\s*('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`[^`]*`|[^,\n}]+)", body)
    return {k for k, _ in pairs}, [k for k, v in pairs if v.strip() in ("null", "undefined", "''", '""', "``")]


def strip(s):
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--minutes", type=float)
    a = ap.parse_args()
    p = pathlib.Path(a.path).expanduser()
    if p.is_dir():
        p = p / "src" / "deck.html" if (p / "src" / "deck.html").exists() else p / "deck.html"
    src = p.read_text(encoding="utf-8")
    engine = p.parent / "engine.js"
    KNOWN_FX, KNOWN_ICONS, KNOWN_ACCENTS = engine_names(engine if engine.exists() else TEMPLATE_ENGINE)

    m = re.search(r"DECK_CONFIG\s*=\s*\{[^}]*minutes:\s*([\d.]+)", src)
    target = a.minutes or (float(m.group(1)) if m else 20)
    data_keys, nulls = deck_data(src)
    shapes = set(re.findall(r"^\s{2}([A-Za-z_]\w*)\s*:\s*\{\s*$", src.split("window.DECK_SHAPES", 1)[1].split("</script>", 1)[0], re.M)) if "window.DECK_SHAPES" in src else set()

    problems = 0
    total = 0
    rows = []
    # движок берёт все .slide, поэтому и здесь слайд — любой <section>, где среди классов есть slide
    sections = [sm for sm in re.finditer(r"<section\b([^>]*)>(.*?)</section>", src, re.S)
                if re.search(r'class="[^"]*\bslide\b', sm.group(1))]
    for i, sm in enumerate(sections, 1):
        attrs, body = sm.group(1), sm.group(2)
        get = lambda name: (re.search(name + r'="([^"]*)"', attrs) or [None, ""])[1]
        fx, act, tm = get("data-fx"), get("data-act"), get("data-time")
        sec = 0
        if re.match(r"^\d+:\d\d$", tm):
            mm, ss = tm.split(":")
            sec = int(mm) * 60 + int(ss)
        else:
            print(f"  ! слайд {i}: нет data-time"); problems += 1
        total += sec
        steps = max([int(x) for x in re.findall(r'data-step="(\d+)"', body)] or [0])
        tmatch = re.search(r'<(h1|h2|blockquote)[^>]*class="[^"]*\b(t|quote)\b[^"]*"[^>]*>(.*?)</\1>', body, re.S)
        title = strip(tmatch.group(3)) if tmatch else "—"
        for spec in fx.split("|"):
            name, _, args = spec.partition("@")
            if name not in KNOWN_FX:
                print(f"  ! слайд {i}: неизвестная формация «{name}»"); problems += 1
            if name == "icons":
                for arg in [x for x in args.split(",") if x and not re.match(r"^-?[\d.]+$", x)]:
                    if arg not in KNOWN_ICONS | shapes:
                        print(f"  ! слайд {i}: неизвестная фигура «{arg}» в icons"); problems += 1
            if name == "shape":
                nm = args.split(",")[0]
                if nm not in KNOWN_ICONS | shapes:
                    print(f"  ! слайд {i}: неизвестная фигура «{nm}» в shape"); problems += 1
        notes = re.search(r'<aside class="notes">(.*?)</aside>', body, re.S)
        todos = re.findall(r"\[([^\]\[]{3,})\]", strip(notes.group(1))) if notes else []
        todos = [t for t in todos if not re.match(r"^Клик", t)]
        if not notes:
            print(f"  ! слайд {i}: нет заметок спикера"); problems += 1
        rows.append((i, act, tm or "?", steps, fx, title, todos))

    print(f"\n{'№':>3}  {'время':>5}  {'клики':>5}  {'формация':<26} заголовок")
    for i, act, tm, steps, fx, title, _ in rows:
        print(f"{i:>3}  {tm:>5}  {steps or '':>5}  {fx[:26]:<26} {title[:90]}")
    tag = (re.search(r"<html[^>]*>", src) or [""])[0]
    theme = (re.search(r'data-theme="([^"]*)"', tag) or [None, "dark"])[1]
    am = re.search(r'data-accent="([^"]*)"', tag)
    accent = am[1] if am else "terracotta"
    head_css = re.sub(r"/\*.*?\*/", "", src.split("</head>", 1)[0], flags=re.S)
    own = re.search(r":root\s*\{[^}]*--accent\s*:\s*([^;}]+)", head_css)
    if own:
        accent = own[1].strip() + " (свой цвет в <style>)"
    print(f"\nТема: {theme} · акцент: {accent}")
    if theme not in KNOWN_THEMES:
        print(f"  ! неизвестная тема «{theme}»: dark или light"); problems += 1
    if not own and accent not in KNOWN_ACCENTS:
        print(f"  ! неизвестный акцент «{accent}»: {', '.join(sorted(KNOWN_ACCENTS))} или свой цвет в <style>"); problems += 1
    print(f"Слайдов: {len(rows)} · время: {total // 60}:{total % 60:02d} · цель: {int(target)}:{int(target * 60 % 60):02d}")
    if abs(total - target * 60) > 30:
        print("  ! сумма data-time расходится с целью больше чем на 30 секунд"); problems += 1

    for (i, *_, fx_a, _t, _q), (j, *_, fx_b, _t2, _q2) in zip(rows, rows[1:]):
        last, first = fx_a.split("|")[-1], fx_b.split("|")[0]
        if last == first:
            print(f"  ~ слайды {i} → {j}: одна формация «{first}», переход частиц не виден")

    used = set(re.findall(r'data-f="([^"]+)"', src)) | {x[1:] for x in re.findall(r'data-(?:lit|groups)="[^"]*?(@\w+)', src)}
    used |= set(re.findall(r"@(\w+)", " ".join(re.findall(r'data-groups="([^"]*)"', src))))
    unknown = sorted(k for k in used if k not in data_keys)
    if unknown:
        print("  ! поля без значения в DECK_DATA:", ", ".join(unknown)); problems += 1
    if nulls:
        print("  · пустые поля (на слайде пунктир):", ", ".join(nulls))
    open_q = [(i, t) for i, *_, todos in rows for t in todos]
    if open_q:
        print("  · открытые вопросы в заметках:")
        for i, t in open_q:
            print(f"      слайд {i}: [{t}]")
    print("OK" if not problems else f"Проблем: {problems}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
