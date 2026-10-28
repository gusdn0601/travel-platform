// 공유 링크 페이로드 (AC-SHARE-01). 서버 없이 일정 요약을 #/share/<payload> 에 담는다.
// 앱이 읽기 전용으로 그리는 데 필요한 최소 필드만 인코딩한다(좌표·사진·편집 상태 제외).
const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** trip → 요약 페이로드. stops 는 시각·이름·종류만 남긴다. */
export function encodeShare(trip) {
  const mini = {
    v: 1, t: String(trip.title || '여행'),
    s: trip.arrive?.date || trip.start, e: trip.depart?.date || trip.end,
    a: trip.arrive?.time || null, d: trip.depart?.time || null,
    p: trip.plan.map((day) => ({
      n: day.day_no, dt: day.date,
      x: day.stops.map((s) => ({ y: s.type, l: s.label, b: s.start_time, f: s.end_time })).filter((s) => s.l),
    })),
  };
  return b64(JSON.stringify(mini));
}

/** #/share/<payload> → 요약 또는 null. 손상된 링크·다른 버전은 null. */
export function decodeShare(payload) {
  try {
    const o = JSON.parse(unb64(payload));
    if (!o || o.v !== 1 || !Array.isArray(o.p)) return null;
    return o;
  } catch { return null; }
}

/** 공유 링크 문자열 (해시 라우터) */
export const shareUrl = (trip, base = '') => `${base}#/share/${encodeShare(trip)}`;
