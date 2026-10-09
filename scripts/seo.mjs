import fs from 'node:fs';
import path from 'node:path';

export const siteURL = (process.env.PORTFOLIO_SITE_URL || 'https://safal207.github.io/safonov-interior-portfolio').replace(/\/$/, '');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
export const languageFile = (file, lang) => (lang === 'en' ? 'en/' : '') + file;
export const pageURL = (file, lang = 'ru') => siteURL + '/' + languageFile(file, lang).replace(/index\.html$/, '');
export const languageLink = (file, fromLang, toLang) => path.posix.relative(path.posix.dirname(languageFile(file, fromLang)), languageFile(file, toLang));

export function pageHead({title, languageTitle, description, englishDescription, prefix, image, pagePath, language, project, projects}) {
  const en = language === 'en';
  const canonical = pageURL(pagePath, language);
  const currentTitle = en ? languageTitle : title;
  const currentDescription = en ? englishDescription : description;
  const assets = (en ? '../' : '') + prefix + 'assets/';
  const isHome = pagePath === 'index.html';
  const imagePath = 'assets/renders/' + image;
  const imageURL = siteURL + '/' + imagePath;
  const homeProject = projects.find(p => p.render === image) || projects[0];
  const imageAlt = isHome
    ? `Safonov Interiors — ${homeProject.name[language]} / ${en ? 'Moscow Premium AI concept' : 'Москва Premium, AI-концепция'}`
    : `${project.name[language]} — ${en ? 'AI interior concept visualization' : 'AI-визуализация интерьерной концепции'}`;
  const author = {'@type':'Person','@id':siteURL+'/#author',name:'Алексей Сафонов',alternateName:'Aleksey Safonov',sameAs:['https://github.com/safal207']};
  const website = {'@type':'WebSite','@id':siteURL+'/#website',url:siteURL+'/',name:'SAFONOV. INTERIORS',inLanguage:['ru','en'],author:{'@id':author['@id']}};
  const page = {'@type':isHome ? 'CollectionPage' : 'WebPage','@id':canonical+'#page',url:canonical,name:currentTitle,description:currentDescription,inLanguage:language,isPartOf:{'@id':website['@id']}};
  const graph = [author,website,page];
  if (isHome) {
    const displayedProjects = [...projects.filter(p=>p.collection==='moscow-premium'),...projects.filter(p=>p.collection!=='moscow-premium')];
    page.mainEntity = {'@type':'ItemList',numberOfItems:projects.length,itemListElement:displayedProjects.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name[language],url:pageURL(`cases/${p.id}.html`,language)}))};
  } else {
    const concept = {'@type':'CreativeWork','@id':canonical+'#concept',name:project.name[language],description:project.intro[language],genre:en ? 'Interior design concept' : 'Концепция дизайна интерьера',inLanguage:language,creator:{'@id':author['@id']},image:{'@type':'ImageObject',url:imageURL,width:1536,height:1024,caption:imageAlt}};
    page.mainEntity = {'@id':concept['@id']};
    graph.push(concept,{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:en ? 'Portfolio' : 'Портфолио',item:pageURL('index.html',language)},{'@type':'ListItem',position:2,name:project.name[language],item:canonical}]});
  }
  return `<!doctype html>
<html lang="${language}" data-lang-ru-url="${languageLink(pagePath,language,'ru')}" data-lang-en-url="${languageLink(pagePath,language,'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(currentTitle)}</title>
  <meta name="description" content="${esc(currentDescription)}">
  <meta name="author" content="Алексей Сафонов">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#302c27">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="alternate" hreflang="ru" href="${esc(pageURL(pagePath,'ru'))}">
  <link rel="alternate" hreflang="en" href="${esc(pageURL(pagePath,'en'))}">
  <link rel="alternate" hreflang="x-default" href="${esc(pageURL(pagePath,'ru'))}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SAFONOV. INTERIORS">
  <meta property="og:locale" content="${en ? 'en_GB' : 'ru_RU'}">
  <meta property="og:locale:alternate" content="${en ? 'ru_RU' : 'en_GB'}">
  <meta property="og:title" content="${esc(currentTitle)}">
  <meta property="og:description" content="${esc(currentDescription)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(imageURL)}">
  <meta property="og:image:secure_url" content="${esc(imageURL)}">
  <meta property="og:image:type" content="image/webp">
  <meta property="og:image:width" content="1536">
  <meta property="og:image:height" content="1024">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(currentTitle)}">
  <meta name="twitter:description" content="${esc(currentDescription)}">
  <meta name="twitter:image" content="${esc(imageURL)}">
  <meta name="twitter:image:alt" content="${esc(imageAlt)}">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="${assets}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${assets}style.css">
  <script type="application/ld+json">${json({'@context':'https://schema.org','@graph':graph})}</script>
  <script src="${assets}language-init.js"></script>
  <script src="${assets}app.js" defer></script>
</head>
<body data-title-ru="${esc(title)}" data-title-en="${esc(languageTitle)}" data-language-routes="true">
<a class="skip-link" href="#main"><span data-lang="ru" lang="ru">К содержанию</span><span data-lang="en" lang="en">Skip to content</span></a>`;
}

export function localizeAssets(html, lang) {
  if (lang !== 'en') return html;
  const boundary = html.indexOf('<body');
  let body = html.slice(boundary).replace(/\b(src|href|data-lightbox)="((?:\.\.\/)?assets\/[^"<>]+)"/g, (_,attribute,url)=>`${attribute}="../${url}"`);
  body = body.replace(/<[a-z][^>]*>/g, tag => {
    const alt = tag.match(/data-alt-en="([^"]*)"/);
    const label = tag.match(/data-label-en="([^"]*)"/);
    if (alt) tag = tag.replace(/\balt="[^"]*"/,`alt="${alt[1]}"`);
    if (label) tag = tag.replace(/\baria-label="[^"]*"/,`aria-label="${label[1]}"`);
    return tag;
  });
  return html.slice(0,boundary) + body;
}

export function writeSitemap(root, projects) {
  const files = ['index.html',...projects.map(p=>`cases/${p.id}.html`)];
  const entries = ['ru','en'].flatMap(lang=>files.map(file=>{
    const p = projects.find(p=>file===`cases/${p.id}.html`);
    const image = siteURL+'/assets/renders/'+(p || projects[0]).render;
    return `  <url><loc>${esc(pageURL(file,lang))}</loc><xhtml:link rel="alternate" hreflang="ru" href="${esc(pageURL(file,'ru'))}"/><xhtml:link rel="alternate" hreflang="en" href="${esc(pageURL(file,'en'))}"/><xhtml:link rel="alternate" hreflang="x-default" href="${esc(pageURL(file,'ru'))}"/><image:image><image:loc>${esc(image)}</image:loc></image:image></url>`;
  }));
  fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`);
}
