import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json'), 'utf8'));
const siteURL = process.env.PORTFOLIO_SITE_URL?.replace(/\/$/, '');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (ru, en) => `<span data-lang="ru" lang="ru">${esc(ru)}</span><span data-lang="en" lang="en">${esc(en)}</span>`;
const dual = obj => text(obj.ru, obj.en);
const area = n => text(String(n).replace('.', ',') + ' м²', String(n) + ' m²');
const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
const type = value => ({studio: {ru:'Студия',en:'Studio'}, 'one-bedroom': {ru:'Отдельная спальня',en:'Separate bedroom'}, family: {ru:'Две спальни',en:'Two bedrooms'}}[value]);

function head(title, description, prefix, image, languageTitle, pagePath='index.html') {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#364336">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(siteURL ? siteURL+'/assets/renders/'+image : prefix+'assets/renders/'+image)}">
${siteURL ? `  <link rel="canonical" href="${esc(siteURL+'/'+pagePath)}"><meta property="og:url" content="${esc(siteURL+'/'+pagePath)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/style.css">
  <script src="${prefix}assets/language-init.js"></script>
  <script src="${prefix}assets/app.js" defer></script>
</head>
<body data-title-ru="${esc(title)}" data-title-en="${esc(languageTitle)}">
<a class="skip-link" href="#main">${text('К содержанию','Skip to content')}</a>`;
}

function header(prefix) {
  return `<header class="site-header shell">
    <a class="wordmark" href="${prefix}index.html" aria-label="Safonov Interiors"><strong>SAFONOV<span class="brand-dot">.</span></strong><span>INTERIORS</span></a>
    <nav aria-label="Основная навигация" data-label-ru="Основная навигация" data-label-en="Main navigation">
      <a href="${prefix}index.html#projects">${text('Проекты','Projects')}</a>
      <a href="${prefix}index.html#approach">${text('Подход','Approach')}</a>
      <a href="${prefix}index.html#contact">${text('Контакт','Contact')}</a>
    </nav>
    <div class="language-switch" role="group" aria-label="Язык" data-label-ru="Язык" data-label-en="Language">
      <button type="button" data-set-lang="ru" aria-pressed="true">RU</button><span aria-hidden="true">/</span><button type="button" data-set-lang="en" aria-pressed="false">EN</button>
    </div>
  </header>`;
}

function footer(prefix) {
  return `<footer class="site-footer shell"><span>© 2026 · ${text('Алексей Сафонов','Aleksey Safonov')}</span><span>${text('Концептуальное портфолио · AI-визуализации','Concept portfolio · AI visualizations')}</span><a href="${prefix}index.html#projects">${text('Все проекты','All projects')} ↑</a></footer>`;
}

function card(p, prefix = '') {
  return `<article class="project-card ${p.type === 'family' ? 'project-feature' : ''}" data-project-type="${p.type}" id="project-${p.id}">
    <a class="project-image" href="${prefix}cases/${p.id}.html"><img src="${prefix}assets/renders/${p.render}" width="1536" height="1024" alt="${esc(p.name.ru)} — интерьерная концепция" data-alt-ru="${esc(p.name.ru)} — интерьерная концепция" data-alt-en="${esc(p.name.en)} — interior concept" loading="lazy" decoding="async"><span class="image-index">${p.number}</span></a>
    <div class="project-copy"><div class="project-topline"><span>${dual(p.complex)}</span><span>${area(p.area)}</span></div><a class="project-title" href="${prefix}cases/${p.id}.html"><h3>${dual(p.name)}</h3>${arrow}</a><p>${dual(p.style)} <span aria-hidden="true">·</span> ${dual(type(p.type))}</p>${p.type === 'family' ? `<p class="feature-description">${dual(p.intro)}</p><a class="text-link" href="${prefix}cases/${p.id}.html">${text('Посмотреть проект','View project')} ${arrow}</a>` : ''}</div>
  </article>`;
}

function home() {
  const p = projects[0];
  return head('Алексей Сафонов — дизайн интерьеров компактных квартир', '13 интерьерных концепций для квартир от 25,3 до 44,4 м². Планировки, палитры, хранение, свет и AI-визуализации.', '', p.render, 'Aleksey Safonov — small apartment interiors') + header('') + `
  <main id="main">
    <section class="home-intro shell">
      <div><p class="eyebrow">${text('Дизайн интерьеров · Концепции 2026','Interior design · Concepts 2026')}</p><h1>${text('Маленькая квартира.','Small apartment.')}<br><em>${text('Большая жизнь.','A fuller life.')}</em></h1></div>
      <div class="intro-aside"><p>${text('13 идей для повседневной жизни: свет, хранение и материалы, которые делают небольшое пространство своим.','13 ideas for everyday living: light, storage and materials that make a small space feel like home.')}</p><div class="intro-facts"><span>${area(25.3)} — ${area(44.4)}</span><span>${text('Москва и область','Moscow region')}</span></div><a class="text-link" href="#projects">${text('Смотреть проекты','Explore projects')} ${arrow}</a></div>
    </section>
    <figure class="home-cover shell"><a href="cases/${p.id}.html"><img src="assets/renders/${p.render}" width="1536" height="1024" alt="Светлая кухня-гостиная с дубом и голубым текстилем" data-alt-ru="Светлая кухня-гостиная с дубом и голубым текстилем" data-alt-en="Light kitchen-living room with oak and blue textiles" fetchpriority="high"></a><figcaption><span>01 / ${dual(p.name)} <span class="caption-muted">· ${dual(p.complex)} · ${area(p.area)}</span></span><span class="caption-muted">${text('AI-визуализация концепции','AI concept visualization')}</span></figcaption></figure>
    <section class="projects-section shell" id="projects" aria-labelledby="projects-heading">
      <div class="section-head"><div><p class="eyebrow">${text('Избранная коллекция','Selected collection')}</p><h2 id="projects-heading">${text('Разные квартиры.','Different apartments.')}<br><em>${text('Своя история в каждой.','A story in each.')}</em></h2></div><p class="section-note">${text('От небольшой студии до квартиры для семьи.','From a small studio to a family home.')}</p></div>
      <div class="collection-tools"><div class="filters" role="group" aria-label="Тип квартиры" data-label-ru="Тип квартиры" data-label-en="Apartment type"><button type="button" data-filter="all" aria-pressed="true">${text('Все проекты','All projects')} <span>13</span></button><button type="button" data-filter="studio" aria-pressed="false">${text('Студии','Studios')} <span>3</span></button><button type="button" data-filter="one-bedroom" aria-pressed="false">${text('Со спальней','One bedroom')} <span>9</span></button><button type="button" data-filter="family" aria-pressed="false">${text('Семейные','Family')} <span>1</span></button></div><p class="project-count" aria-live="polite" aria-atomic="true">${text('Показано проектов:','Projects shown:')} <span id="shown-count">13</span></p></div>
      <div class="project-grid">${projects.map(p => card(p)).join('\n')}</div>
    </section>
    <section class="approach-section" id="approach"><div class="shell approach-layout"><div><p class="eyebrow">${text('Подход к пространству','A way of thinking about space')}</p><h2>${text('Начать с жизни,','Start with life,')}<br><em>${text('потом выбрать цвет.','then choose colour.')}</em></h2><p class="approach-intro">${text('В каждой концепции сначала появляется сценарий дня. Потом — место для вещей, свет для разных занятий и материалы, с которыми приятно жить.','Each concept starts with a daily routine. Then comes room for belongings, light for different activities and materials that feel good to live with.')}</p></div><ol class="approach-list"><li><span>01</span><div><h3>${text('Планировка и привычки','Layout & routines')}</h3><p>${text('Понять, где готовить, работать, отдыхать и хранить вещи. Сохранить логику исходной квартиры.','Understand where to cook, work, relax and store belongings. Respect the logic of the source layout.')}</p></div></li><li><span>02</span><div><h3>${text('Мебель и свободные проходы','Furniture & circulation')}</h3><p>${text('Использовать компактную мебель и закрытое хранение. Проверить размеры и открывание дверей на следующем этапе.','Use compact furniture and closed storage. Verify dimensions and door clearances at the next stage.')}</p></div></li><li><span>03</span><div><h3>${text('Свет и тактильность','Light & texture')}</h3><p>${text('Соединить общий, рабочий и вечерний свет. Подобрать спокойную палитру и выразительные фактуры.','Combine ambient, task and evening light. Choose a calm palette and expressive textures.')}</p></div></li></ol></div></section>
    <section class="author-section shell" id="contact"><p class="eyebrow">${text('Автор концепций','Concept author')}</p><div class="author-layout"><div><h2>${text('Алексей','Aleksey')}<br><em>${text('Сафонов','Safonov')}</em></h2><p>${text('Развиваю практику интерьерных концепций с помощью анализа планировок и современных AI-инструментов. Эта коллекция исследует небольшие квартиры, в которых важен каждый сценарий жизни.','I develop interior concepts through layout analysis and modern AI tools. This collection explores small apartments where every daily routine matters.')}</p></div><div class="contact-panel"><span>${text('Обсудить интерьерную идею','Discuss an interior idea')}</span><a href="mailto:safal0645@protonmail.com" class="contact-email">safal0645@protonmail.com ${arrow}</a><a class="text-link" href="https://github.com/safal207" target="_blank" rel="noopener noreferrer">GitHub / safal207 ${arrow}</a></div></div><p class="portfolio-note">${text('Все 13 проектов — самостоятельные концепции по предоставленным планировкам. Изображения созданы с помощью AI и передают атмосферу, материалы и идею расстановки. Точная геометрия, размеры мебели и реализация уточняются после обмеров. Исходные планы размещены в соответствующих кейсах.','All 13 projects are independent concepts based on the supplied plans. AI-generated images communicate atmosphere, materials and furniture ideas. Geometry, furniture dimensions and execution are refined after site measurements. Source plans are included in each case.')}</p></section>
  </main>` + footer('') + '</body></html>';
}

function casePage(p, index) {
  const prefix = '../';
  const next = projects[(index + 1) % projects.length];
  const [x,y,w,h] = p.source.crop;
  const sourceLabel = {ru:`Исходная планировка: ${p.complex.ru}, ${String(p.area).replace('.',',')} м²`,en:`Source layout: ${p.complex.en}, ${p.area} m²`};
  return head(`${p.name.ru} · ${String(p.area).replace('.',',')} м² — Алексей Сафонов`, p.intro.ru, prefix, p.render, `${p.name.en} · ${p.area} m² — Aleksey Safonov`, `cases/${p.id}.html`) + header(prefix) + `
  <main id="main" class="case-main">
    <section class="case-intro shell"><a class="back-link" href="../index.html#projects">← ${text('Все проекты','All projects')}</a><p class="eyebrow">${p.number} / ${dual(p.complex)} · ${area(p.area)} · ${text('Концепт','Concept')}</p><div class="case-title-row"><h1>${dual(p.name)}</h1><p>${dual(p.intro)}</p></div><div class="case-meta"><span>${dual(p.location)}</span><span>${dual(type(p.type))}</span><span>${dual(p.style)}</span></div></section>
    <figure class="case-cover shell"><button type="button" class="image-open" data-lightbox="../assets/renders/${p.render}" aria-label="Увеличить визуализацию" data-label-ru="Увеличить визуализацию" data-label-en="Enlarge visualization"><img src="../assets/renders/${p.render}" width="1536" height="1024" alt="${esc(p.name.ru)} — AI-визуализация интерьерной концепции" data-alt-ru="${esc(p.name.ru)} — AI-визуализация интерьерной концепции" data-alt-en="${esc(p.name.en)} — AI interior concept visualization" fetchpriority="high"><span class="enlarge-symbol" aria-hidden="true">↗</span></button><figcaption>${text('AI-визуализация · Атмосфера и материалы концепции','AI visualization · Concept atmosphere and materials')}</figcaption></figure>
    <section class="case-story shell"><div class="case-story-label"><p class="eyebrow">${text('Идея проекта','Project idea')}</p><h2>${text('Как здесь','How life')}<br><em>${text('будет жить человек.','fits here.')}</em></h2></div><div class="case-story-body"><p class="brief">${dual(p.brief)}</p><ol class="solution-list">${p.solutions.map((s,i) => `<li><span>0${i+1}</span><p>${dual(s)}</p></li>`).join('')}</ol><div class="lighting-note"><h3>${text('Свет в течение дня','Light throughout the day')}</h3><p>${dual(p.lighting)}</p></div></div></section>
    <section class="palette-section shell"><div class="section-head compact"><div><p class="eyebrow">${text('Цвет и материал','Colour & material')}</p><h2>${text('Палитра проекта','Project palette')}</h2></div><p class="section-note">${text('Ориентиры для отделки и текстиля','A direction for finishes and textiles')}</p></div><ul class="palette">${p.palette.map(c=>`<li><div class="swatch" style="background-color:${c.hex}" aria-hidden="true"></div><span>${text(c.ru,c.en)}</span><small>${c.hex}</small></li>`).join('')}</ul></section>
    <section class="source-section" id="source"><div class="shell source-layout"><div class="source-plan-wrap"><p class="eyebrow">${text('Исходная планировка','Source layout')}</p><svg class="source-plan" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${esc(sourceLabel.ru)}" data-label-ru="${esc(sourceLabel.ru)}" data-label-en="${esc(sourceLabel.en)}"><title>${esc(sourceLabel.ru)}</title><image href="../assets/source/${p.source.file}" width="674" height="1536" x="0" y="0"/></svg><a class="text-link source-original" href="../assets/source/${p.source.file}" target="_blank" rel="noopener noreferrer">${text('Открыть исходный скриншот','Open the original screenshot')} ${arrow}</a></div><div class="source-data"><h2>${text('От плана','From a plan')}<br><em>${text('к идее интерьера.','to an interior idea.')}</em></h2>${p.rooms.length ? `<table class="room-table"><caption>${text('Площади по подписям исходного плана','Areas transcribed from the source plan')}</caption><thead><tr><th scope="col">${text('Помещение','Room')}</th><th scope="col">${text('Площадь','Area')}</th></tr></thead><tbody>${p.rooms.map(r=>`<tr><th scope="row">${text(r.ru,r.en)}</th><td>${area(r.area)}</td></tr>`).join('')}</tbody></table>` : `<p class="unverified-rooms">${text('Общая площадь в объявлении: 30,1 м². Для работы с площадями отдельных комнат нужен более чёткий исходный план.','Listing area: 30.1 m². A clearer source plan is needed to work with individual room areas.')}</p>`}<div class="source-note"><h3>${text('Особенности источника','Source details')}</h3><p>${dual(p.source.notes)}</p></div><p class="small-note">${text('План предоставлен для этой концепции. Визуализация передаёт дизайн-идею; точное положение проёмов, мебели и оборудования уточняется по обмерному плану.','The plan was supplied for this concept. The visualization communicates a design idea; exact openings, furniture and equipment positions are refined using a measured plan.')}</p></div></div></section>
    <section class="next-project shell"><div><p class="eyebrow">${text('Следующая история','Next story')}</p><a class="next-title" href="${next.id}.html">${dual(next.name)} ${arrow}</a><p>${dual(next.complex)} · ${area(next.area)}</p></div><a href="${next.id}.html" aria-label="${esc(next.name.ru)}" data-label-ru="${esc(next.name.ru)}" data-label-en="${esc(next.name.en)}"><img src="../assets/renders/${next.render}" width="1536" height="1024" alt="" loading="lazy"></a></section>
  </main>
  <dialog class="lightbox" aria-label="Визуализация" data-label-ru="Визуализация" data-label-en="Visualization"><button type="button" class="lightbox-close" data-close-lightbox autofocus aria-label="Закрыть" data-label-ru="Закрыть" data-label-en="Close">×</button><img width="1536" height="1024" alt=""></dialog>` + footer(prefix) + '</body></html>';
}

fs.mkdirSync(path.join(root, 'cases'), {recursive:true});
fs.writeFileSync(path.join(root, 'index.html'), home());
for (const [i,p] of projects.entries()) fs.writeFileSync(path.join(root, 'cases', `${p.id}.html`), casePage(p,i));
const casebook=projects.map(p=>`<a name="${p.id}"></a>\n\n## ${p.number}. ${p.name.ru} / ${p.name.en}\n\n**${p.complex.ru} · ${String(p.area).replace('.',',')} м²**\n\n![${p.name.ru} — AI concept visualization](../assets/renders/${p.render})\n\n${p.intro.ru}\n\n${p.intro.en}\n\n**Сценарий / Brief:** ${p.brief.ru} / ${p.brief.en}\n\n${p.solutions.map(s=>`- ${s.ru}\n  ${s.en}`).join('\n')}\n\n**Свет / Lighting:** ${p.lighting.ru} / ${p.lighting.en}\n\n| Цвет / Material direction | HEX |\n| --- | --- |\n${p.palette.map(c=>`| ${c.ru} / ${c.en} | ${c.hex} |`).join('\n')}\n\n[Исходная планировка / Source screenshot](../assets/source/${p.source.file})\n\n> ${p.source.notes.ru}\n>\n> ${p.source.notes.en}\n`).join('\n---\n\n');
fs.writeFileSync(path.join(root,'docs/CASEBOOK.md'),'# Safonov Interiors — 13 concepts\n\nКонцептуальное портфолио Алексея Сафонова. Все визуализации созданы с помощью AI и показывают атмосферу, материалы и идеи расстановки.\n\nAleksey Safonov’s concept portfolio. All images are AI-generated and communicate atmosphere, materials and furniture ideas.\n\n'+casebook);
console.log(`Built homepage + ${projects.length} bilingual case pages.`);
