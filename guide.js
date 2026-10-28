// 도시 가이드(숙박·교통) 카드 렌더 — DOM 없이 문자열만 만드는 순수 함수 모음.
// 데이터: data/cities/<도시>/guide-lodging.json · guide-transit.json (build-site 가 browse-index 에 넣는다)
// 원칙: 한 구역/노선당 핵심 3~4줄만 보이고, 장단점·안전·소음·출처는 '접기(details)' 안에 둔다.

export const LODGING_TYPES = [
  { id: 'all', label: '전체' },
  { id: 'family', label: '가족' },
  { id: 'couple', label: '커플' },
  { id: 'solo', label: '혼자·배낭' },
  { id: 'luxury', label: '럭셔리' },
  { id: 'budget', label: '가성비' },
  { id: 'shopping', label: '쇼핑' },
  { id: 'nightview', label: '야경·관광' },
];
export const TYPE_LABEL = Object.fromEntries(LODGING_TYPES.filter((t) => t.id !== 'all').map((t) => [t.id, t.label]));
export const PRICE_BAND = { 저: '저가', 중저: '중저가', 중: '중가', 중고: '중고가', 고: '고가' };
const COLOR_HEX = {
  빨강: '#d63b3b', 주황: '#e07a1f', 노랑: '#d9ad00', 초록: '#2f8a4e', 하늘: '#3aa0c9',
  파랑: '#2f5fb3', 남색: '#28387d', 보라: '#7a4bb5', 분홍: '#d4558f', 갈색: '#8a5a34', 회색: '#7b8188',
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = (a) => (Array.isArray(a) ? a.filter((x) => x != null && x !== '') : []);

/** 여행자 유형 칩 — 누르면 data-gtype 값으로 걸러진다. */
export function chipsHtml(active = 'all') {
  return `${LODGING_TYPES.map((t) => `<button class="chip${t.id === active ? ' on' : ''}" type="button" data-gtype="${esc(t.id)}" aria-pressed="${t.id === active}">${esc(t.label)}</button>`).join('')}`;
}

/** 유형 필터 — 모르는 유형이면 전체를 돌려준다(빈 화면 방지). */
export function filterAreas(doc, type = 'all') {
  const areas = list(doc && doc.areas);
  if (!type || type === 'all') return areas;
  const hit = areas.filter((a) => list(a.fit).includes(type));
  return hit.length ? hit : areas;
}

const fitLine = (a) => list(a.fit).map((t) => TYPE_LABEL[t] || t).join('·');

function srcLink(url, label = '출처') {
  return url ? `<a class="gsrc" href="${esc(url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(label)}</a>` : '';
}

function examplesHtml(a) {
  const ex = list(a.examples);
  if (!ex.length) return '';
  return `<p class="gmeta"><b>예시 숙소</b>${ex.map((e) => `${esc(e.name)}${e.note ? `<span class="muted"> (${esc(e.note)})</span>` : ''}`).join(' · ')}</p>`;
}

function areaHtml(a) {
  return `<article class="lgcard" id="${esc(a.id)}">
    <div class="lgh"><h3>${esc(a.name_ko)}${a.name_local ? ` <span class="lgloc">${esc(a.name_local)}</span>` : ''}</h3>
      <span class="lgprice pb-${esc(a.price_band)}" title="가격대(대략)">${esc(PRICE_BAND[a.price_band] || a.price_band)}</span></div>
    <p class="lgsum">${esc(a.summary)}</p>
    <p class="lgfit">${esc(fitLine(a))} · ${esc(a.price_krw)}</p>
    <p class="lgr">${esc(a.access)}<br>${esc(a.from_airport)}</p>
    <details class="lgdet">
      <summary>장단점·안전·소음${list(a.examples).length ? '·예시' : ''}${a.unverified === false ? '' : ' <span class="badge warnb">미검증</span>'}</summary>
      <ul class="lgpro">${list(a.pros).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <ul class="lgcon">${list(a.cons).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="gmeta"><b>안전</b>${esc(a.safety)}</p>
      <p class="gmeta"><b>소음</b>${esc(a.noise)}</p>
      ${examplesHtml(a)}
      ${srcLink(a.source_url)}
    </details>
  </article>`;
}

/** 숙박 가이드 본문. type='all' 이거나 맞는 구역이 없으면 전체 구역을 보여준다. */
export function lodgingHtml(doc, type = 'all') {
  if (!doc || !list(doc.areas).length) return '<p class="empty">숙박 가이드가 아직 없어요.</p>';
  const areas = filterAreas(doc, type);
  return `<div class="gnote">구역별 대략 가격입니다. 실제 요금·예약 정보가 아니며, 출처는 공식 관광 페이지입니다.</div>
    <div class="lgcards">${areas.map(areaHtml).join('')}</div>`;
}

function lineHtml(l) {
  const c = COLOR_HEX[l.color_name] || COLOR_HEX.회색;
  const stops = list(l.stops).join(' · ');
  const sights = list(l.sights);
  return `<article class="txline" id="${esc(l.id)}">
    <div class="txh"><span class="txbadge" style="--c:${c}" aria-hidden="true">${esc(l.code)}</span>
      <b>${esc(l.name_ko)}</b><span class="txop">${esc(l.operator)}</span>
      ${srcLink(l.source_url, '출처')}</div>
    <p class="txstops">${esc(stops)}</p>
    <p class="txsum">${esc(l.summary)}${sights.length ? ` <span class="muted">· ${esc(sights.join(' · '))}</span>` : ''}</p>
  </article>`;
}

function airportHtml(rows) {
  return list(rows).map((r) => `<article class="txrow">
    <div class="txt"><b>${esc(r.mode)}</b><span class="txcost">${esc(r.cost)}</span></div>
    <div class="txmeta">${esc(r.from)} · ${esc(r.time)}</div>
    <div class="txnote">${esc(r.note)}</div>
  </article>`).join('');
}

function passesHtml(rows) {
  const kind = { ic: 'IC', ticket: '권종', app: '앱' };
  return list(rows).map((p) => `<article class="txrow">
    <div class="txt"><b>${esc(p.name)}</b><span class="badge">${esc(kind[p.kind] || p.kind)}</span></div>
    <div class="txmeta">${esc(p.where)} · ${esc(p.use)}</div>
    ${srcLink(p.source_url, '출처')}
  </article>`).join('');
}

/** 교통 가이드 본문 — 노선 / 공항 / 패스 / 막차 / 공식 노선도 순. */
export function transitHtml(doc) {
  if (!doc) return '<p class="empty">교통 가이드가 아직 없어요.</p>';
  const lines = list(doc.lines);
  const modes = list(doc.modes);
  const maps = list(doc.maps);
  return `<div class="gnote">${esc(doc.note || '요금·운행 시간은 변동될 수 있습니다.')}</div>
    <section class="txsec" aria-label="노선">
      <h2 class="txh2">노선 <small>${lines.length}개</small></h2>
      ${lines.map(lineHtml).join('')}
    </section>
    <section class="txsec" aria-label="공항에서 시내로">
      <h2 class="txh2">공항 ↔ 시내</h2>
      ${airportHtml(doc.airport)}
    </section>
    <section class="txsec" aria-label="패스와 IC 카드">
      <h2 class="txh2">패스·IC카드</h2>
      ${passesHtml(doc.passes)}
    </section>
    <section class="txsec" aria-label="막차와 요금">
      <h2 class="txh2">막차·요금 팁</h2>
      <div class="tipbox">${esc((doc.last_train || {}).text || '')}</div>
      ${modes.length ? `<ul class="txmodes">${modes.map((m) => `<li><b>${esc(m.label)}</b> ${esc(m.text)}</li>`).join('')}</ul>` : ''}
      ${(doc.last_train || {}).source_url ? `<p class="gnote">${srcLink(doc.last_train.source_url, '막차 출처')}</p>` : ''}
    </section>
    <section class="txsec" aria-label="공식 노선도">
      <h2 class="txh2">공식 노선도</h2>
      ${maps.map((m) => `<a class="txmap" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(m.label)}</b><span>${esc(m.note || '')}</span><span aria-hidden="true">↗</span></a>`).join('')}
    </section>`;
}

/** 상단 요약 칩(구역 수·미검증 표시) — 접근성 라벨용. */
export function guideSummary(doc, topic) {
  if (!doc) return '';
  const n = topic === 'lodging' ? list(doc.areas).length : list(doc.lines).length;
  const unit = topic === 'lodging' ? '구역' : '노선';
  return `${n}${unit} · 공식 페이지 링크 · <span class="badge warnb">미검증</span>`;
}
