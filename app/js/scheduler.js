// 2.3 규칙 기반 시간 자동배분 (AI 없음, 순수 함수 — node 테스트 가능)
export const DAY_START = 540, LUNCH = [690, 810], DINNER = [1080, 1200];
export const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (n) => { n = Math.max(0, Math.round(n)); return String(Math.floor(n / 60) % 24).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); };
export const dayBudget = (kids) => (kids > 0 ? 10 : 12) * 60;
export const dayEnd = (kids) => DAY_START + dayBudget(kids);

export function km(a, b) {
  const R = 6371, r = (x) => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
let travelImpl = null; // TravelTimeProvider 주입 지점 (travel-time.js)
export const setTravelImpl = (f) => { travelImpl = f; };
export function travel(a, b, kids = 0) {
  const r = travelImpl ? travelImpl(a, b, kids) : approxTravel(a, b, kids);
  return r && r.min >= 1 ? r : { ...(r || {}), min: 1, mode: r?.mode || '이동 추정 불가', km: r?.km ?? null }; // 이동 블록은 항상 1분 이상
}
export function approxTravel(a, b, kids = 0) {
  if (a?.lat == null || b?.lat == null) return { min: 15, mode: '이동 추정 불가', km: null, unknown: true }; // 좌표 없는 장소: 0분 블록 대신 15분 가정 (시각 단조성 보장)
  const d = km(a, b);
  if (d < 0.8) return { min: Math.max(3, Math.round(d * 14)), mode: '도보', km: d };
  if (d < 7 && !kids) return { min: Math.round(12 + d * 3.5), mode: '지하철', km: d };
  return { min: Math.round(8 + d * 2.6), mode: '택시', km: d };
}
// 야경 전용 장소는 24시간 개방이어도 17:00 이후로 취급
export const open = (p) => { const o = p.open ? [toMin(p.open[0]), toMin(p.open[1])] : [0, 1440]; return p.night ? [Math.max(o[0], 1020), o[1]] : o; };

export function score(p, { types = [], kids = 0 } = {}) {
  let s = (p.mustScore || 0) * 10;
  s += (p.tagList || []).filter((t) => types.includes(t)).length * 6;
  if (kids > 0 && p.dayTrip) s -= 6;
  return s;
}
let seq = 0;
const sid = () => 's_' + Date.now().toString(36) + (seq++).toString(36);
const centroid = (ps) => {
  const c = ps.filter((p) => p.lat != null);
  return c.length ? { lat: c.reduce((a, p) => a + p.lat, 0) / c.length, lng: c.reduce((a, p) => a + p.lng, 0) / c.length } : null;
};

// 하루 안의 장소를 영업시간·야경 제약 + 최근접 이웃으로 정렬 (야경 전용은 맨 뒤)
export function orderDay(items, kids, t0 = DAY_START) {
  const night = items.filter((p) => p.night).sort((a, b) => open(a)[0] - open(b)[0]);
  const rest = items.filter((p) => !p.night);
  const out = [];
  let cur = null, t = t0;
  while (rest.length) {
    const arr = (p) => Math.max(t + (cur ? travel(cur, p, kids).min : 0), open(p)[0]);
    const feas = rest.filter((p) => arr(p) + p.stay_min <= open(p)[1]);
    let pick;
    if (feas.length) {
      // 일찍 닫는 곳(마감까지 여유 2시간 미만)이 있으면 먼저, 아니면 가장 가까운 곳
      const urgent = feas.filter((p) => open(p)[1] - arr(p) - p.stay_min < 120).sort((a, b) => open(a)[1] - open(b)[1])[0];
      pick = urgent || (cur
        ? feas.reduce((b, p) => (travel(cur, p, kids).min < travel(cur, b, kids).min ? p : b))
        : feas.reduce((b, p) => (open(p)[0] < open(b)[0] ? p : b)));
    } else pick = rest.reduce((b, p) => (open(p)[1] < open(b)[1] ? p : b));
    rest.splice(rest.indexOf(pick), 1);
    out.push(pick);
    t = arr(pick) + pick.stay_min; cur = pick;
  }
  return out.concat(night);
}

// 순서가 정해진 장소에 시각·이동·식사 블록을 입힘 (식사 11:30~13:30 / 18:00~20:00)
export function buildTimeline(day_no, ordered, meals, kids, t0 = DAY_START) {
  const stops = [];
  let cur = null, t = t0, lunch = false, dinner = false;
  const push = (o) => stops.push({ id: sid(), day_no, order: stops.length + 1, ...o });
  const place = (p, start, type = 'place') => {
    push({ type, place_id: p.id, label: p.name_ko, start_time: fromMin(start), end_time: fromMin(start + p.stay_min), note: null });
    cur = p; t = start + p.stay_min;
  };
  const move = (a, b) => {
    const tr = travel(a, b, kids);
    push({ type: 'move', label: tr.mode, mode: tr.mode, start_time: fromMin(t), end_time: fromMin(t + tr.min), note: tr.km != null ? tr.km.toFixed(1) + 'km' : null });
    t += tr.min;
  };
  const doMeal = (slot, win) => {
    const f = meals[slot];
    if (f) {
      if (cur) move(cur, f);
      place(f, Math.max(t, win[0]), 'meal');
    } else {
      const s0 = Math.max(t, win[0]);
      push({ type: 'meal', place_id: null, label: slot === 'lunch' ? '점심 (근처 식당)' : '저녁 (근처 식당)', start_time: fromMin(s0), end_time: fromMin(s0 + 60), note: '자유 식사' });
      t = s0 + 60;
    }
    if (slot === 'lunch') lunch = true; else dinner = true;
  };
  for (const p of ordered) {
    const start = Math.max(t + (cur ? travel(cur, p, kids).min : 0), open(p)[0]);
    if (!lunch && (start >= LUNCH[0] || (start + p.stay_min > LUNCH[1] && start >= 660))) doMeal('lunch', LUNCH);
    if (!dinner && (start >= DINNER[0] || (start + p.stay_min > DINNER[1] && start >= 1020))) doMeal('dinner', DINNER);
    if (cur) move(cur, p);
    const s0 = Math.max(t, open(p)[0]);
    place(p, s0);
    if (s0 + p.stay_min > open(p)[1]) stops[stops.length - 1].note = '영업시간 확인 필요';
  }
  if (!lunch && t > 660) doMeal('lunch', LUNCH);
  if (!dinner && t > 1020) doMeal('dinner', DINNER);
  return stops;
}

/**
 * @param places  mergeMeta 된 장소 배열 (kind: sight|food|shop)
 * @param opts    { selectedIds, days, kids, types }
 * @returns       { days:[{day_no, stops[]}], unscheduled:[place_id], warnings:[] }
 */
export function generateItinerary(places, { selectedIds = [], days = 1, kids = 0, types = [] } = {}) {
  const warnings = [], unscheduled = [];
  const byId = new Map(places.map((p) => [p.id, p]));
  const opt = { types, kids };
  const sel = selectedIds.map((i) => byId.get(i)).filter(Boolean);
  let main = sel.filter((p) => p.kind !== 'food'), foods = sel.filter((p) => p.kind === 'food');
  const cap = dayBudget(kids) - 120; // 점심·저녁 제외한 일일 가용시간
  const cost = (p) => p.stay_min + (p.dayTrip ? 0 : 20);
  const D = Array.from({ length: days }, () => ({ items: [], load: 0, trip: false }));
  if (!main.length) { // 선택이 없으면 점수순 자동 선정
    const pool = places.filter((p) => p.kind !== 'food' && !p.dayTrip).sort((a, b) => score(b, opt) - score(a, opt));
    let total = 0; main = [];
    for (const p of pool) if (total + cost(p) <= cap * days) { main.push(p); total += cost(p); }
  }
  main.sort((a, b) => score(b, opt) - score(a, opt));
  const trips = main.filter((p) => p.dayTrip), norm = main.filter((p) => !p.dayTrip);
  for (const p of trips) { // 근교 당일치기는 하루를 독점
    const d = days > 1 ? D.find((x) => !x.trip && !x.items.length) : null;
    if (d) { d.items.push(p); d.trip = true; } else { unscheduled.push(p.id); warnings.push(`${p.name_ko}: 근교 당일치기는 2일 이상 여행에서만 배정돼요.`); }
  }
  const groups = {};
  for (const p of norm) (groups[p.area] ||= []).push(p);
  const gl = Object.values(groups).sort((a, b) => b.reduce((s, p) => s + cost(p), 0) - a.reduce((s, p) => s + cost(p), 0));
  const free = () => D.filter((d) => !d.trip);
  for (const g of gl) { // 같은 권역은 같은 날로 (안 들어가면 가까운 날로 분할)
    const gc = g.reduce((s, p) => s + cost(p), 0);
    const whole = free().filter((d) => d.load + gc <= cap).sort((a, b) => a.load - b.load)[0];
    if (whole) { whole.items.push(...g); whole.load += gc; continue; }
    for (const p of g) {
      const cands = free().filter((d) => d.load + cost(p) <= cap).sort((a, b) => {
        const ca = centroid(a.items), cb = centroid(b.items);
        return (ca ? km(ca, p) : 0) - (cb ? km(cb, p) : 0) || a.load - b.load;
      });
      if (cands[0]) { cands[0].items.push(p); cands[0].load += cost(p); } else unscheduled.push(p.id);
    }
  }
  if (unscheduled.length && !warnings.length) warnings.push(`시간이 모자라 ${unscheduled.length}곳은 배정하지 못했어요.`);
  // 식사 후보 -> 가까운 날의 점심/저녁 슬롯 (식당 선택이 없고 '미식' 유형이면 자동 추천)
  if (!foods.length && types.includes('미식')) foods = places.filter((p) => p.kind === 'food');
  const meals = D.map(() => ({}));
  for (const f of foods.sort((a, b) => score(b, opt) - score(a, opt))) {
    const order = D.map((d, i) => ({ i, c: centroid(d.items) })).filter((x) => x.c && !D[x.i].trip).sort((a, b) => km(a.c, f) - km(b.c, f));
    for (const { i } of order) {
      const slots = f.meal ? [f.meal, f.meal === 'lunch' ? 'dinner' : 'lunch'] : ['lunch', 'dinner'];
      const s = slots.find((x) => !meals[i][x]);
      if (s) { meals[i][s] = f; break; }
    }
  }
  const out = D.map((d, i) => {
    if (d.trip) {
      const p = d.items[0], t0 = DAY_START - 30, s0 = t0 + p.tripMin;
      const stops = [
        { type: 'move', label: '상하이 → ' + p.name_ko, mode: '버스/택시', start_time: fromMin(t0), end_time: fromMin(s0), note: '근교 이동' },
        { type: 'place', place_id: p.id, label: p.name_ko, start_time: fromMin(s0), end_time: fromMin(s0 + p.stay_min), note: '점심은 현지에서' },
        { type: 'move', label: p.name_ko + ' → 상하이', mode: '버스/택시', start_time: fromMin(s0 + p.stay_min), end_time: fromMin(s0 + p.stay_min + p.tripMin), note: '근교 이동' },
      ].map((s, k) => ({ id: sid(), day_no: i + 1, order: k + 1, ...s }));
      return { day_no: i + 1, stops };
    }
    if (!d.items.length) return { day_no: i + 1, stops: [] };
    return { day_no: i + 1, stops: buildTimeline(i + 1, orderDay(d.items, kids), meals[i], kids) };
  });
  const lim = dayEnd(kids) + 30;
  out.forEach((d, i) => {
    const last = d.stops.at(-1);
    if (last && !D[i].trip && toMin(last.end_time) > lim) warnings.push(`${d.day_no}일차가 ${last.end_time}까지 이어져요. 장소를 줄여 보세요.`);
  });
  return { days: out, unscheduled, warnings };
}

// 수정 후 재계산: 이동 블록을 지우고 현재 순서·체류시간 그대로 시각/이동을 다시 맞춤
export function reflowDay(stops, placesById, kids = 0) {
  const keep = stops.filter((s) => s.type !== 'move');
  const day_no = stops[0]?.day_no ?? 1;
  const out = [];
  let t = keep.length ? toMin(keep[0].start_time) : DAY_START, cur = null;
  for (const s of keep) {
    const p = s.place_id ? placesById.get(s.place_id) : null;
    const dur = Math.max(10, toMin(s.end_time) - toMin(s.start_time));
    if (cur && p) {
      const tr = travel(cur, p, kids);
      out.push({ id: sid(), day_no, order: 0, type: 'move', label: tr.mode, mode: tr.mode, start_time: fromMin(t), end_time: fromMin(t + tr.min), note: tr.km != null ? tr.km.toFixed(1) + 'km' : null });
      t += tr.min;
    }
    if (s.pinned) t = Math.max(t, toMin(s.start_time));
    out.push({ ...s, start_time: fromMin(t), end_time: fromMin(t + dur) });
    t += dur;
    if (p) cur = p;
  }
  out.forEach((s, i) => { s.order = i + 1; });
  return out;
}
