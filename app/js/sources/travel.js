// 이동시간 인터페이스 (TravelTime):  estimate(from, to, mode='auto', opts={kids}) -> { minutes, mode, source, km }
import { approxTravel } from '../scheduler.js';
import { SourceError } from './base.js';

/** 직선거리 기반 추정 (키 불필요, 기본값) */
export const EstimateTravel = {
  name: 'estimate',
  estimate(from, to, mode = 'auto', opts = {}) {
    const r = approxTravel(from, to, opts.kids || 0);
    return { minutes: r.min, mode: r.mode, source: 'estimate', km: r.km, unknown: !!r.unknown };
  },
};
/** 구글 Routes 자리표시: 키가 없으면 'unavailable' */
export class RoutesTravel {
  constructor({ apiKey = null } = {}) { this.name = 'google-routes'; this.apiKey = apiKey; }
  estimate() { throw new SourceError('unavailable', '구글 Routes 연동 전이에요'); }
}
