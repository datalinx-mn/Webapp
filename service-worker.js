'use strict';
// Cache public app assets only. API responses, PDFs, credentials and business data are never cached here.
const CACHE='datalinx-shell-20260929-1';
const ASSETS=['./app.html','./brand-mark.svg','./brand.css','./workspace-ui.css','./experience-ui.css','./premium-ads.css','./operations-ui.css','./ads-config.js','./premium-ads.js','./operations-ui.js','./reliability-ui.js','./sponsor-metrics.js','./brand.js','./workspace-ui.js','./experience-ui.js','./app-route.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('datalinx-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
  const name=url.pathname.split('/').pop(),asset=ASSETS.find(p=>p.slice(2)===name)||(name==='app'?'./app.html':null);if(!asset)return;
  event.respondWith(fetch(req).then(response=>{if(response.ok&&response.headers.get('content-type')?.includes(name.endsWith('.js')?'javascript':name.endsWith('.css')?'css':name==='app'||name==='app.html'?'html':'image')){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(asset,copy)));}return response;}).catch(()=>caches.open(CACHE).then(c=>c.match(asset))));
});
