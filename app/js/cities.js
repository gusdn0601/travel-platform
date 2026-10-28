// 일정 만들기에서 고를 수 있는 도시 — data/cities/<dir>/ 를 읽는다.
// 홈(둘러보기)의 도시 순서와 같게 유지한다 (app/browse.js CITY_ORDER).
export const CITIES = {
  'CN-SHA': { id: 'CN-SHA', country: 'CN', countryLabel: '중국', name: '상하이', dir: 'shanghai', airports: ['PVG', 'SHA'], defaultAirport: 'PVG', routeMap: true },
  'JP-OSA': { id: 'JP-OSA', country: 'JP', countryLabel: '일본', name: '오사카', dir: 'osaka', airports: ['KIX', 'ITM'], defaultAirport: 'KIX' },
  'JP-KYO': { id: 'JP-KYO', country: 'JP', countryLabel: '일본', name: '교토', dir: 'kyoto', airports: ['KIX', 'ITM'], defaultAirport: 'KIX' },
  'JP-NAR': { id: 'JP-NAR', country: 'JP', countryLabel: '일본', name: '나라', dir: 'nara', airports: ['KIX', 'ITM'], defaultAirport: 'KIX' },
  'JP-FUK': { id: 'JP-FUK', country: 'JP', countryLabel: '일본', name: '후쿠오카', dir: 'fukuoka', airports: ['FUK'], defaultAirport: 'FUK' },
};
export const CITY_ORDER = ['CN-SHA', 'JP-OSA', 'JP-KYO', 'JP-NAR', 'JP-FUK'];
export const DEFAULT_CITY = 'CN-SHA';
export const cityDef = (id) => CITIES[id] || CITIES[DEFAULT_CITY];
/** 앱(app/index.html)에서 도시 데이터를 읽는 상대 경로 */
export const cityDir = (id) => `../data/cities/${cityDef(id).dir}/`;
