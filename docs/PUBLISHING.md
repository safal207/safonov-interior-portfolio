# Публикация отдельного репозитория

Владелец: **safal207**. Имя: **safonov-interior-portfolio**. Описание: **Aleksey Safonov — 13 compact-apartment interior concepts, RU/EN portfolio**.

Публичный репозиторий [safal207/safonov-interior-portfolio](https://github.com/safal207/safonov-interior-portfolio) создан. Исходники портфолио находятся в ветке `main`.

Публичный сайт: https://safal207.github.io/safonov-interior-portfolio/

Английская версия: https://safal207.github.io/safonov-interior-portfolio/en/

Для дальнейшего редактирования:

```bash
git clone https://github.com/safal207/safonov-interior-portfolio.git
cd safonov-interior-portfolio
```

1. Проверять результат Verify portfolio после каждого изменения. Портфолио с визуализациями также читается прямо в README и docs/CASEBOOK.md.
2. Источник Pages настроен на GitHub Actions. Workflow Publish portfolio to GitHub Pages запускается после push в main; также доступен ручной запуск.
3. Использовать URL, который вернёт успешно завершённая публикация. Проверить главную, RU/EN, один кейс и увеличение визуализации по этому URL.

Во время публикации `actions/configure-pages` передаёт настоящий базовый URL в генератор. По нему создаются абсолютные Open Graph и canonical ссылки. Локальный просмотр не содержит заявления о существующем публичном адресе.

Рабочий процесс основан на официальной документации GitHub:

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Сохранение исходников

Основные файлы редактирования: `data/projects.json`, `scripts/build.mjs`, `assets/style.css`, `assets/app.js`. Сгенерированные HTML-страницы и `docs/CASEBOOK.md` находятся в Git, чтобы сайт открывался без сборки. После изменения данных генератор обновляет их вместе.
