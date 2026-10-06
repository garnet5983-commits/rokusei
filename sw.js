/* バージョンを更新すると、古いファイルを混ぜずに一式を入れ替える。 */
const VERSION = '1.2.0';
const BASE = new URL('./',self.location.href).href;
const PREFIX = 'rokusei-diary-' + encodeURIComponent(new URL(BASE).pathname) + '-';
const CACHE = PREFIX + VERSION;
const ASSETS = ['./','./index.html','./style.css','./engine.js','./data.js','./app.js','./compat.js','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'].map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request, url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(BASE))return;
  // 外部サイトへのアクセスや利用者の情報はキャッシュしない。
  if(req.mode==='navigate') {
    event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(new URL('./index.html',BASE).href)||fetch(req);})());return;
  }
  if(!ASSETS.includes(url.href))return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(req)||fetch(req);})());
});
