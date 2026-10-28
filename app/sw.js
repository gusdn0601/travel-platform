// 서비스워커: 앱 껍데기 + 데이터 + 사진을 캐시해 두고, 네트워크가 없어도 홈·일정·편집이 뜨게 한다.
const VER = 'tp-v5', CORE = ['./', './index.html', './style.css', './themes.css', './js/main.js', './fonts/PretendardVariable.woff2', './fonts/noto-serif-kr.css', './fonts/gowun-dodum.css', './fonts/shippori-mincho.css'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VER).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// 네트워크 우선(최신 유지) → 실패하면 캐시. 성공한 GET 은 모두 캐시에 쌓는다.
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VER).then((c) => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
