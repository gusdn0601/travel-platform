// 하루 일정 편집 조작 (순수 함수). stops 배열을 받아 새 배열을 돌려주며, 이동 블록·시각은 reflowDay 가 다시 맞춘다.
import { reflowDay, toMin, fromMin } from './scheduler.js';

const places = (stops) => stops.filter((s) => s.type !== 'move');
const re = (list, byId, kids) => reflowDay(list, byId, kids);
const sid = () => 's_' + Math.random().toString(36).slice(2, 8);
const dur = (s) => toMin(s.end_time) - toMin(s.start_time);

export const deleteStop = (stops, id, byId, kids = 0) => re(places(stops).filter((s) => s.id !== id), byId, kids);

/** 위(-1)/아래(+1)로 한 칸. 길이는 유지하고 시작 시각만 앞에서부터 다시 채운다 */
export function moveStop(stops, id, dir, byId, kids = 0) {
  const arr = places(stops).map((s) => ({ ...s })), i = arr.findIndex((s) => s.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return stops;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  let t = toMin(places(stops)[0].start_time);
  for (const x of arr) { const d = dur(x); x.start_time = fromMin(t); x.end_time = fromMin(t + d); t += d; }
  return re(arr, byId, kids);
}

/** 체류시간 ±분 (최소 15분) */
export function shiftStay(stops, id, delta, byId, kids = 0) {
  const arr = places(stops).map((s) => (s.id === id ? { ...s, end_time: fromMin(toMin(s.start_time) + Math.max(15, dur(s) + delta)) } : { ...s }));
  // 바뀐 일정 뒤의 일정은 이어 붙인다
  const k = arr.findIndex((x) => x.id === id);
  let t = k < 0 ? null : toMin(arr[k].end_time);
  for (const x of arr.slice(k + 1)) { const d = dur(x); x.start_time = fromMin(t); x.end_time = fromMin(t + d); t += d; }
  return re(arr, byId, kids);
}

/** 시작 시각 수정 (체류시간 유지) */
export function setStart(stops, id, hhmm, byId, kids = 0) {
  const arr = places(stops).map((s) => (s.id === id ? { ...s, start_time: hhmm, end_time: fromMin(toMin(hhmm) + dur(s)), pinned: true } : { ...s }));
  return re(arr, byId, kids);
}

export const setNote = (stops, id, note) => stops.map((s) => (s.id === id ? { ...s, note: note.trim() || null } : s));

/** 다른 일자로 이동: [남은 from 목록, 늘어난 to 목록] */
export function moveToDay(fromStops, toStops, id, toWinStart, byId, kids = 0) {
  const s = places(fromStops).find((x) => x.id === id); if (!s) return [fromStops, toStops];
  const base = places(toStops), t0 = base.length ? toMin(base.at(-1).end_time) : toWinStart, d = dur(s);
  const moved = { ...s, id: sid(), start_time: fromMin(t0), end_time: fromMin(t0 + d) };
  return [deleteStop(fromStops, id, byId, kids), re([...base, moved], byId, kids)];
}
