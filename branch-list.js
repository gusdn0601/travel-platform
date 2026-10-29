// 체인·다지점 장소의 지점 목록 렌더 — DOM 없이 문자열만 만드는 순수 함수(테스트: tests/maps-link.test.mjs).
// 원칙: 데이터(branches[])에 출처와 함께 들어온 지점만 그린다. 5곳까지 펼치고 나머지는 '더 보기'.
// 지점마다 별도 지도 링크를 둔다 — 고덕 marker 는 coordinate=wgs84(maps-link.js).
import { amapBranchUrl, gmapUrl } from './maps-link.js';

export const BRANCH_TOP = 5;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// OSM 영업시간 표기(Mo-Su 07:30-19:30)를 읽기 쉽게만 바꾼다 — 값 자체는 손대지 않는다.
const hoursText = (h) => String(h).replace(/^Mo-Su\s+/, '매일 ');

export function branchItem(b, p, cityLocal, isCN) {
  const href = isCN ? amapBranchUrl(b, p, cityLocal) : gmapUrl(b, cityLocal);
  // 지점명이 장소 이름과 같으면 이름을 되풀이하지 않고 주소를 앞세운다(같은 이름 8줄 방지).
  const showName = !!b.name_local && b.name_local !== ((p && p.name_local) || '');
  const main = showName ? b.name_local : b.addr_local || b.name_local;
  const sub = showName ? b.addr_local : '';
  return `<li class="bri"><div class="brt"><b>${esc(main)}</b>${b.hours ? `<span class="brh">${esc(hoursText(b.hours))}</span>` : ''}</div>
      ${sub ? `<p class="bra">${esc(sub)}</p>` : ''}
      <a class="brl" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(b.name_local)} ${esc(b.addr_local || '')} 지도">${isCN ? '암맵' : '지도'} ↗</a></li>`;
}

export function branchesHtml(p, cityLocal = '', isCN = false) {
  const list = (Array.isArray(p && p.branches) ? p.branches : []).filter((b) => b && b.name_local);
  if (!list.length) return '';
  const top = list.slice(0, BRANCH_TOP);
  const rest = list.slice(BRANCH_TOP);
  const ul = (rows) => `<ul class="brlist">${rows.map((b) => branchItem(b, p, cityLocal, isCN)).join('')}</ul>`;
  return `<h2 class="sec">지점 <small>${list.length}곳</small></h2>
    <div class="card-blk">${ul(top)}
    ${rest.length ? `<details class="adv"><summary>지점 ${rest.length}곳 더 보기</summary><div class="in">${ul(rest)}</div></details>` : ''}</div>`;
}
