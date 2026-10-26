"""Сквозная проверка шаблона: new_deck → check_deck → build. Без внешних зависимостей.

    python tests/test_deck.py
"""
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import unittest

SKILL = pathlib.Path(__file__).resolve().parent.parent / "skills" / "deck-studio"
SCRIPTS = SKILL / "scripts"
ENV = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1")
sys.path.insert(0, str(SCRIPTS))
import new_deck  # noqa: E402


def run(*args, cwd=None):
    return subprocess.run([sys.executable, *map(str, args)], cwd=cwd, env=ENV,
                          capture_output=True, text=True, encoding="utf-8")


class DeckTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.deck = pathlib.Path(self.tmp.name) / "deck"

    def tearDown(self):
        self.tmp.cleanup()

    def make(self, *flags):
        r = run(SCRIPTS / "new_deck.py", self.deck, *flags)
        self.assertEqual(r.returncode, 0, r.stderr)
        return self.deck / "src" / "deck.html"

    def edit(self, html, old, new):
        s = html.read_text(encoding="utf-8")
        self.assertIn(old, s)
        html.write_text(s.replace(old, new, 1), encoding="utf-8")

    def check(self):
        return run(SCRIPTS / "check_deck.py", self.deck)

    def test_template_passes_check_and_builds_offline(self):
        self.make()
        r = self.check()
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("Слайдов: 20", r.stdout)
        b = run(self.deck / "src" / "build.py")
        self.assertEqual(b.returncode, 0, b.stdout + b.stderr)
        out = (self.deck / "index.html").read_text(encoding="utf-8")
        for leftover in ('src="assets/', "<script src=", '<link rel="stylesheet" href='):
            self.assertNotIn(leftover, out)

    def test_particles_off_skips_formations(self):
        html = self.make()
        self.edit(html, "window.DECK_CONFIG = { minutes: 20", "window.DECK_CONFIG = { particles: false, minutes: 20")
        self.edit(html, 'data-fx="sphere"', 'data-fx="nonexistent"')
        r = self.check()
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("Частицы выключены", r.stdout)
        self.assertNotIn("одна формация", r.stdout)

    def test_slide_with_extra_class_is_counted(self):
        html = self.make()
        self.edit(html, '<section class="slide" data-fx="burst"', '<section class="slide quote-slide" data-fx="burst"')
        r = self.check()
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("Слайдов: 20", r.stdout)

    def test_deck_data_parsed_as_a_block(self):
        html = self.make()
        self.edit(html, "  people: 810,\n  visits: 2618,", "  people: 810, visits: 2618, site: 'https://example.com', // ссылка\n")
        self.edit(html, "avg: '9,8'", "avg: ''")
        r = self.check()
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertRegex(r.stdout, r"пустые поля.*\bavg\b")

    def test_unknown_formation_and_figure_fail(self):
        html = self.make()
        self.edit(html, 'data-fx="burst"', 'data-fx="explode"')
        self.edit(html, 'data-fx="icons@540,gear,bulb"', 'data-fx="icons@540,gear,cat"')
        r = self.check()
        self.assertEqual(r.returncode, 1)
        self.assertIn("«explode»", r.stdout)
        self.assertIn("«cat»", r.stdout)

    def test_missing_asset_fails_build(self):
        html = self.make()
        self.edit(html, "assets/screenshot.svg", "assets/screenshot-typo.svg")
        b = run(self.deck / "src" / "build.py")
        self.assertEqual(b.returncode, 1)
        self.assertIn("screenshot-typo.svg", b.stdout)

    def test_brand_accent_is_readable_in_both_themes(self):
        html = self.make("--accent", "#12a4b8")
        s = html.read_text(encoding="utf-8")
        dark = re.search(r":root \{ --accent: (#[0-9a-f]{6}); \}", s).group(1)
        light = re.search(r'\[data-theme="light"\] \{ --accent: (#[0-9a-f]{6}); \}', s).group(1)
        self.assertGreaterEqual(new_deck.contrast(dark, new_deck.BG_DARK), 4.5)
        self.assertGreaterEqual(new_deck.contrast(light, new_deck.BG_LIGHT), 4.5)
        self.assertNotIn("data-accent=", s.split("<head>", 1)[0])
        self.assertEqual(self.check().returncode, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
