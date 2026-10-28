// 오프라인 팩 (AC-OFF-04/05). 일정에 필요한 데이터·사진을 Cache Storage 에 저장한다.
// 서비스워커는 caches.match() 로 모든 캐시를 조회하므로 별도 캐시에 넣어도 오프라인에서 열린다.
const META_KEY = 'travel_packs_v1';
const cacheName = (id) => `tp-pack-${id}`;

export const packUrls = (trip, places) => {
  const city = '../data/cities/shanghai/';
  const ids = new Set(trip.plan.flatMap((d) => d.stops.map((s) => s.place_id)).filter(Boolean));
  const codes = [...ids].map((id) => places.find((p) => p.id === id)?.code).filter(Boolean);
  const cc = trip.country || 'CN';
  return [
    city + 'city.json', city + 'places-index.json', city + 'photos.json', city + 'route-map.json',
    ...codes.map((c) => `${city}places/${c}.json`),
    `../data/countries/${cc}/country.json`, `../data/countries/${cc}/info-procedures.json`, `../data/countries/${cc}/info-phrases.json`,
  ];
};

export function packMeta(tripId) {
  try { const all = JSON.parse(localStorage.getItem(META_KEY) || '{}'); return all[tripId] || null; } catch { return null; }
}
function setMeta(tripId, meta) {
  const all = (() => { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; } })();
  if (meta) all[tripId] = meta; else delete all[tripId];
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

/** 진행률 콜백(onProgress(pct, done, total))을 부르며 저장. 반환: 팩 메타 */
export async function savePack(trip, places, onProgress = () => {}) {
  const urls = [...new Set(packUrls(trip, places))];
  const cache = await caches.open(cacheName(trip.id));
  let bytes = 0, done = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) {
        const copy = res.clone();
        const size = +(copy.headers.get('content-length') || 0) || (await copy.clone().blob()).size;
        await cache.put(url, copy);
        bytes += size;
      }
    } catch { /* 개별 실패는 건너뛴다 — 진행은 계속 */ }
    done += 1;
    onProgress(Math.round(done / urls.length * 100), done, urls.length);
  }
  const meta = { id: trip.id, saved_at: new Date().toISOString(), files: urls.length, bytes, places: trip.plan.flatMap((d) => d.stops).filter((s) => s.place_id).length };
  setMeta(trip.id, meta);
  return meta;
}

export async function deletePack(tripId) {
  await caches.delete(cacheName(tripId));
  setMeta(tripId, null);
}

/** 사람이 읽는 용량 */
export const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
