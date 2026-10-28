// 장소 모델: 구글 Places 필드와 1:1 매핑 가능한 형태 (docs/google-integration.md 매핑표 참고).
// 기존 앱 코드가 쓰는 필드(name_ko, open, stay_min …)는 호환용으로 함께 유지한다.
import { toMin } from '../scheduler.js';

/** open:[HH:MM,HH:MM] 한 구간을 요일별 opening_hours(구글 periods 형태: day 0=일)로 펼침 */
export function weeklyHours(open, closedDays = []) {
  if (!open) return null; // null = 정보 없음(항상 가능으로 취급)
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => !closedDays.includes(d)).map((day) => ({ day, open: open[0], close: open[1] }));
}

/** 어떤 소스든 이 모양으로 정규화해서 일정 엔진에 넘긴다 */
export function normalizePlace(raw, { provider = null, externalId = null } = {}) {
  const name = raw.name ?? raw.name_ko ?? '';
  const closed = raw.closed_days || [];
  return {
    ...raw,
    id: raw.id,
    external: { provider, place_id: externalId },
    name, name_ko: raw.name_ko ?? name,
    formatted_address: raw.formatted_address ?? raw.address ?? '',
    lat: raw.lat ?? null, lng: raw.lng ?? null,
    opening_hours: raw.opening_hours ?? weeklyHours(raw.open, closed),
    rating: raw.rating ?? null, price_level: raw.price_level ?? null,
    photos: raw.photos ?? [], types: raw.types ?? raw.tagList ?? [],
    stay_min: raw.stay_min ?? 60, stay_user_edited: !!raw.stay_user_edited,
    area: raw.area ?? '기타', kind: raw.kind ?? 'sight',
    tagList: raw.tagList ?? raw.types ?? [], mustScore: raw.mustScore ?? 0,
    open: raw.open ?? null, closed_days: closed, night: !!raw.night, dayTrip: !!raw.dayTrip, tripMin: raw.tripMin || 0, meal: raw.meal ?? null,
  };
}

/** 영업시간 검사: 해당 요일(0=일)에 [startMin,endMin] 방문이 가능한지. 경고 문구 또는 null */
export function hoursWarning(place, weekday, startMin, endMin) {
  if (!place) return null;
  if ((place.closed_days || []).includes(weekday)) return '이 요일은 휴무일 수 있어요';
  const h = place.opening_hours?.filter((x) => x.day === weekday);
  if (place.opening_hours && !h.length) return '이 요일은 휴무일 수 있어요';
  if (!h || !h.length) return null;
  const o = toMin(h[0].open), c = h[0].close === '24:00' ? 1440 : toMin(h[0].close);
  const lo = place.night ? Math.max(o, 1020) : o;
  if (startMin < lo || endMin > c) return `영업시간 밖이에요 (${h[0].open}~${h[0].close})`;
  return null;
}
