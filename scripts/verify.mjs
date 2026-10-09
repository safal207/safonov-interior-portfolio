import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { pageURL, siteURL } from './seo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(fs.readFileSync(path.join(root,'data/projects.json'),'utf8'));
assert.equal(projects.length,13,'The collection must contain 13 unique layouts.');
assert.equal(new Set(projects.map(p=>p.id)).size,13,'Project ids must be unique.');
assert.equal(projects.filter(p=>p.type==='studio').length,3);
assert.equal(projects.filter(p=>p.type==='family').length,1);
const ruFiles = ['index.html', ...projects.map(p=>`cases/${p.id}.html`)];
const pageFiles = [...ruFiles,...ruFiles.map(file=>'en/'+file)];
const titles = new Set();
const rootLinks = new Set();
for (const filename of pageFiles) {
  const file = path.join(root,filename);
  const html = fs.readFileSync(file,'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${filename}: exactly one h1.`);
  assert(html.includes('data-lang="en"'),`${filename}: English content missing.`);
  const lang=filename.startsWith('en/')?'en':'ru';
  const sourceFile=filename.replace(/^en\//,'');
  const canonical=pageURL(sourceFile,lang);
  assert(html.includes(`<html lang="${lang}"`),`${filename}: incorrect static language.`);
  assert(html.includes(`<link rel="canonical" href="${canonical}">`),`${filename}: incorrect canonical.`);
  assert(html.includes(`<meta property="og:url" content="${canonical}">`));
  for(const alternate of ['ru','en']) assert(html.includes(`hreflang="${alternate}" href="${pageURL(sourceFile,alternate)}"`));
  const title=html.match(/<title>(.*?)<\/title>/s)[1];
  assert(!titles.has(title),`${filename}: duplicate title.`);titles.add(title);
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const page=schema['@graph'].find(n=>['CollectionPage','WebPage'].includes(n['@type']));
  assert.equal(page.url,canonical);assert.equal(page.inLanguage,lang);
  if(sourceFile==='index.html') assert.equal(page.mainEntity.numberOfItems,13);
  const social=html.match(/<meta property="og:image" content="([^"]+)"/)[1];
  assert(social.startsWith(siteURL+'/assets/'));
  assert(fs.existsSync(path.join(root,social.slice(siteURL.length+1))));
  assert(html.includes('<meta name="twitter:image"'));

  for (const match of html.matchAll(/(?:href|src|data-lightbox)="([^"<>]+)"/g)) {
    const href=match[1];
    if(/^(https?:|mailto:|#|data:)/.test(href)) continue;
    const target=decodeURIComponent(href.split(/[?#]/)[0]);
    if(!target)continue;
    const absolute=path.resolve(path.dirname(file),target);
    assert(absolute.startsWith(root+path.sep),`${filename}: escaping repository link.`);
    assert(fs.existsSync(absolute),`${filename}: missing ${target}`);
    rootLinks.add(absolute);
  }
}
for (const p of projects) {
  assert(p.name.ru && p.name.en && p.intro.ru && p.intro.en,`${p.id}: missing translations.`);
  assert.equal(p.solutions.length,3);
  assert.equal(p.palette.length,4);
  assert(p.palette.every(c=>/^#[\da-fA-F]{6}$/.test(c.hex)),`${p.id}: invalid colour.`);
  const [x,y,w,h]=p.source.crop;
  assert(x>=0 && y>=0 && w>0 && h>0 && x+w<=674 && y+h<=1536,`${p.id}: source view outside screenshot.`);
  assert(fs.existsSync(path.join(root,'assets/source',p.source.file)));
  assert(fs.existsSync(path.join(root,'assets/renders',p.render)));
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const sitemapURLs=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(sitemapURLs.length,28);assert.equal(new Set(sitemapURLs).size,28);
for(const lang of ['ru','en']) for(const file of ruFiles) assert(sitemapURLs.includes(pageURL(file,lang)));
console.log(`PASS: ${pageFiles.length} pages; 13 concepts; bilingual content; ${rootLinks.size} linked files; source crops and render assets.`);
