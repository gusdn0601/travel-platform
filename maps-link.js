// 지도 링크 빌더 — 문자열만 만드는 순수 함수(테스트: tests/maps-link.test.mjs).
// 고덕(AMap) URI API 규격: https://lbs.amap.com/api/uri-api/guide/mobile-web/point · /search/search
//  - marker 는 coordinate 를 생략하면 기본값이 gaode(GCJ-02)다. 우리 좌표는 OSM·Wikidata 에서 온
//    WGS84 이므로 coordinate=wgs84 를 반드시 붙인다(안 붙이면 중국에서 100~700m 어긋난다).
//  - search 는 coordinate 파라미터가 없으므로 city 로 범위를 좁힌다(도시 이름/전화 지역번호/도시 코드).
//  - callnative=1 은 모바일에서 고덕 앱이 깔려 있으면 앱으로, 없으면 웹으로 연다(앱 딥링크 대체).

const SRC = 'travel-platform'; // 고덕 권장 파라미터(미입력 시에도 동작하지만 품질 통계용으로 채운다)
const enc = (s) => encodeURIComponent(String(s == null ? '' : s).trim());

/** 검색 키워드: local_search 우선, 없으면 name_local. 끝에 붙은 도시 이름은 city 파라미터와 겹치므로 뺀다. */
export function searchKeyword(p, cityLocal = '') {
  const raw = String(p.local_search || p.name_local || p.name_ko || '').trim();
  const city = String(p.map_city || cityLocal || '').trim();
  let k = raw;
  for (const c of [city, cityLocal, '上海']) {
    if (c && k.endsWith(' ' + c)) k = k.slice(0, -(c.length + 1));
  }
  return k.replace(/\s+/g, ' ').trim();
}

/** 좌표가 있으면 마커(WGS84 표기), 없으면 도시 범위 검색. */
export function amapUrl(p, cityLocal = '') {
  const name = p.name_local || p.name_ko || '';
  if (p.lat != null && p.lng != null) {
    return `https://uri.amap.com/marker?position=${p.lng},${p.lat}&name=${enc(name)}&coordinate=wgs84&callnative=1&src=${SRC}`;
  }
  const city = p.map_city || cityLocal;
  return `https://uri.amap.com/search?keyword=${enc(searchKeyword(p, cityLocal))}&city=${enc(city)}&view=list&callnative=1&src=${SRC}`;
}

/** 지점(체인) 링크 — 지점명 기준. 좌표가 있으면 마커, 없으면 본점과 같은 도시 검색. */
export function amapBranchUrl(b, p = {}, cityLocal = '') {
  const name = b.name_local || p.name_local || '';
  if (b.lat != null && b.lng != null) {
    return `https://uri.amap.com/marker?position=${b.lng},${b.lat}&name=${enc(name)}&coordinate=wgs84&callnative=1&src=${SRC}`;
  }
  const city = b.map_city || p.map_city || cityLocal;
  return `https://uri.amap.com/search?keyword=${enc(name)}&city=${enc(city)}&view=list&callnative=1&src=${SRC}`;
}

/** 구글 지도 — 좌표(WGS84) 우선, 없으면 현지 이름·주소(주소 없으면 도시) 검색. */
export function gmapUrl(p, cityLocal = '') {
  const q = p.lat != null && p.lng != null
    ? `${p.lat},${p.lng}`
    : [p.name_local, p.addr_local || p.map_city || cityLocal].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || p.name_ko || '')}`;
}
