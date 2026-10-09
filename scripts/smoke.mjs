import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright') : 'playwright');
let server;
let origin=process.env.PORTFOLIO_TEST_URL;
if(!origin) {
  server=http.createServer((req,res)=>{
    const filename=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);res.end('Not found');return;}
    const extension=path.extname(filename);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[extension])||'application/octet-stream');
    fs.createReadStream(filename).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
}
const projects=JSON.parse(fs.readFileSync(path.join(root,'data/projects.json'),'utf8'));
const premiumProjects=projects.filter(p=>p.collection==='moscow-premium');
const filters=[...['studio','one-bedroom','family'].map(type=>[type,projects.filter(p=>p.type===type).length]),['moscow-premium',premiumProjects.length],['all',projects.length]];
const out=path.join(root,'output/qa');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PORTFOLIO_CHROMIUM_EXECUTABLE?{executablePath:process.env.PORTFOLIO_CHROMIUM_EXECUTABLE}:{})});
const errors=[];const failures=[];const checks=[];
const context=await browser.newContext();
const page=await context.newPage();
page.on('pageerror', e=>errors.push(e.message));
page.on('response', response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
const noOverflow=async label=>{
  const dimensions=await page.evaluate(()=>({view:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  assert(dimensions.content<=dimensions.view,`${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
};
try {
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:960});
    await page.goto(origin+'/index.html',{waitUntil:'networkidle'});
    await noOverflow(`Homepage ${width}`);
    assert.equal(await page.locator('.project-card:visible').count(),projects.length);
    assert.equal(await page.locator('#shown-count').textContent(),String(projects.length));
    const visibleIDs=await page.locator('.project-card:visible').evaluateAll(cards=>cards.map(c=>c.id.replace(/^project-/,'')));
    assert.deepEqual(visibleIDs.slice(0,premiumProjects.length).toSorted(),premiumProjects.map(p=>p.id).toSorted(),'Premium concepts must lead the collection.');
    if(width===390||width===1440)await page.screenshot({path:path.join(out,`home-${width}.png`),fullPage:false});
    checks.push(`Homepage ${width}px`);
  }
  await page.locator('#moscow-premium').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'moscow-premium-1440.png'),fullPage:false});
  for(const [filter,count] of filters) {
    await page.locator(`[data-filter="${filter}"]`).click();
    assert.equal(await page.locator('.project-card:visible').count(),count);
    assert.equal(await page.locator('#shown-count').textContent(),String(count));
    assert.equal(await page.locator(`[data-filter="${filter}"]`).getAttribute('aria-pressed'),'true');
    const visibleIDs=await page.locator('.project-card:visible').evaluateAll(cards=>cards.map(c=>c.id.replace(/^project-/,'')));
    const expected=projects.filter(p=>filter==='all'||(filter==='moscow-premium'?p.collection==='moscow-premium':p.type===filter)).map(p=>p.id);
    assert.deepEqual(visibleIDs.toSorted(),expected.toSorted(),`Filter ${filter}: incorrect projects.`);
    await noOverflow(`Filtered collection ${filter}`);
    checks.push(`Filter ${filter}: ${count}`);
  }
  await page.locator('[data-set-lang="en"]').click();
  await page.waitForURL('**/en/index.html');
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert((await page.locator('h1').innerText()).includes('Thoughtful space.'));
  const firstCaseHref=await page.locator('.project-title').first().getAttribute('href');
  const firstCaseID=firstCaseHref.match(/cases\/([^/]+)\.html$/)?.[1];
  const firstCase=projects.find(p=>p.id===firstCaseID);
  assert(firstCase,'First project must reference a known concept.');
  assert.equal(firstCase.collection,'moscow-premium','First navigation must feature a premium concept.');
  await page.locator('.project-title').first().click();
  await page.waitForURL(`**/en/cases/${firstCaseID}.html`);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert((await page.locator('h1').innerText()).includes(firstCase.name.en));
  await page.locator('[data-lightbox]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);
  assert.equal(await page.evaluate(()=>document.activeElement.matches('[data-lightbox]')),true);
  checks.push('English language survives navigation; lightbox keyboard open/Escape/focus restoration');
  for (const width of [320,1440]) {
    await page.setViewportSize({width,height:960});
    for(const lang of width===320?['ru','en']:['ru']) for(const p of projects) {
      await page.goto(`${origin}/${lang==='en'?'en/':''}cases/${p.id}.html`,{waitUntil:'networkidle'});
      await page.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.filter(i=>!i.closest('dialog')&&i.getAttribute('src')).map(i=>{i.loading='eager';return i.decode();}));});
      await noOverflow(`${p.id} ${lang} ${width}`);
      const missing=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.src&&!i.closest('dialog')&&(!i.complete||i.naturalWidth===0)).map(i=>i.src));
      assert.deepEqual(missing,[],`${p.id}: missing image`);
      assert.equal(await page.locator('.source-plan image').getAttribute('href'),(lang==='en'?'../../':'../')+'assets/source/'+p.source.file);
      const sourceSize=p.source.size || [674,1536];
      const viewBox=await page.locator('.source-plan').evaluate(svg=>[svg.viewBox.baseVal.x,svg.viewBox.baseVal.y,svg.viewBox.baseVal.width,svg.viewBox.baseVal.height]);
      for(const [i,value] of p.source.crop.entries()) assert(Math.abs(viewBox[i]-value)<0.0001,`${p.id}: incorrect source crop.`);
      assert.equal(Number(await page.locator('.source-plan image').getAttribute('width')),sourceSize[0]);
      assert.equal(Number(await page.locator('.source-plan image').getAttribute('height')),sourceSize[1]);
      await page.locator('.source-plan image').evaluate(async image=>{const original=new Image();original.src=image.href.baseVal;await original.decode();});
      if(p.collection==='moscow-premium') {
        const clippedMaterials=await page.locator('.material-grid h3').evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent));
        assert.deepEqual(clippedMaterials,[],`${p.id} ${lang} ${width}: clipped material text.`);
        assert.equal(await page.locator(`a[href="${p.source.url}"]`).count(),1,`${p.id}: listing link missing.`);
        assert.equal(await page.locator(`a[href="${p.source.planUrl}"]`).count(),1,`${p.id}: original developer plan link missing.`);
      }
      if(width===320&&lang==='ru'&&p.id==='white-grad-37-2')await page.screenshot({path:path.join(out,'case-320.png'),fullPage:true});
      if(lang==='ru'&&p.id===firstCaseID)await page.screenshot({path:path.join(out,`premium-case-${width}.png`),fullPage:true});
    }
    checks.push(`All ${projects.length} cases at ${width}px ${width===320?'RU + EN':'RU'}; source images, dimensions and crops`);
  }
  await page.setViewportSize({width:390,height:960});
  await page.goto(origin+'/cases/granel-30-1.html',{waitUntil:'networkidle'});
  await page.locator('#source').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'granel-source-390.png')});
  await page.goto(origin+'/index.html?lang=en',{waitUntil:'networkidle'});
  await page.waitForURL('**/en/index.html');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert((await page.title()).includes('Aleksey Safonov'));
  checks.push('Legacy ?lang=en redirects to the static EN route and matching metadata');
  await page.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();}));});
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  assert.deepEqual(broken,[]);
  const noScript=await browser.newContext({javaScriptEnabled:false});
  const staticPage=await noScript.newPage();
  await staticPage.goto(origin+'/en/index.html',{waitUntil:'networkidle'});
  assert.equal(await staticPage.locator('html').getAttribute('lang'),'en');
  assert((await staticPage.locator('h1').innerText()).includes('Thoughtful space.'));
  assert((await staticPage.title()).includes('Aleksey Safonov'));
  await staticPage.locator('[data-set-lang="ru"]').click();
  await staticPage.waitForURL('**/index.html');
  assert.equal(await staticPage.locator('html').getAttribute('lang'),'ru');
  await noScript.close();
  checks.push('Static EN content and RU/EN navigation work without JavaScript');
  assert.deepEqual(errors,[],'Browser JavaScript errors');
  assert.deepEqual(failures,[],'HTTP failures');
  const report={status:'PASS',checkedAt:new Date().toISOString(),checks,errors,httpFailures:failures};
  fs.writeFileSync(path.join(out,'smoke-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); if(server)await new Promise(resolve=>server.close(resolve)); }
