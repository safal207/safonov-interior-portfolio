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
const decodedImages=async()=>page.locator('img').evaluateAll(async images=>{
  await Promise.all(images.filter(image=>!image.closest('dialog')&&image.getAttribute('src')).map(image=>{image.loading='eager';return image.decode();}));
});
const checkImageDialog=async(selector,label)=>{
  const trigger=page.locator(selector).first();
  const source=await trigger.getAttribute('data-lightbox');
  const alt=await trigger.locator('img').getAttribute('alt');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog=page.locator('dialog.lightbox');
  assert.equal(await dialog.evaluate(node=>node.open),true,`${label}: Enter opens image.`);
  const image=dialog.locator('img');
  await image.evaluate(image=>image.decode());
  assert.equal(await image.getAttribute('src'),source,`${label}: dialog opens the selected image.`);
  assert.equal(await image.getAttribute('alt'),alt,`${label}: dialog preserves the image description.`);
  assert.equal(await dialog.evaluate(node=>node.contains(document.activeElement)),true,`${label}: focus enters the dialog.`);
  const bounds=await image.boundingBox();
  const viewport=page.viewportSize();
  assert(bounds && bounds.x>=-1 && bounds.y>=-1 && bounds.x+bounds.width<=viewport.width+1 && bounds.y+bounds.height<=viewport.height+1,`${label}: enlarged image fits the viewport.`);
  const ratio=await image.evaluate(image=>image.naturalWidth/image.naturalHeight);
  assert(Math.abs((bounds.width/bounds.height)/ratio-1)<0.01,`${label}: enlarged image preserves its original proportions.`);
  await page.keyboard.press('Escape');
  assert.equal(await dialog.evaluate(node=>node.open),false,`${label}: Escape closes image.`);
  assert.equal(await trigger.evaluate(node=>node===document.activeElement),true,`${label}: focus returns to the same image button.`);
  await noOverflow(label);
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
  await page.locator('[data-lightbox]').first().focus();
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
      await decodedImages();
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
  const olive=projects.find(project=>project.id==='level-michurinsky-42-1');
  const sample=JSON.parse(fs.readFileSync(path.join(root,'data/olive-atelier-sample.json'),'utf8'));
  for(const viewport of [{width:1363,height:936},{width:390,height:844},{width:320,height:844}]) {
    await page.setViewportSize(viewport);
    for(const lang of ['ru','en']) {
      const label=`Olive atelier ${lang} ${viewport.width}×${viewport.height}`;
      const prefix=lang==='en'?'../../':'../';
      await page.goto(`${origin}/${lang==='en'?'en/':''}cases/${olive.id}.html`,{waitUntil:'networkidle'});
      await decodedImages();
      await noOverflow(label);
      assert.equal(await page.locator('#shopping-sample [data-product-id]').count(),8,`${label}: eight separately readable product cards.`);
      for(const [index,item] of sample.items.entries()) {
        const id=String(index+1).padStart(2,'0');
        const card=page.locator(`#product-${id}`);
        assert((await card.locator('h3').innerText()).includes(lang==='en'?item.nameEn:item.name),`${label}: ${id} full product title visible in the active language.`);
        assert.equal(await card.locator('button.image-open.product-image').getAttribute('data-lightbox'),prefix+item.imageFile,`${label}: ${id} original product photograph.`);
        assert.equal(await card.locator('img').getAttribute('src'),prefix+item.imageFile,`${label}: ${id} product thumbnail path.`);
        assert.equal(await card.locator('time').getAttribute('datetime'),item.checkedAt,`${label}: ${id} individual verification date.`);
        const clipped=await card.locator('h3').evaluate(node=>node.scrollWidth>node.clientWidth+1 || node.scrollHeight>node.clientHeight+1);
        assert.equal(clipped,false,`${label}: ${id} product title must not be clipped.`);
      }
      for(const [index,material] of olive.materials.entries()) {
        const card=page.locator('.material-grid>li').nth(index);
        const colour=material.accentColor||olive.palette.find(colour=>colour.id===material.paletteId).hex;
        assert.equal(await card.locator('.material-tone').getAttribute('data-material-color'),colour,`${label}: material keeps its assigned palette colour.`);
        const actual=await card.locator('.material-tone').evaluate(node=>getComputedStyle(node).backgroundColor);
        const expected=`rgb(${colour.slice(1).match(/../g).map(channel=>parseInt(channel,16)).join(', ')})`;
        assert.equal(actual,expected,`${label}: rendered material swatch matches its palette reference.`);
        if(material.preview) {
          assert.equal(await card.locator('img').getAttribute('src'),prefix+material.preview.file,`${label}: material texture path.`);
          assert.equal(await card.locator('img').getAttribute('alt'),material.preview.alt[lang],`${label}: translated material texture description.`);
        }
      }
      const expectedTotal=sample.items.reduce((sum,item)=>sum+item.priceRub*item.quantity,0);
      assert.equal(Number(await page.locator('.sample-total').getAttribute('data-total-rub')),expectedTotal,`${label}: calculated selection total.`);
      const contrast=await page.locator('.case-intro>.eyebrow,.case-meta,.case-cover figcaption,.room-table caption,.source-data>.small-note').evaluateAll(nodes=>{
        const rgb=value=>(value.match(/[\d.]+/g)||[]).map(Number);
        const luminance=channels=>channels.slice(0,3).map(value=>{const channel=value/255;return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[0.2126,0.7152,0.0722][index],0);
        return nodes.map(node=>{
          const foreground=rgb(getComputedStyle(node).color);
          let ancestor=node;
          let background;
          while(ancestor) {
            const candidate=rgb(getComputedStyle(ancestor).backgroundColor);
            if(candidate.length===3||candidate[3]===1){background=candidate;break;}
            ancestor=ancestor.parentElement;
          }
          const first=luminance(foreground),second=luminance(background||[255,255,255]);
          return {selector:node.className||node.tagName,ratio:(Math.max(first,second)+0.05)/(Math.min(first,second)+0.05)};
        });
      });
      assert.equal(contrast.length,5,`${label}: all five audited caption targets must be measured.`);
      for(const item of contrast) assert(item.ratio>=4.5,`${label}: ${item.selector} caption contrast ${item.ratio.toFixed(2)}:1 is below 4.5:1.`);
      if(viewport.width!==320) {
        await page.screenshot({path:path.join(out,`olive-${lang}-${viewport.width}x${viewport.height}.png`),fullPage:true});
        await page.locator('.material-grid').screenshot({path:path.join(out,`olive-materials-${lang}-${viewport.width}.png`)});
        await page.locator('#shopping-sample').screenshot({path:path.join(out,`olive-products-${lang}-${viewport.width}.png`)});
      }
      await checkImageDialog('.case-cover button[data-lightbox]',`${label} concept image`);
      const productIds=viewport.width===1363?sample.items.map((_,index)=>String(index+1).padStart(2,'0')):['01','08'];
      for(const id of productIds) await checkImageDialog(`#product-${id} button[data-lightbox]`,`${label} product ${id}`);
      if(await page.locator('.material-grid button[data-lightbox]').count()) await checkImageDialog('.material-grid button[data-lightbox]',`${label} material texture`);
      const details=page.locator('.sample-details:has(.shopping-table)');
      assert.equal(await details.evaluate(node=>node.open),false,`${label}: specifications are initially collapsed.`);
      await details.locator('summary').click();
      assert.equal(await details.evaluate(node=>node.open),true,`${label}: specifications can be expanded.`);
      assert.equal(await details.locator('tbody tr:visible').count(),sample.items.length,`${label}: all specification rows are reachable.`);
      await noOverflow(`${label} expanded specifications`);
      const sheet=page.locator('.sample-board-details');
      assert.equal(await sheet.evaluate(node=>node.open),false,`${label}: selection sheet is initially collapsed.`);
      await sheet.locator('summary').click();
      await checkImageDialog('.sample-board-details button[data-lightbox]',`${label} selection sheet`);
      await noOverflow(`${label} expanded selection sheet`);
      if(viewport.width===1363) await page.locator('.sample-moodboard').screenshot({path:path.join(out,`olive-sheet-${lang}-${viewport.width}.png`)});
      checks.push(`${label}: full product titles/photos, palette references, texture assets, calculated total, caption contrast, image dialog Escape/focus/proportions, expandable specifications/sheet and no overflow`);
    }
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
} catch(error) {
  await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
  fs.writeFileSync(path.join(out,'smoke-results.json'),JSON.stringify({status:'FAIL',checkedAt:new Date().toISOString(),url:page.url(),checks,error:error.stack||String(error),errors,httpFailures:failures},null,2));
  throw error;
} finally { await browser.close(); if(server)await new Promise(resolve=>server.close(resolve)); }
