import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { pageURL, siteURL } from './seo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(fs.readFileSync(path.join(root,'data/projects.json'),'utf8'));
const premiumProjects = projects.filter(p=>p.collection==='moscow-premium');
assert.equal(projects.length,18,'The collection must preserve 13 concepts and add five Moscow layouts.');
assert.equal(new Set(projects.map(p=>p.id)).size,projects.length,'Project ids must be unique.');
assert.equal(premiumProjects.length,5,'The Moscow premium collection must contain five concepts.');
assert.equal(projects.filter(p=>p.type==='studio').length,3,'The three existing studio concepts must be preserved.');
assert(projects.every(p=>['studio','one-bedroom','family'].includes(p.type)),'Unknown apartment type.');
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
  if(sourceFile==='index.html') {
    assert.equal(page.mainEntity.numberOfItems,projects.length);
    assert.equal(page.mainEntity.itemListElement.length,projects.length);
    const cardIDs=[...html.matchAll(/<article\b[^>]*class="project-card\b[^>]*id="project-([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(cardIDs.toSorted(),projects.map(p=>p.id).toSorted(),`${filename}: each project appears once.`);
    assert(html.includes('id="moscow-premium"'),`${filename}: Moscow collection anchor missing.`);
    assert(html.includes('data-filter="moscow-premium"'),`${filename}: Moscow collection filter missing.`);
  }
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
  const [sourceWidth,sourceHeight]=p.source.size || [674,1536];
  assert(Number.isFinite(sourceWidth) && Number.isFinite(sourceHeight) && sourceWidth>0 && sourceHeight>0,`${p.id}: invalid source dimensions.`);
  assert([x,y,w,h].every(Number.isFinite) && x>=0 && y>=0 && w>0 && h>0 && x+w<=sourceWidth+1e-6 && y+h<=sourceHeight+1e-6,`${p.id}: source view outside original plan.`);
  if(p.collection==='moscow-premium') {
    assert.deepEqual(p.source.crop,[0,0,sourceWidth,sourceHeight],`${p.id}: premium source must show the complete original plan.`);
    for(const key of ['url','planUrl']) {
      const sourceURL=new URL(p.source[key]);
      assert.equal(sourceURL.protocol,'https:',`${p.id}: ${key} must use HTTPS.`);
      assert(!sourceURL.username && !sourceURL.password,`${p.id}: source URL must not contain credentials.`);
    }
    assert.equal(p.source.checked,'2026-10-10',`${p.id}: source verification date missing.`);
    assert(p.source.credit?.ru && p.source.credit?.en,`${p.id}: source credit missing.`);
    assert(p.renderRoom?.ru && p.renderRoom?.en,`${p.id}: rendered room label missing.`);
    assert(Array.isArray(p.materials) && p.materials.length>=3 && p.materials.every(m=>
      (m.ru && m.en) || (m.name?.ru && m.name?.en && m.description?.ru && m.description?.en)
    ),`${p.id}: bilingual materials missing.`);
    for(const lang of ['ru','en']) {
      const html=fs.readFileSync(path.join(root,lang==='en'?'en':'','cases',p.id+'.html'),'utf8');
      const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
      assert(links.includes(p.source.url),`${p.id} ${lang}: listing link missing.`);
      assert(links.includes(p.source.planUrl),`${p.id} ${lang}: original developer plan link missing.`);
      assert(html.includes(p.source.checked),`${p.id} ${lang}: verification date missing.`);
    }
  }
  assert(fs.existsSync(path.join(root,'assets/source',p.source.file)));
  assert(fs.existsSync(path.join(root,'assets/renders',p.render)));
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const sitemapURLs=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(sitemapURLs.length,pageFiles.length);assert.equal(new Set(sitemapURLs).size,pageFiles.length);
for(const lang of ['ru','en']) for(const file of ruFiles) assert(sitemapURLs.includes(pageURL(file,lang)));
console.log(`PASS: ${pageFiles.length} pages; ${projects.length} concepts (${premiumProjects.length} Moscow premium); bilingual content; ${rootLinks.size} linked files; source crops and render assets.`);
