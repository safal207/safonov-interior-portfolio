import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(fs.readFileSync(path.join(root,'data/projects.json'),'utf8'));
assert.equal(projects.length,13,'The collection must contain 13 unique layouts.');
assert.equal(new Set(projects.map(p=>p.id)).size,13,'Project ids must be unique.');
assert.equal(projects.filter(p=>p.type==='studio').length,3);
assert.equal(projects.filter(p=>p.type==='family').length,1);
const pageFiles = ['index.html', ...projects.map(p=>`cases/${p.id}.html`)];
const rootLinks = new Set();
for (const filename of pageFiles) {
  const file = path.join(root,filename);
  const html = fs.readFileSync(file,'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${filename}: exactly one h1.`);
  assert(html.includes('data-lang="en"'),`${filename}: English content missing.`);
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
console.log(`PASS: ${pageFiles.length} pages; 13 concepts; bilingual content; ${rootLinks.size} linked files; source crops and render assets.`);
