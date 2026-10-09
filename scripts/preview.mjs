import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const projects=JSON.parse(fs.readFileSync(path.join(root,'data/projects.json'),'utf8'));
const pageFiles=['index.html',...projects.map(p=>`cases/${p.id}.html`)];
const pages=Object.fromEntries([...pageFiles,...pageFiles.map(file=>'en/'+file)].map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
const files=['assets/favicon.svg',...fs.readdirSync(path.join(root,'assets/renders')).map(f=>'assets/renders/'+f),...fs.readdirSync(path.join(root,'assets/source')).map(f=>'assets/source/'+f)];
const mime=filename=>filename.endsWith('.webp')?'image/webp':filename.endsWith('.png')?'image/png':filename.endsWith('.jpg')?'image/jpeg':'image/svg+xml';
const assets=Object.fromEntries(files.map(file=>[file,{type:mime(file),data:fs.readFileSync(path.join(root,file)).toString('base64')}])) ;
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const style=fs.readFileSync(path.join(root,'assets/style.css'),'utf8');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Safonov Interiors — portfolio</title><meta name="theme-color" content="#302c27"><style>html,body{margin:0;height:100%;background:#f3f0e8}iframe{display:block;border:0;width:100%;height:100%}</style></head><body><iframe id="portfolio" title="Safonov Interiors — ${projects.length} интерьерных концепций / Moscow Premium"></iframe>
<script>
const pages=${safe(pages)};
const assets=${safe(assets)};
const css=${safe(style)};
const appCode=${safe(app)};
const assetUrls={};
for(const [name,asset] of Object.entries(assets)){const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));assetUrls[name]=URL.createObjectURL(new Blob([bytes],{type:asset.type}));}
const frame=document.getElementById('portfolio');
window.previewLanguage='ru';
try{window.previewLanguage=localStorage.getItem('safonov-interiors-language')==='en'?'en':'ru';}catch{}
window.navigatePortfolio=(key='index.html',hash='',language=window.previewLanguage)=>{
 if(!pages[key])key='index.html';
 window.previewLanguage=language==='en'?'en':'ru';
 const base='https://portfolio-preview.invalid/'+key;
 let html=pages[key].replace(/<script[^>]*src="[^"]*"[^>]*><\\/script>/g,'').replace(/<link rel="stylesheet"[^>]*>/g,'');
 html=html.replace(/\\b(src|href|data-lightbox)="([^"]+)"/g,(all,attribute,value)=>{try{const file=new URL(value,base).pathname.slice(1);if(assetUrls[file])return attribute+'="'+assetUrls[file]+'"';}catch{}return all;});
 html=html.replace('<head>','<head><base href="'+base+'"><style>'+css+'</style>');
 html=html.replace(/(<html[^>]* lang=")[^"]*(")/,'$1'+window.previewLanguage+'$2');
 const navigationCode='document.addEventListener("click",event=>{const a=event.target.closest("a[href]");if(!a)return;const url=new URL(a.getAttribute("href"),document.baseURI);if(url.hostname!=="portfolio-preview.invalid")return;const file=url.pathname.slice(1);if(!parent.hasPortfolioPage(file))return;event.preventDefault();parent.navigatePortfolio(file,url.hash,document.documentElement.lang);});document.querySelectorAll("[data-set-lang]").forEach(button=>button.addEventListener("click",()=>{parent.previewLanguage=document.documentElement.lang;}));';
 html=html.replace('</body>','<script>'+appCode+'<\\/script><script>'+navigationCode+'<\\/script></body>');
 frame.addEventListener('load',()=>{document.title=frame.contentDocument.title;if(hash){const target=frame.contentDocument.getElementById(hash.slice(1));if(target)target.scrollIntoView();}},{once:true});
 frame.srcdoc=html;
};
window.hasPortfolioPage=key=>Object.hasOwn(pages,key);
window.navigatePortfolio();
</script></body></html>`;
const out=path.join(root,'output');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'Safonov_Interiors_Portfolio.html'),html);
console.log(`Created standalone HTML preview with embedded assets and all ${projects.length} cases.`);
