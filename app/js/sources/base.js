// 장소 소스 인터페이스 (PlaceSource). 모든 소스는 normalizePlace 형태를 반환한다.
//   search(query, { bias: {lat,lng}|null, limit }) -> Promise<Place[]>
//   details(id)                                     -> Promise<Place|null>
//   nearby(point: {lat,lng}, radius: km)            -> Promise<Place[]>
// 사용할 수 없는 소스는 SourceError(code='unavailable')를 던진다 (앱은 그 소스만 건너뛴다).
export class SourceError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
export class PlaceSource {
  constructor(provider) { this.provider = provider; }
  async search() { throw new SourceError('unavailable', `${this.provider}: search 미구현`); }
  async details() { throw new SourceError('unavailable', `${this.provider}: details 미구현`); }
  async nearby() { throw new SourceError('unavailable', `${this.provider}: nearby 미구현`); }
}
export const REQUIRED_PLACE_FIELDS = ['id', 'name', 'lat', 'lng', 'opening_hours', 'stay_min', 'external'];
/** normalizePlace 출력의 필수 필드 검증. 문제 목록을 반환(빈 배열 = 통과) */
export function validatePlace(p) {
  const bad = REQUIRED_PLACE_FIELDS.filter((k) => !(k in p));
  if (!p.id) bad.push('id(empty)');
  if (!(p.stay_min > 0)) bad.push('stay_min(>0)');
  if (!p.external || !('provider' in p.external)) bad.push('external.provider');
  return [...new Set(bad)];
}
export const SEARCH_TIMEOUT_MS = 3000;
const withTimeout = (pr, ms) => new Promise((res, rej) => { const h = setTimeout(() => rej(new SourceError('timeout')), ms); pr.then((v) => { clearTimeout(h); res(v); }, (e) => { clearTimeout(h); rej(e); }); });
/**
 * 로컬 + 외부 소스를 합쳐 검색. 외부 소스 예외/타임아웃(3초)은 삼키고 로컬 결과만 돌려준다.
 * 반환: { places, notice } — notice 가 있으면 UI 상단에 한 줄로 안내. 'unavailable' 은 미설정이므로 안내 없이 건너뜀.
 */
export async function searchAll(local, extras, query, opts = {}, timeoutMs = SEARCH_TIMEOUT_MS) {
  const places = await local.search(query, opts);
  let notice = null;
  await Promise.all((extras || []).map(async (src) => {
    try { places.push(...(await withTimeout(src.search(query, opts), timeoutMs))); }
    catch (e) { if (e?.code !== 'unavailable') notice = '일부 검색 결과를 불러오지 못했어요 (저장된 장소만 보여드려요)'; }
  }));
  return { places, notice };
}
