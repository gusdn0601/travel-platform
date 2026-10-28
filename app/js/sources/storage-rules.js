// 외부(구글) 장소 저장 규칙: 영구 저장은 place_id + 사용자 메모뿐, 좌표 등은 cached_at 이 30일 지나면 폐기
export const CACHE_DAYS = 30;
export function toStored(place, now = Date.now()) {
  if (place?.external?.provider !== 'google') return place;
  const keep = { id: place.id, external: { provider: 'google', place_id: place.external.place_id }, note: place.note || '' };
  if (place.lat != null) keep.cache = { lat: place.lat, lng: place.lng, cached_at: place.cache?.cached_at ?? now };
  return keep;
}
export function pruneCache(stored, now = Date.now()) {
  if (!stored?.cache) return stored;
  if (now - stored.cache.cached_at > CACHE_DAYS * 864e5) { const { cache, ...rest } = stored; return rest; }
  return stored;
}
