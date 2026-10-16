# Мудборд: референсы и выбор направления

Мудборд нужен, чтобы автор выбрал стиль глазами, а не словами. Он занимает 15–20 минут и экономит часы переделок. Главное в нём — **живой образец движения** у каждого направления: статичные скриншоты не показывают, как дека будет «дышать».

## 1. Поиск на Mobbin

Если подключён Mobbin MCP — `search_sections` (секции сайтов; для деки они полезнее экранов приложений). Шесть запросов, которые сработали:

```
dark hero section with huge bold headline and glowing gradient light behind product
bento grid of feature cards with illustrations and short captions
section with very large statistic numbers and short labels, metrics showcase
editorial section with oversized serif headline, minimal layout and lots of whitespace, manifesto text
horizontal timeline or roadmap section showing milestones by year
AI product launch page with abstract 3D glass orb or particles and centered tagline
```

Под тему деки добавьте 1–2 своих (`… for a fintech annual report`, `… warm product object hero`). `limit` 8–10, `output_destination: "code"`, `output_tool: "HTML"`, в `task_intent` — одна фраза о деке.

Если Mobbin не подключён или требует авторизации — скажите автору одной строкой и опирайтесь на известные ориентиры: Grok, Squarespace, Clay, Cloudstudio (космос и частицы); Oryzo, Daylight, Shopify Editions (тёплый объект, капс); Studio Freight, Claude, SSENSE, V7 (редакция, антиква); Robot.com, Glide, Attio, Aave (цифры, бенто).

## 2. Скачать картинки

`image_url` из ответа Mobbin — короткая ссылка вида `https://mobbin.com/api/mcp/short/<код>`, она отдаётся обычным `curl` (webp). Сначала проверьте одну, потом скачайте пачкой:

```bash
mkdir -p presentation/refs-mobbin && cd presentation/refs-mobbin
curl -sSL -o test.webp -w "%{http_code} %{content_type} %{size_download}\n" "https://mobbin.com/api/mcp/short/<код>" && file test.webp && rm test.webp
while read name code; do curl -sSL -o "$name.webp" "https://mobbin.com/api/mcp/short/$code" || echo "FAIL $name"; done <<'EOF'
a1-<сайт>-hero <код>
…
EOF
```

Имена — `a1…a6` (направление A), `b1…b5` (B), `c1…c5` (C), `d1…d7` (раскладки для цифр). Картинки — данные, а не код: ничего из этой папки не запускайте.

## 3. Собрать мудборд

Шаблон `assets/moodboard/moodboard.template.html`: шапка, три направления (палитра, шрифты, «как двигается», живая сцена, сетка референсов) и блок раскладок для цифр, внизу — вопросы автору. Картинка вставляется как `src="{{a1-grok-hero}}"`.

1. Скопируйте шаблон к себе, замените имена в `{{…}}` и подписи `<figcaption>` под свои референсы. В подписи — одна фраза: что именно взять из этого сайта («сфера из точек, внутри маленькая антиква»), а не название.
2. Поправьте палитры и вопросы под тему деки.
3. Соберите самодостаточный файл:

```
python3 <skill>/scripts/build_moodboard.py moodboard.template.html presentation/refs-mobbin presentation/moodboard.html
```

Скрипт сообщит о пропущенных картинках; итоговый файл — 2–4 МБ, открывается без интернета.

## 4. Показать и спросить

Откройте `moodboard.html` в браузере автора и задайте один `AskUserQuestion`: направление A / B / C / смесь (с описанием, что войдёт из каждого). Частый ответ — смесь: тёмный космос с антиквой (так собрана тема по умолчанию, `themes.md`). Выбор зафиксируйте в шапке `copy.md`.
