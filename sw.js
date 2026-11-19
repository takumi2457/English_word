// 単語帳 Service Worker（オフライン対応）
const V = "tango-v1";
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(FILES);
    try { await c.put(CDN, await fetch(CDN, { mode: "no-cors" })); } catch (x) {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Excel読み込み用ライブラリ：キャッシュ優先
  if (req.url === CDN) {
    e.respondWith(caches.match(CDN).then(r => r || fetch(req).then(res => {
      const cp = res.clone();
      caches.open(V).then(c => c.put(CDN, cp));
      return res;
    })));
    return;
  }
  // 自分のファイル：ネット優先（更新がすぐ反映される）、オフライン時はキャッシュ
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
  }
});
