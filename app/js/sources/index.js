// 구현체: LocalCuratedSource(내장 DB) · ManualSource(직접 입력). 인터페이스는 base.js, 외부 소스는 google.js
import { normalizePlace } from './model.js';
import { PlaceSource } from './base.js';
export { PlaceSource, SourceError, searchAll, validatePlace } from './base.js';
export { GoogleSource as RemotePlaceSource } from './google.js';

const rad = (x) => x * Math.PI / 180;
const distKm = (a, b) => { if (b.lat == null) return 1e9; const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

/** 현재 큐레이션 DB (data/cities/*) */
export class LocalCuratedSource extends PlaceSource {
  constructor(places) { super('local'); this.places = places; }
  async search(query = '', { bias = null, limit = 50 } = {}) {
    const q = query.trim().toLowerCase();
    const label = { sight: '명소 관광', food: '맛집 식당', shop: '쇼핑 카페' };
    const hit = this.places.filter((p) => !q || [p.name_ko, p.name_local, p.area, label[p.kind], ...(p.tagList || [])].some((s) => String(s || '').toLowerCase().includes(q)));
    if (bias) hit.sort((a, b) => distKm(bias, a) - distKm(bias, b));
    return hit.slice(0, limit);
  }
  async details(id) { return this.places.find((p) => p.id === id) || null; }
  async nearby(point, radiusKm = 3) { return this.places.filter((p) => p.lat != null && distKm(point, p) <= radiusKm).sort((a, b) => distKm(point, a) - distKm(point, b)); }
}

/** 사용자가 직접 입력한 장소 (DB에 없는 곳). trip.custom_places 에 저장 */
export class ManualSource extends PlaceSource {
  constructor(list = []) { super('manual'); this.list = list; }
  create({ name, area, stay_min, note }) {
    const p = normalizePlace({ id: 'cp_' + Math.random().toString(36).slice(2, 9), name_ko: name.trim(), area: area || '기타', stay_min: Math.max(15, +stay_min || 60), stay_user_edited: true, note: note || '', kind: 'sight', custom: true, code: 'custom' }, { provider: 'manual' });
    this.list.push(p); return p;
  }
  async search(query = '') { const q = query.trim().toLowerCase(); return this.list.filter((p) => !q || p.name_ko.toLowerCase().includes(q)); }
  async details(id) { return this.list.find((p) => p.id === id) || null; }
  async nearby() { return []; }
}
