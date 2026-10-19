import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1],m[2]]));
const openingTags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(m => attributes(m[0]));
const hasClass = (tag, name) => (tag.class || '').split(/\s+/).includes(name);
const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const casePath = (root, id, lang) => path.join(root, lang === 'en' ? 'en' : '', 'cases', id + '.html');

function checkMaterials(html, project, lang, assetRoot) {
  const label = `${project.id} ${lang}`;
  const grid = html.match(/<ul\b[^>]*class="[^"]*\bmaterial-grid\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
  assert(grid, `${label}: material cards missing.`);
  const cards = [...grid.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)];
  assert.equal(cards.length, project.materials.length, `${label}: material card count.`);
  for (const [index, material] of project.materials.entries()) {
    const card = cards[index];
    const props = attributes(card[1]);
    const body = card[2];
    const paletteColour = project.palette.find(c => c.id === material.paletteId);
    const colour = material.accentColor || paletteColour?.hex;
    assert(colour, `${label}: material ${material.ru} has no colour reference.`);
    if (material.paletteId) assert.equal(props['data-palette-id'], material.paletteId, `${label}: wrong material palette reference.`);
    if (material.accentColor) assert.equal(props['data-accent-color'], material.accentColor, `${label}: wrong separate material accent.`);
    const tone = openingTags(body, 'span').find(tag => hasClass(tag, 'material-tone'));
    assert(tone, `${label}: material colour strip missing.`);
    assert.equal(tone['data-material-color']?.toLowerCase(), colour.toLowerCase(), `${label}: ${material.ru} must retain its colour when cards or palette are reordered.`);
    for (const language of ['ru','en']) {
      assert(body.includes(esc(material[language])), `${label}: full ${language} material name missing.`);
      assert(body.includes(esc(material.application[language])), `${label}: ${language} material application missing.`);
    }
    if (material.preview) {
      assert(fs.existsSync(path.join(assetRoot, material.preview.file)), `${label}: missing material preview ${material.preview.file}.`);
      const source = (lang === 'en' ? '../../' : '../') + material.preview.file;
      const preview = openingTags(body, 'img').find(img => img.src === source);
      assert(preview, `${label}: material preview uses the wrong relative path.`);
      assert.equal(preview.alt, esc(material.preview.alt[lang]), `${label}: material preview alt is in the wrong language.`);
    }
  }
}

function checkShopping(html, sample, lang, assetRoot) {
  const label = `Olive atelier ${lang}`;
  const section = html.match(/<section\b[^>]*id="shopping-sample"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert(section, `${label}: shopping section missing.`);
  const cards = [...section.matchAll(/<li\b([^>]*\bid="product-(\d+)"[^>]*)>([\s\S]*?)<\/li>/g)];
  assert.equal(cards.length, sample.items.length, `${label}: every selected product needs its own HTML card.`);
  assert.deepEqual(cards.map(card => card[2]), sample.items.map((_,i) => String(i + 1).padStart(2,'0')), `${label}: duplicate or missing product anchors.`);
  for (const [index,item] of sample.items.entries()) {
    const [ , tag, id, body ] = cards[index];
    assert.equal(attributes(tag)['data-product-id'],id,`${label}: product card identity mismatch.`);
    assert(body.includes(esc(item.name)) && body.includes(esc(item.nameEn)), `${label}: ${id} product titles must be complete in both languages.`);
    assert(body.includes(esc(item.dimensions)) && body.includes(esc(item.dimensionsEn)), `${label}: ${id} product dimensions missing.`);
    assert(openingTags(body,'a').some(link => link.href === esc(item.url)), `${label}: ${id} product source link missing.`);
    const source = (lang === 'en' ? '../../' : '../') + item.imageFile;
    const button = openingTags(body,'button').find(tag => hasClass(tag,'image-open') && hasClass(tag,'product-image'));
    assert(button, `${label}: ${id} product image must have a native button.`);
    assert.equal(button.type,'button',`${label}: ${id} image button type.`);
    assert.equal(button['data-lightbox'],source,`${label}: ${id} lightbox must open the selected product photograph.`);
    const image = openingTags(body,'img').find(image => image.src === source);
    assert(image, `${label}: ${id} product photo missing.`);
    assert(image.alt?.includes(esc(lang === 'en' ? item.nameEn : item.name)), `${label}: ${id} product photo alt must identify the product in ${lang}.`);
    assert(fs.existsSync(path.join(assetRoot,item.imageFile)),`${label}: ${id} product asset missing.`);
    assert(openingTags(body,'time').some(time => time.datetime === item.checkedAt),`${label}: ${id} must show its individual verification date.`);
  }
  const total = sample.items.reduce((sum,item) => sum + item.priceRub * item.quantity,0);
  const totalTag = openingTags(section,'div').find(tag => hasClass(tag,'sample-total'));
  assert.equal(Number(totalTag?.['data-total-rub']),total,`${label}: the displayed total must be calculated from the selected items.`);
  assert(section.includes(money(total)),`${label}: readable shopping total missing.`);
  assert(section.includes(money(sample.budgetRub - total)),`${label}: budget remainder must be calculated from selected items.`);
}

function checkGenerated(root, projects, sample, assetRoot = root) {
  for (const lang of ['ru','en']) {
    for (const project of projects.filter(project => project.materials?.length)) {
      const html = fs.readFileSync(casePath(root,project.id,lang),'utf8');
      checkMaterials(html,project,lang,assetRoot);
    }
    const olive = projects.find(project => project.id === 'level-michurinsky-42-1');
    const html = fs.readFileSync(casePath(root,olive.id,lang),'utf8');
    const prefix = lang === 'en' ? '../../' : '../';
    assert(openingTags(html,'button').some(button => hasClass(button,'image-open') && button['data-lightbox'] === prefix + 'assets/renders/' + olive.render), `Olive atelier ${lang}: hero must use the current project render.`);
    checkShopping(html,sample,lang,assetRoot);
  }
}

export function verifyDesign(root,projects) {
  const sample = JSON.parse(fs.readFileSync(path.join(root,'data/olive-atelier-sample.json'),'utf8'));
  assert.equal(sample.items.length,8,'The sample must preserve all eight selected products.');
  for (const project of projects.filter(project => project.materials?.length)) {
    const paletteIds = project.palette.map(colour => colour.id);
    assert(paletteIds.every(Boolean),`${project.id}: palette entries need explicit identifiers.`);
    assert.equal(new Set(paletteIds).size,paletteIds.length,`${project.id}: palette identifiers must be unique.`);
    for (const material of project.materials) {
      assert(Boolean(material.paletteId) !== Boolean(material.accentColor),`${project.id}: each material needs exactly one palette reference or separate accent.`);
      if (material.paletteId) assert(paletteIds.includes(material.paletteId),`${project.id}: unresolved material colour ${material.paletteId}.`);
      if (material.accentColor) assert(/^#[\da-f]{6}$/i.test(material.accentColor),`${project.id}: invalid separate material accent.`);
      assert(material.application?.ru && material.application?.en,`${project.id}: bilingual material application missing.`);
      if (material.preview) assert(material.preview.alt?.ru && material.preview.alt?.en && material.preview.sourceUrl && material.preview.credit,`${project.id}: material preview identity or credit missing.`);
    }
  }
  for (const item of sample.items) {
    assert(Number.isFinite(item.priceRub) && item.priceRub >= 0 && Number.isInteger(item.quantity) && item.quantity > 0,`${item.name}: invalid price or quantity.`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt || '') && Number.isFinite(Date.parse(item.checkedAt)),`${item.name}: individual verification date missing.`);
  }
  checkGenerated(root,projects,sample);

  // Exercise the real generator against reordered data and changed prices in an
  // isolated fixture. This catches the original index-based colour bug and stale
  // totals/dates without writing into the working project's source data.
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-design-'));
  try {
    fs.cpSync(path.join(root,'scripts'),path.join(fixture,'scripts'),{recursive:true});
    fs.cpSync(path.join(root,'data'),path.join(fixture,'data'),{recursive:true});
    fs.mkdirSync(path.join(fixture,'docs'));
    fs.symlinkSync(path.join(root,'assets'),path.join(fixture,'assets'),'dir');
    const reordered = structuredClone(projects);
    for (const project of reordered.filter(project => project.materials?.length)) {
      project.palette = [...project.palette.slice(1),project.palette[0]];
      project.materials.reverse();
    }
    const changed = structuredClone(sample);
    const changedItem = changed.items.toSorted((a,b) => a.priceRub - b.priceRub)[0];
    changedItem.priceRub += 137;
    changedItem.quantity += 1;
    changed.items[0].checkedAt = '2026-10-11';
    changed.checkedAt = '1999-01-01';
    changed.totalRub = -1;
    changed.remainingRub = -1;
    fs.writeFileSync(path.join(fixture,'data/projects.json'),JSON.stringify(reordered));
    fs.writeFileSync(path.join(fixture,'data/olive-atelier-sample.json'),JSON.stringify(changed));
    execFileSync(process.execPath,[path.join(fixture,'scripts/build.mjs')],{cwd:fixture,stdio:['ignore','pipe','pipe']});
    checkGenerated(fixture,reordered,changed,root);
  } finally {
    fs.rmSync(fixture,{recursive:true,force:true});
  }
  console.log('PASS: material colour references and preview assets; eight bilingual product cards with original photographs; reordered palette/cards and changed-price/date generator regression.');
}
