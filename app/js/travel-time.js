// 이동시간 공급자 교체 지점. 인터페이스·구현체는 sources/travel.js
import { setTravelImpl } from './scheduler.js';
import { EstimateTravel } from './sources/travel.js';
export let travelTime = EstimateTravel;
export const setTravelTimeProvider = (p) => {
  travelTime = p;
  setTravelImpl((a, b, kids) => { const r = p.estimate(a, b, 'auto', { kids }); return { min: r.minutes, mode: r.mode, km: r.km, unknown: r.unknown }; });
};
