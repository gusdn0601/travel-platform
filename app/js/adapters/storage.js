// 저장소 어댑터: localStorage 구현. 서버 연동 시 동일 인터페이스(load/save)로 교체.
const KEY = 'tp.trips.v1';
let mem = null;
export const storage = {
  load() { try { return JSON.parse(localStorage.getItem(KEY)) || { trips: [] }; } catch { return mem || { trips: [] }; } },
  save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { mem = db; } },
};
