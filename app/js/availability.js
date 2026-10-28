// 일자별 가용시간 · 페이스 · 규칙 추천 · 하루 자동 채우기 (순수 함수, AI/네트워크 없음)
import { toMin, fromMin, travel, km, score, open as openRange, orderDay, buildTimeline, LUNCH, DINNER } from './scheduler.js';
import { hoursWarning } from './sources/model.js';

export const AIRPORTS = {
  PVG: { name: '푸동공항', lat: 31.1443, lng: 121.8083 },
  SHA: { name: '훙차오공항', lat: 31.1979, lng: 121.3363 },
};
// 입국·수하물 / 공항 도착 여유 (flows.md §1): 해외 90·180분, 국내 30·90분
export const BUFFERS = { intl: { entry: 90, airport: 180 }, domestic: { entry: 30, airport: 90 } };
// 페이스 상한(식사 제외): 느림 3 · 성인만 5 · 아이 동반 4
export const PACE = { relaxed: { label: '느림', max: 3 }, normal: { label: '보통', max: 5, kidsMax: 4 } };
export const paceMax = (pace, kids = 0) => { const P = PACE[pace] || PACE.normal; return kids > 0 && P.kidsMax ? P.kidsMax : P.max; };
export const PACE_CAP = 0.85; // 자동 초안: (체류+이동) ≤ 가용 × 0.85
export const DEFAULT_OPTS = { dayStart: '09:00', dayEnd: '21:00', checkin: 60, transfer: 60, departBuffer: null, arriveBuffer: null };
const MEAL_BLOCKS = [LUNCH, DINNER]; // 점심 11:30~13:30, 저녁 18:00~20:00 중 각 60분

/** 'HH:MM'(00:00~23:59)만 통과 */
export const validHHMM = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v ?? '').trim());
/** 창 안에 식사 블록이 60분 이상 걸치면 60분을 가용에서 제외 */
export const mealMinutes = (start, end) => MEAL_BLOCKS.filter(([a, b]) => Math.min(end, b) - Math.max(start, a) >= 60).length * 60;

const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const addDays = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
export const weekday = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
export const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const fmtDur = (m) => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}시간 ${r}분` : `${h}시간`) : `${r}분`; };
/** 칩용 짧은 형식: 2h 30m */
export const fmtHM = (m) => { m = Math.max(0, Math.round(m)); const h = Math.floor(m / 60), r = m % 60; return `${h}h ${String(r).padStart(2, '0')}m`; };
const rid = () => 's_' + Math.random().toString(36).slice(2, 8);

/** 구버전 trip(arrive 없음) 보정 */
export function normalizeTrip(t) {
  t.arrive ||= { date: t.start, time: '10:00', airport: 'PVG' };
  t.depart ||= { date: t.end, time: '18:00', airport: 'PVG' };
  t.lodging ||= { name: '', area: '' };
  if (!PACE[t.pace]) t.pace = 'normal'; // 구버전 'packed' 등
  t.domestic ||= false;
  t.opts = { ...DEFAULT_OPTS, ...(t.opts || {}) };
  t.custom_places ||= [];
  return t;
}
export const tripDays = (t) => dayDiff(t.arrive.date, t.depart.date) + 1;

/**
 * 일자별 가용 구간. 분 단위 24h제.
 *  start/end = 관광 창, span = end-start, meal = 제외할 식사분, min = span - meal (가용시간)
 *  도착일 start = 도착 + 입국 + 공항→숙소 + 체크인, 출발일 end = 출발 - 공항 여유 - 숙소→공항
 */
export function dayWindows(trip) {
  const o = { ...DEFAULT_OPTS, ...(trip.opts || {}) }, n = tripDays(trip), B = trip.domestic ? BUFFERS.domestic : BUFFERS.intl;
  const entry = o.arriveBuffer ?? B.entry, airportBuf = o.departBuffer ?? B.airport, xfer = o.transfer ?? 60;
  const out = [];
  for (let i = 0; i < n; i++) {
    let start = toMin(o.dayStart), end = toMin(o.dayEnd);
    const notes = [], first = i === 0, last = i === n - 1, w = { leaveLodging: null, airportArrive: null };
    if (first) {
      const ap = AIRPORTS[trip.arrive.airport] || AIRPORTS.PVG;
      const ready = toMin(trip.arrive.time) + entry + xfer + o.checkin;
      start = Math.max(start, ready);
      notes.push(`${trip.arrive.time} ${ap.name} 도착 → 입국 ${entry}분 + 숙소 이동 ${xfer}분 + 체크인 ${o.checkin}분 = ${fromMin(ready)}부터`);
    }
    if (last) {
      const ap = AIRPORTS[trip.depart.airport] || AIRPORTS.PVG;
      w.airportArrive = toMin(trip.depart.time) - airportBuf; w.leaveLodging = w.airportArrive - xfer;
      end = Math.min(end, w.leaveLodging);
      notes.push(`숙소 출발 ${fromMin(w.leaveLodging)} · ${ap.name} 도착 ${fromMin(w.airportArrive)} · ${trip.depart.time} 출발편`);
    }
    const span = Math.max(0, end - start), meal = span ? mealMinutes(start, end) : 0, min = Math.max(0, span - meal);
    if (min === 0) notes.push(first && !last ? '도착이 늦어 이 날은 휴식·간단한 식사 정도만 가능해요' : '이 날은 관광 시간이 거의 없어요');
    out.push({ day_no: i + 1, date: addDays(trip.arrive.date, i), start, end: Math.max(start, end), span, meal, min, kind: first && last ? 'both' : first ? 'arrival' : last ? 'departure' : 'full', notes, ...w });
  }
  return out;
}

const real = (stops) => stops.filter((s) => s.type !== 'move');
const dur = (s) => Math.max(0, toMin(s.end_time) - toMin(s.start_time));
/** 사용 시간: 식사는 가용시간(win.min)이 이미 60분씩 빼 두었으므로 그 초과분만 센다 */
export const usedMinutes = (stops, win = null) => {
  const meal = stops.filter((s) => s.type === 'meal').reduce((a, s) => a + dur(s), 0);
  return stops.filter((s) => s.type !== 'meal').reduce((a, s) => a + dur(s), 0) + Math.max(0, meal - (win?.meal || 0));
};
/** 가용시간을 넘긴 분 (없으면 0) */
export const overMinutes = (stops, win) => { const last = stops.at(-1); return last ? Math.max(0, toMin(last.end_time) - win.end) : 0; };
export const placeCount = (stops) => stops.filter((s) => s.type === 'place').length;

/** 하루 경고: 페이스 초과 / 가용시간 초과 / 영업시간 / 휴무 */
export function dayWarnings(stops, win, pace, byId, kids = 0) {
  const w = [], max = paceMax(pace, kids), c = placeCount(stops);
  if (c > max) w.push(`${max}곳까지 권장 · 지금 ${c}곳`);
  const over = overMinutes(stops, win);
  if (over) w.push(`시간 초과 +${over}분 — ${stops.at(-1).end_time}까지 이어져요 (가용 ${fromMin(win.end)}까지)`);
  const first = stops[0];
  if (first && toMin(first.start_time) < win.start) w.push(`${fromMin(win.start)} 이전에 시작하는 일정이 있어요`);
  for (const s of real(stops)) {
    const m = hoursWarning(byId.get(s.place_id), weekday(win.date), toMin(s.start_time), toMin(s.end_time));
    if (m) w.push(`${s.label}: ${m}`);
  }
  return w;
}

/** 하루 끝 상태(마지막 장소, 현재 시각, 이미 들어간 권역) */
export function dayCursor(stops, byId, win) {
  const items = real(stops).filter((s) => s.place_id).map((s) => byId.get(s.place_id)).filter(Boolean);
  const lastStop = stops.at(-1);
  return { place: items.filter((p) => p.lat != null).at(-1) || null, t: lastStop ? Math.max(toMin(lastStop.end_time), win.start) : win.start, count: placeCount(stops), items, empty: !stops.length };
}

/** 장소 한 곳을 이 커서 뒤에 넣을 때: 도착/종료 시각 · 가능 여부 */
function fit(p, cur, win, kids) {
  const tr = cur.place && p.lat != null ? travel(cur.place, p, kids).min : cur.place ? 20 : 0;
  const o = openRange(p), arr = Math.max(cur.t + tr, o[0]);
  const end = arr + p.stay_min;
  if (p.dayTrip) return cur.empty && p.stay_min + p.tripMin * 2 <= win.min ? { arr, end, ok: true } : { ok: false };
  return { arr, end, ok: end <= Math.min(o[1], win.end) };
}

/**
 * 규칙 추천. 큐레이션 DB는 '추천'일 뿐 — 무엇을 넣을지는 사용자 자유.
 * ctx: { stops, win, usedIds:Set, base:{lat,lng}|null, types, kids, pace, kind: 'all'|'sight'|'food'|'shop' }
 */
// 추천 사유 문구 풀: 장소 데이터(권역·태그·거리·영업·도착시각·lead)에서 뽑고, id 해시로 골라 같은 문구 반복을 줄인다.
const strHash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };
export function pickPhrases(p, d, arr) {
  const pool = [];
  if (p.area) { pool.push(`${p.area} 안에서 동선이 자연스러워요`); pool.push(`${p.area} 코스로 묶기 좋아요`); }
  const tags = (p.tagList || []).filter((t) => !['관광', '미식', '역사', '휴양'].includes(t));
  if (tags[0]) pool.push(`${tags[0]} 쪽으로 알려져 있어요`);
  if (d != null) pool.push(d < 1 ? '걸어서 갈 만한 거리예요' : d < 3 ? '차로 금방 가요' : '이동이 조금 있어요');
  pool.push(arr < 720 ? '아침 일찍 들르면 한적해요' : arr < 1020 ? '낮 시간에 잘 어울려요' : arr < 1140 ? '점심 뒤에 들르기 좋아요' : '저녁 코스로 이어가기 좋아요');
  if (p.lead) pool.push(p.lead.split(/[.。]/)[0].slice(0, 30));
  if (!pool.length) return [];
  const i = strHash(p.id) % pool.length;
  return [pool[i], pool[(i + 3) % pool.length]].filter((x, k, a) => a.indexOf(x) === k);
}

export function recommend(places, byId, ctx) {
  const { win, usedIds = new Set(), types = [], kids = 0, pace = 'normal', kind = 'all', base = null, limit = 8, sort = 'score' } = ctx;
  const cur = ctx.cursor || dayCursor(ctx.stops || [], byId, win);
  if (win.min <= 0 || cur.count >= paceMax(pace, kids) + 1) return [];
  const anchor = cur.place || base;
  const areas = new Set(cur.items.map((p) => p.area));
  const res = [];
  for (const p of places) {
    if (usedIds.has(p.id)) continue;
    if (kind === 'all' ? p.kind === 'food' : p.kind !== kind) continue;
    const f = fit(p, cur, win, kids); if (!f.ok) continue;
    const reasons = []; let s = score(p, { types, kids }), d = null, tr = null;
    if (areas.has(p.area)) { s += 8; reasons.push(`오늘 동선과 같은 권역(${p.area})`); }
    if (anchor && p.lat != null) { d = km(anchor, p); tr = travel(anchor, p, kids); s += Math.max(0, 10 - d * 1.2); if (d < 2) reasons.push(cur.place ? '바로 근처' : '출발 지점에서 가까워요'); }
    // 장소 데이터에서 뽑은 문구 — 같은 템플릿 반복을 줄인다 (대표 피드백 3)
    const liked = (p.tagList || []).filter((t) => types.includes(t));
    if (liked.length) reasons.push(`${liked.slice(0, 2).join('·')} 취향`);
    if (p.mustScore >= 2) reasons.push('필수 코스');
    if (p.night) reasons.push('야경 시간대');
    if (kind === 'food' && p.meal) { s += (p.meal === 'lunch') === (f.arr < 840) ? 6 : 0; reasons.push(p.meal === 'lunch' ? '점심 추천' : '저녁 추천'); }
    if (p.open) reasons.push(`영업 ${p.open[0]}–${p.open[1]}`); // 데이터 기반: 영업시간 경계
    if (p.price_hint) reasons.push(String(p.price_hint)); // 가격대가 있으면 사실 그대로
    const extras = pickPhrases(p, d, f.arr);
    reasons.push(...extras.slice(0, 2));
    reasons.push(`${fromMin(f.arr)} 도착 · 체류 ${fmtDur(p.stay_min)}`);
    res.push({ place: p, score: s, reasons, at: f.arr, km: d, moveMin: tr?.min ?? null, moveMode: tr?.mode ?? null });
  }
  // sort='near': 영업 가능한 곳 중 가까운 순 (fit 이 영업시간을 이미 걸렀다)
  res.sort(sort === 'near' ? (a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) || b.score - a.score : (a, b) => b.score - a.score);
  return res.slice(0, limit);
}

/** 출발 지점(좌표): 숙소 권역 중심, 없으면 도착 공항 */
export function tripBase(trip, places) {
  const area = trip.lodging?.area;
  const ps = area ? places.filter((p) => p.area === area && p.lat != null) : [];
  if (ps.length) return { lat: ps.reduce((a, p) => a + p.lat, 0) / ps.length, lng: ps.reduce((a, p) => a + p.lng, 0) / ps.length, label: `${area}(숙소)` };
  const ap = AIRPORTS[trip.arrive.airport] || AIRPORTS.PVG;
  return { lat: ap.lat, lng: ap.lng, label: ap.name };
}

/** 도착 직후 첫 식사 제안: 가용 시작 시각 기준 점심/저녁, 숙소(또는 공항) 가까운 순 */
export function firstMeal(places, trip, win) {
  const base = tripBase(trip, places), t = win.start;
  if (t >= 1260) { // 늦은 도착: 늦게까지 여는 식당(야식)을 가까운 순으로. 후보가 없으면 가까운 식당
    const foods = places.filter((p) => p.kind === 'food' && p.lat != null);
    const late = foods.filter((p) => p.open && toMin(p.open[1]) >= 1320 || p.open?.[1] === '24:00');
    const pool = (late.length ? late : foods).map((p) => ({ place: p, km: km(base, p) })).sort((a, b) => a.km - b.km).slice(0, 3);
    return { late: true, slot: 'late', at: t, base, items: pool, text: `${fromMin(t)} 이후라 식당 대부분이 닫아요. ${late.length ? '늦게까지 여는 곳' : '가까운 식당'}을 골랐어요 — 영업시간은 꼭 확인하세요.` };
  }
  const slot = t < 870 ? 'lunch' : 'dinner';
  const foods = places.filter((p) => p.kind === 'food').map((p) => ({ place: p, d: km(base, p), pen: p.meal === slot ? 0 : 3 })).sort((a, b) => a.d + a.pen - (b.d + b.pen)).slice(0, 3);
  return { late: false, slot, at: t, base, items: foods.map((f) => ({ place: f.place, km: f.d })), text: `${fromMin(t)}쯤 첫 ${slot === 'lunch' ? '점심' : '저녁'}, ${base.label} 근처부터 가까운 순이에요.` };
}

/**
 * 이 날 자동 채우기. 빈 날이면 새로 구성(식사 포함), 이미 일정이 있으면 뒤에 이어 붙임.
 * 반환: 새 stops (호출자가 day.stops 에 대입)
 */
export function fillDay(places, byId, { stops = [], win, usedIds = new Set(), types = [], kids = 0, pace = 'normal', base = null }) {
  const max = paceMax(pace, kids), used = new Set(usedIds), cap = win.min * PACE_CAP;
  let cur = dayCursor(stops, byId, win);
  // 빈 날은 식사 블록(win.meal)을 따로 확보하므로 관광 창을 그만큼 줄여 후보를 고른다
  const budgetWin = { ...win, end: win.end - (cur.empty ? win.meal : 0) };
  const spent = (list) => list.filter((s) => s.type !== 'meal').reduce((a, s) => a + dur(s), 0);
  let net = spent(stops);
  const picked = [];
  while (cur.count + picked.length < max) {
    const cands = recommend(places, byId, { win: budgetWin, usedIds: used, types, kids, pace, base, cursor: { ...cur, count: cur.count + picked.length }, limit: 12 });
    const r = cands.find((c) => c.place.dayTrip ? c.place.stay_min + c.place.tripMin * 2 <= cap : net + (c.at + c.place.stay_min - cur.t) <= cap + 0.001);
    if (!r) break;
    net += r.at + r.place.stay_min - cur.t;
    picked.push(r.place); used.add(r.place.id);
    cur = { ...cur, place: r.place.lat != null ? r.place : cur.place, t: r.at + r.place.stay_min, empty: false };
  }
  if (!stops.length) {
    if (!picked.length) return [];
    const foods = places.filter((p) => p.kind === 'food' && !used.has(p.id));
    const near = (slot) => foods.filter((f) => f.meal === slot).sort((a, b) => km(picked[0], a) - km(picked[0], b))[0];
    const meals = { lunch: near('lunch'), dinner: near('dinner') };
    const mk = (list) => buildTimeline(win.day_no, orderDay(list, kids, win.start), meals, kids, win.start);
    // 근교 당일치기: 현지 식사, 왕복 이동 블록만 (식당 목록으로 이어붙이면 장거리 '이동'이 생긴다)
    if (picked.length === 1 && picked[0].dayTrip) {
      const p = picked[0], s0 = Math.max(win.start + p.tripMin, openRange(p)[0]), e0 = s0 + p.stay_min;
      return [
        { type: 'move', label: '상하이 → ' + p.name_ko, start_time: fromMin(s0 - p.tripMin), end_time: fromMin(s0), note: '근교 이동' },
        { type: 'place', place_id: p.id, label: p.name_ko, start_time: fromMin(s0), end_time: fromMin(e0), note: '점심은 현지에서' },
        { type: 'move', label: p.name_ko + ' → 상하이', start_time: fromMin(e0), end_time: fromMin(e0 + p.tripMin), note: '근교 이동' },
      ].map((x, k) => ({ id: rid(), day_no: win.day_no, order: k + 1, ...x }));
    }
    const list = [...picked]; let out = mk(list);
    // 이동·대기가 늘어 한도를 넘으면 마지막에 고른 곳부터 뺀다
    while (list.length && (toMin(out.at(-1).end_time) > win.end || spent(out) > cap + 0.001) && !(list.length === 1 && list[0].dayTrip)) { list.pop(); out = mk(list); }
    return list.length ? out : [];
  }
  const out = stops.slice(); let t = toMin(stops.at(-1).end_time), prev = dayCursor(stops, byId, win).place;
  for (const p of picked) {
    const tr = prev && p.lat != null ? travel(prev, p, kids).min : 0;
    if (tr) { out.push({ id: rid(), day_no: win.day_no, type: 'move', label: '이동', start_time: fromMin(t), end_time: fromMin(t + tr), note: null }); t += tr; }
    const s0 = Math.max(t, openRange(p)[0]);
    out.push({ id: rid(), day_no: win.day_no, type: 'place', place_id: p.id, label: p.name_ko, start_time: fromMin(s0), end_time: fromMin(s0 + p.stay_min), note: null });
    t = s0 + p.stay_min; if (p.lat != null) prev = p;
  }
  return out.map((s, i) => ({ ...s, order: i + 1 }));
}

/** 장소 한 곳을 하루 끝에 추가 (직접 고르기 / 직접 입력 공통) */
export function appendPlace(stops, place, win, type = 'place', startAt = null) {
  const last = stops.at(-1), t0 = last ? toMin(last.end_time) : win.start, t = startAt ? Math.max(t0, toMin(startAt)) : t0;
  const s = { id: rid(), day_no: win.day_no, order: stops.length + 1, type, place_id: place.id, label: place.name_ko, start_time: fromMin(t), end_time: fromMin(t + place.stay_min), note: place.custom ? (place.note || '직접 추가') : null };
  if (startAt) s.pinned = true; // 사용자가 정한 시작 시각은 재계산해도 앞당기지 않는다
  return [...stops, s];
}
