// 둘러보기 서비스워커 — 첫 방문 후 비행기 모드/불안정 로밍에서도 목록·검색·상세가 열린다.
// 빌드 시 '6cc3be3d3b' 가 해시로 치환된다(scripts/build-site.mjs). 캐시 버전 = 배포 버전.
const BUILD = '__BUILD__';
const CACHE = 'tp-browse-' + BUILD;
const CORE = ['./', './index.html', './browse.css', './browse.js', './ads-config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './app/fonts/PretendardVariable.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    try {
      const res = await fetch('./data/precache.json', { cache: 'no-store' });
      if (res.ok) {
        const { files } = await res.json();
        const q = [...files];
        const worker = async () => {
          while (q.length) {
            const u = q.shift();
            try { await c.add(new Request(u, { cache: 'reload' })); } catch { }
          }
        };
        await Promise.all(Array.from({ length: 8 }, worker));
      }
    } catch { }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter((k) => k.startsWith('tp-browse-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isImage = (r) => r.destination === 'image' || /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(new URL(r.url).pathname);

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  let url; try { url = new URL(r.url); } catch { return; }
  if (url.origin !== location.origin) return;

  // 이동(HTML): 네트워크 우선 → 실패 시 저장된 첫 화면
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(r);
        if (res.ok) (await caches.open(CACHE)).put('./index.html', res.clone());
        return res;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 사진: 캐시 우선(한 번 본 사진은 오프라인에서도 바로)
  if (isImage(r)) {
    e.respondWith((async () => {
      const hit = await caches.match(r, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(r);
        if (res.ok) (await caches.open(CACHE)).put(r, res.clone());
        return res;
      } catch { return Response.error(); }
    })());
    return;
  }

  // 데이터·CSS·JS: 캐시 우선 + 백그라운드 갱신
  e.respondWith((async () => {
    const hit = await caches.match(r, { ignoreSearch: true });
    if (hit) {
      fetch(r).then(async (res) => { if (res.ok) (await caches.open(CACHE)).put(r, res.clone()); }).catch(() => { });
      return hit;
    }
    try {
      const res = await fetch(r);
      if (res.ok) (await caches.open(CACHE)).put(r, res.clone());
      return res;
    } catch {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});

// "오프라인 저장" 버튼: 고른 도시의 사진·상세를 모두 캐시에 넣고 진행률을 돌려준다.
self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type !== 'prefetch') return;
  const port = e.ports && e.ports[0];
  const send = (m) => { try { port && port.postMessage(m); } catch { } };
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const q = [...new Set(data.urls || [])];
    const total = q.length;
    let done = 0, failed = 0;
    const worker = async () => {
      while (q.length) {
        const u = q.shift();
        try {
          const res = await fetch(u);
          if (res.ok) await c.put(new Request(u, { cache: 'reload' }), res);
          else failed++;
        } catch { failed++; }
        done++;
        if (done % 5 === 0 || done === total) send({ type: 'progress', done, total });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    send({ type: 'done', done, total, failed });
    const cls = await self.clients.matchAll({ type: 'window' });
    cls.forEach((cl) => cl.postMessage({ type: 'prefetch-done', failed }));
  })());
});
