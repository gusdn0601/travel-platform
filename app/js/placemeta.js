// 앱 보강 메타: data/ 의 장소 파일에 아직 없는 값(좌표·체류시간·영업시간·권역·식사시간대).
// 근사값(공개 지도 기준) — 공개 전 verified_at/sources 와 함께 data/ 로 이관·검증 필요 (README "알려진 공백").
// open: [시작, 끝] 24시간제. night: 야경/저녁 전용(18:00 이후 배치). dayTrip: 하루를 통째로 쓰는 근교.
const A = { BUND: '와이탄/성황묘', PUDONG: '푸동', JINGAN: '정안/난징루', FRENCH: '프랑스 조계지', SUBURB: '근교 수향마을', ETC: '기타' };
export const AREAS = A;
export const PLACE_META = {
  'CN-SHA-S-0001': { lat: 31.2275, lng: 121.492, area: A.BUND, stay: 90, open: ['08:30', '21:00'], tags: ['관광', '역사'], must: 1 },
  'CN-SHA-S-0002': { lat: 31.24, lng: 121.49, area: A.BUND, stay: 90, open: ['00:00', '24:00'], night: true, tags: ['관광', '역사'], must: 2 },
  'CN-SHA-S-0003': { lat: 31.2272, lng: 121.492, area: A.BUND, stay: 90, open: ['09:00', '16:45'], tags: ['관광', '역사', '휴양'], must: 2 },
  'CN-SHA-S-0004': { lat: 30.6416, lng: 120.4868, area: A.SUBURB, stay: 300, open: ['09:00', '18:00'], dayTrip: true, tripMin: 120, tags: ['관광', '휴양'], must: 1 },
  'CN-SHA-S-0005': { lat: 31.2236, lng: 121.4457, area: A.JINGAN, stay: 60, open: ['07:30', '17:00'], tags: ['관광', '역사'], must: 1 },
  'CN-SHA-S-0006': { lat: 31.2358, lng: 121.4785, area: A.JINGAN, stay: 90, open: ['09:00', '22:00'], tags: ['관광'] },
  'CN-SHA-S-0007': { lat: 31.2397, lng: 121.4998, area: A.PUDONG, stay: 60, open: ['00:00', '24:00'], tags: ['관광'] },
  'CN-SHA-S-0008': { lat: 31.2335, lng: 121.5055, area: A.PUDONG, stay: 90, open: ['08:30', '21:30'], tags: ['관광'], must: 1 },
  'CN-SHA-S-0009': { lat: 31.242, lng: 121.506, area: A.PUDONG, stay: 60, open: ['17:00', '23:00'], night: true, tags: ['관광', '휴양'] },
  'CN-SHA-S-0010': { lat: 31.209, lng: 121.439, area: A.FRENCH, stay: 90, open: ['09:00', '22:00'], tags: ['관광', '휴양'] },
  'CN-SHA-S-0011': { lat: 31.2107, lng: 121.469, area: A.FRENCH, stay: 90, open: ['10:00', '21:00'], tags: ['관광', '미식'] },
  'CN-SHA-S-0012': { lat: 31.22, lng: 121.47, area: A.FRENCH, stay: 75, open: ['09:00', '18:00'], tags: ['관광', '역사'] },
  'CN-SHA-S-0013': { lat: 31.2192, lng: 121.4688, area: A.FRENCH, stay: 45, open: ['09:30', '16:30'], tags: ['역사'] },
  'CN-SHA-S-0014': { lat: 31.22, lng: 121.4745, area: A.FRENCH, stay: 90, open: ['10:00', '22:00'], tags: ['관광', '미식'] },
  'CN-SHA-S-0015': { lat: 31.278, lng: 121.453, area: A.ETC, stay: 120, open: ['19:00', '22:00'], night: true, tags: ['관광'] },
  'CN-SHA-S-0016': { lat: 31.25, lng: 121.5, area: A.BUND, stay: 60, open: ['17:00', '23:00'], night: true, tags: ['관광', '휴양'] },
  'CN-SHA-P-0001': { lat: 31.234, lng: 121.467, area: A.JINGAN, stay: 60, open: ['08:00', '22:00'], tags: ['휴양', '미식'] },
  'CN-SHA-P-0002': { lat: 31.24, lng: 121.488, area: A.BUND, stay: 60, open: ['10:00', '21:00'], tags: ['관광'] },
  'CN-SHA-F-0001': { lat: 31.233, lng: 121.48, area: A.BUND, stay: 75, meal: 'dinner', tags: ['미식'] },
  'CN-SHA-F-0002': { lat: 31.227, lng: 121.492, area: A.BUND, stay: 60, meal: 'lunch', tags: ['미식'] },
  'CN-SHA-F-0003': { lat: 31.234, lng: 121.474, area: A.JINGAN, stay: 45, meal: 'lunch', tags: ['미식'] },
  'CN-SHA-F-0004': { lat: 31.215, lng: 121.45, area: A.FRENCH, stay: 75, meal: 'dinner', tags: ['미식'] },
  'CN-SHA-F-0005': { lat: 31.21, lng: 121.46, area: A.FRENCH, stay: 75, meal: 'dinner', tags: ['미식'] },
  'CN-SHA-F-0006': { lat: 31.208, lng: 121.443, area: A.FRENCH, stay: 60, meal: 'lunch', tags: ['미식'] },
  'CN-SHA-F-0007': { lat: 31.22, lng: 121.4745, area: A.FRENCH, stay: 60, meal: 'lunch', tags: ['미식'] },
};
export function mergeMeta(place) {
  const m = PLACE_META[place.code] || {};
  return {
    ...place,
    lat: place.lat ?? m.lat ?? null, lng: place.lng ?? m.lng ?? null,
    area: place.area ?? m.area ?? A.ETC,
    stay_min: place.stay_min ?? m.stay ?? 60,
    open: m.open || null, night: !!m.night, dayTrip: !!m.dayTrip, tripMin: m.tripMin || 0,
    meal: m.meal || null,
    tagList: place.tags?.length ? place.tags : (m.tags || []),
    mustScore: place.must ?? m.must ?? 0,
  };
}
