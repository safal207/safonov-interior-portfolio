# SAFONOV. INTERIORS

**Алексей Сафонов · Концепции интерьеров небольших квартир**

**Aleksey Safonov · Small apartment interior concepts**

![Тихий свет — интерьерная концепция 37,2 м²](assets/renders/white-grad-37-2.webp)

13 самостоятельных интерьерных концепций по 9 предоставленным скриншотам планировок. Повторяющиеся объявления объединены в один кейс. Коллекция охватывает квартиры от 25,3 до 44,4 м² в Московской области: студии, квартиры с отдельной спальней и семейный вариант с двумя спальнями.

13 independent interior concepts based on 9 supplied plan screenshots. Repeated layouts form a single case. The collection covers 25.3–44.4 m² apartments in the Moscow region: studios, one-bedroom homes and a two-bedroom family home.

**Статус проектов:** концепции. Визуализации созданы с помощью AI. Точная геометрия, мебель, инженерные решения и реализация уточняются после обмеров. Планы застройщиков используются как предоставленные исходные материалы; портфолио не заявляет авторство этих планов или партнёрство с застройщиками.

**Project status:** concepts. Images are AI-generated. Geometry, furniture dimensions, technical details and execution require measured plans. Developer plans are supplied reference materials; this portfolio does not claim authorship of the plans or a developer partnership.

[Открыть все кейсы прямо на GitHub / Read every case on GitHub](docs/CASEBOOK.md)

| № | Концепция / Concept | ЖК / Development | Площадь |
| --- | --- | --- | ---: |
| 01 | [Тихий свет / Quiet light](docs/CASEBOOK.md#white-grad-37-2) | Белый Град | 37,2 м² |
| 02 | [Терракотовый завтрак / Terracotta breakfast](docs/CASEBOOK.md#white-grad-35-2) | Белый Град | 35,2 м² |
| 03 | [Тёплый камень / Warm stone](docs/CASEBOOK.md#white-grad-37-9) | Белый Град | 37,9 м² |
| 04 | [Оливковый ритм / Olive rhythm](docs/CASEBOOK.md#white-grad-34-6) | Белый Град | 34,6 м² |
| 05 | [Графит и орех / Graphite & walnut](docs/CASEBOOK.md#white-grad-38-1) | Белый Град | 38,1 м² |
| 06 | [Средиземное утро / Mediterranean morning](docs/CASEBOOK.md#kino-33-3) | Киноквартал | 33,3 м² |
| 07 | [Дом для троих / A home for three](docs/CASEBOOK.md#ornament-44-4) | Орнамент | 44,4 м² |
| 08 | [Пудра и дуб / Blush & oak](docs/CASEBOOK.md#white-grad-34-9) | Белый Град | 34,9 м² |
| 09 | [Северный берег / Northern shore](docs/CASEBOOK.md#white-grad-37-5) | Белый Град | 37,5 м² |
| 10 | [Больше воздуха / Room to breathe](docs/CASEBOOK.md#sholokhovo-40-9) | Шолохово | 40,9 м² |
| 11 | [Одна комната, три сценария / One room, three rhythms](docs/CASEBOOK.md#publicist-25-3) | Публицист | 25,3 м² |
| 12 | [Карамельная студия / Caramel studio](docs/CASEBOOK.md#granel-30-1) | Гранель Мытищи | 30,1 м² |
| 13 | [Комната для жизни / Space for everyday life](docs/CASEBOOK.md#kotelniki-37) | Котельники парк | 37 м² |

## Что внутри / Contents

- Адаптивный сайт: главная страница и 13 страниц проектов, RU/EN, фильтры, увеличиваемые изображения.
- 13 финальных визуализаций в WebP, 9 неизменённых исходных скриншотов.
- Для каждого проекта: сценарий жизни, решения по расстановке и хранению, свет, палитра, источник и его ограничения.
- Markdown-каталог для просмотра непосредственно в GitHub.
- Данные, генератор страниц, промпты и журнал двух визуальных правок.
- Проверка файлов и контента, браузерная проверка, рабочий процесс GitHub Pages.

## Запуск / Run

Сайт не требует установки зависимостей. Можно открыть `index.html` в браузере или запустить локальный сервер:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`. The static site also opens directly from `index.html`.

После редактирования `data/projects.json` пересоберите страницы и проверьте результат:

```bash
node scripts/build.mjs
node scripts/verify.mjs
```

Для браузерной проверки нужен установленный Playwright и Chromium. В поддерживаемом Codex runtime используется предустановленный пакет. Для другого браузерного бинарника задайте `PORTFOLIO_CHROMIUM_EXECUTABLE`.

```bash
node scripts/smoke.mjs
```

Однофайловый просмотр со всеми изображениями и кейсами:

```bash
node scripts/preview.mjs
```

Результат: `output/Safonov_Interiors_Portfolio.html`.

## Публикация / Publishing

Публичный репозиторий: [safal207/safonov-interior-portfolio](https://github.com/safal207/safonov-interior-portfolio). Все 13 концепций доступны в [CASEBOOK](docs/CASEBOOK.md). Публикация сайта через GitHub Pages запускается отдельно.

[Порядок публикации / Publishing steps](docs/PUBLISHING.md)

## Контакт / Contact

[safal0645@protonmail.com](mailto:safal0645@protonmail.com) · [GitHub / safal207](https://github.com/safal207)
