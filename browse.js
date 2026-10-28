// 둘러보기 — 첫 화면: 전체 장소 목록 + 검색. 정적 사이트(site/)에서 상대경로로 동작.
// 데이터: ./data/browse-index.json (build-site.mjs 파생), 상세: ./data/cities/<도시>/places/<코드>.json
const KIND = { sight: '관광', food: '식당', shop: '쇼핑', transit: '교통' };
const KIND_ORDER = ['sight', 'food', 'shop', 'transit'];
const TYPE_LABEL = {
  entry: '입국', visa: '비자·체류', app: '필수 앱', customs: '세관', exchange: '환전·결제',
  sim: 'SIM·인터넷', transport: '교통', power: '전원·콘센트', emergency: '비상연락', exit: '출국',
};
const TYPE_ORDER = ['entry', 'visa', 'app', 'exchange', 'sim', 'transport', 'power', 'customs', 'emergency', 'exit'];
const PAGE = 40;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = (s) => esc(s).replace(/&lt;(\/?)(b|strong|br|span)([^&]*?)&gt;/g, (m, close, tag, attrs) => {
  if (tag === 'br') return '<br>';
  if (tag === 'span') {
    const cls = (/class="?([\w -]+)"?/.exec(attrs) || [])[1] || '';
    return `<span class="${esc(cls.replace(/[^\w -]/g, ''))}">`;
  }
  return `<${close}${tag}>`;
});
const norm = (s) => String(s || '').toLowerCase().normalize('NFKC').replace(/[\s ]+/g, '').replace(/[·・,，.。:;'"“”‘’()（）\[\]{}<>!?~\-_/\\|]/g, '');
const fmtNum = (n) => Number(n || 0).toLocaleString('ko-KR');
const fmtMB = (b) => (b / 1048576).toFixed(b > 10485760 ? 0 : 1);

const state = {
  data: null, countries: null, photos: {}, cityDir: {},
  tab: 'list', city: 'all', kind: 'all', cats: new Set(), q: '', photoOnly: false, verifiedOnly: false,
  sort: 'rec', limit: PAGE, offlineCity: 'CN-SHA', topOnly: false,
};
const els = {};

init();

async function init() {
  els.q = $('#q'); els.cards = $('#cards'); els.count = $('#count'); els.empty = $('#empty');
  els.cityChips = $('#cityChips'); els.kindChips = $('#kindChips'); els.foodChips = $('#foodChips');
  els.catWrap = $('#foodCatWrap'); els.detail = $('#detail'); els.toast = $('#toast');
  els.moreWrap = $('#moreWrap'); els.offlineBtn = $('#offlineBtn');
  setupFont(); setupOfflineBar(); setupSearch();
  try {
    const [idx, countries, photos] = await Promise.all([
      fetch('./data/browse-index.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('index ' + r.status); return r.json(); }),
      fetch('./data/countries.json').then((r) => r.json()).catch(() => []),
      fetch('./data/photos-index.json').then((r) => r.json()).catch(() => ({})),
    ]);
    state.data = idx; state.countries = countries; state.photos = photos;
    for (const c of idx.cities) state.cityDir[c.id] = c.dir;
    renderChips(); renderList();
    route(true);
    setupSW();
  } catch (e) {
    els.cards.innerHTML = `<p class="empty">데이터를 불러오지 못했어요.<br><b>인터넷 연결</b> 후 다시 열어 주세요.<br><span class="muted">${esc(e.message)}</span></p>`;
  }
  window.addEventListener('hashchange', () => route(false));
  window.addEventListener('popstate', () => route(false));
}

/* ---------------- 검색·필터 ---------------- */
function setupSearch() {
  let t = 0;
  els.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); els.q.blur(); } });
  els.q.addEventListener('input', () => {
    $('#clearQ').hidden = !els.q.value;
    clearTimeout(t);
    t = setTimeout(() => { state.q = els.q.value.trim(); state.limit = PAGE; renderList(); }, 90);
  });
  $('#clearQ').addEventListener('click', () => { els.q.value = ''; state.q = ''; $('#clearQ').hidden = true; state.limit = PAGE; renderList(); els.q.focus(); });
  $('#sortBtn').addEventListener('click', () => {
    const order = ['rec', 'name', 'city'];
    const labels = { rec: '추천순', name: '이름순', city: '도시순' };
    state.sort = order[(order.indexOf(state.sort) + 1) % order.length];
    $('#sortBtn').textContent = labels[state.sort];
    renderList();
  });
  els.offlineBtn.addEventListener('click', saveOffline);
  $('#fontBtn').addEventListener('click', cycleFont);
}

// 선택된 필터(도시·종류·토글)를 반영한 개수 — 위에서 도시를 고르면 아래 종류·음식 개수가 따라 바뀐다
function facet(items, { city = true, kind = true } = {}) {
  return items.filter((i) => (!city || state.city === 'all' || i.city === state.city)
    && (!kind || state.kind === 'all' || i.k === state.kind)
    && (!state.photoOnly || i.ph) && (!state.verifiedOnly || i.v) && (!state.topOnly || i.p <= 2));
}

function renderChips() {
  const d = state.data;
  const foodTab = state.tab === 'food';
  const base = facet(foodTab ? d.items.filter((i) => i.k === 'food') : d.items, { city: false, kind: !foodTab });
  const perCity = {};
  for (const i of base) perCity[i.city] = (perCity[i.city] || 0) + 1;
  const cityChips = [{ id: 'all', name: '전체', count: base.length }, ...d.cities.map((c) => ({ id: c.id, name: c.name, count: perCity[c.id] || 0 }))];
  els.cityChips.innerHTML = '<span class="rowlab">도시</span>' + cityChips.map((c) => `<button class="chip${state.city === c.id ? ' on' : ''}" data-city="${esc(c.id)}" aria-pressed="${state.city === c.id}">${esc(c.name)} <span class="n">${c.count}</span></button>`).join('');
  const kindBase = facet(d.items, { kind: false });
  const perKind = {};
  for (const i of kindBase) perKind[i.k] = (perKind[i.k] || 0) + 1;
  const kindChips = [{ id: 'all', name: '전체', count: kindBase.length }, ...KIND_ORDER.map((k) => ({ id: k, name: KIND[k], count: perKind[k] || 0 }))];
  const toggles = `<button class="chip${state.photoOnly ? ' on' : ''}" data-photo="1" aria-pressed="${state.photoOnly}">사진 있음</button>` +
    `<button class="chip${state.verifiedOnly ? ' on' : ''}" data-verified="1" aria-pressed="${state.verifiedOnly}">검증됨</button>` +
    `<button class="chip${state.topOnly ? ' on' : ''}" data-top="1" aria-pressed="${state.topOnly}">우선순위 1~2</button>`;
  els.kindChips.innerHTML = foodTab
    ? `<span class="rowlab">필터</span>${toggles}`
    : '<span class="rowlab">종류</span>' + kindChips.map((c) => `<button class="chip${state.kind === c.id ? ' on' : ''}" data-kind="${c.id}" aria-pressed="${state.kind === c.id}">${esc(c.name)} <span class="n">${c.count}</span></button>`).join('') + toggles;
  els.cityChips.onclick = (e) => {
    const b = e.target.closest('[data-city]'); if (!b) return;
    state.city = b.dataset.city; state.limit = PAGE; renderChips(); renderList();
  };
  els.kindChips.onclick = (e) => {
    const top = e.target.closest('[data-top]');
    if (top) { state.topOnly = !state.topOnly; state.limit = PAGE; renderChips(); renderList(); return; }
    if (e.target.closest('[data-photo]')) { state.photoOnly = !state.photoOnly; state.limit = PAGE; renderChips(); renderList(); return; }
    if (e.target.closest('[data-verified]')) { state.verifiedOnly = !state.verifiedOnly; state.limit = PAGE; renderChips(); renderList(); return; }
    const b = e.target.closest('[data-kind]'); if (!b) return;
    state.kind = b.dataset.kind; state.limit = PAGE; renderChips(); renderList();
  };
}

function renderFoodChips() {
  const show = state.tab === 'food' || (state.kind === 'food' && state.tab === 'list');
  els.catWrap.hidden = !show;
  if (!show) return;
  const foods = facet(state.data.items.filter((i) => i.k === 'food'), { kind: false });
  const perCat = {};
  for (const i of foods) for (const c of i.fc || []) perCat[c] = (perCat[c] || 0) + 1;
  const cats = state.data.categories.map((c) => ({ ...c, count: perCat[c.id] || 0 })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
  const total = foods.length;
  els.foodChips.innerHTML = `<button class="chip${state.cats.size ? '' : ' on'}" data-cat="" aria-pressed="${!state.cats.size}">전체 <span class="n">${total}</span></button>` +
    cats.map((c) => `<button class="chip${state.cats.has(c.id) ? ' on' : ''}" data-cat="${esc(c.id)}" aria-pressed="${state.cats.has(c.id)}">${esc(c.label)} <span class="n">${c.count}</span></button>`).join('');
  els.foodChips.onclick = (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    const id = b.dataset.cat;
    if (!id) state.cats.clear();
    else if (state.cats.has(id)) state.cats.delete(id); else state.cats.add(id);
    state.limit = PAGE; renderFoodChips(); renderList();
  };
}

function matchedCategories(q) {
  const nq = norm(q); if (!nq) return [];
  return state.data.categories.filter((c) => c.aliases.some((a) => norm(a).includes(nq) || nq.includes(norm(a)) && norm(a).length >= 2) || norm(c.label) === nq);
}

function filtered() {
  const q = state.q.trim();
  const terms = q ? q.split(/\s+/).map(norm).filter(Boolean) : [];
  const foodTab = state.tab === 'food';
  const catCat = new Set(state.cats);
  // 검색어가 음식 카테고리와 정확히 맞으면 그 카테고리도 후보에 넣는다(예: 꿔바로우·소룡포·라멘)
  for (const c of matchedCategories(q)) catCat.add(c.id);
  const out = state.data.items.filter((i) => {
    if (foodTab && i.k !== 'food') return false;
    if (state.city !== 'all' && i.city !== state.city) return false;
    if (state.kind !== 'all' && i.k !== state.kind) return false;
    if (state.photoOnly && !i.ph) return false;
    if (state.verifiedOnly && !i.v) return false;
    if (state.topOnly && !(i.p <= 2)) return false;
    if (catCat.size && i.k === 'food' && !i.fc.some((c) => catCat.has(c))) return false;
    if (catCat.size && i.k !== 'food' && !foodTab) {
      // 음식 카테고리를 골랐는데 비-식당이면 식당만 보여 준다
      return false;
    }
    if (terms.length && !terms.every((t) => i.s2.includes(t))) return false;
    return true;
  });
  // 검색어가 있으면 제목 유사도(완전일치 > 앞부분 일치 > 제목 포함 > 본문만 일치)를 먼저, 그다음 정렬 기준
  const qn = terms.join('');
  const rel = (i) => { if (!qn) return 0; const n = norm(i.n); return n === qn ? 0 : n.startsWith(qn) ? 1 : terms.every((t) => n.includes(t)) ? 2 : 3; };
  const cmp = {
    rec: (a, b) => (rel(a) - rel(b)) || (a.p - b.p) || (a.co - b.co) || a.n.localeCompare(b.n, 'ko'),
    name: (a, b) => (rel(a) - rel(b)) || a.n.localeCompare(b.n, 'ko'),
    city: (a, b) => (a.co - b.co) || (a.p - b.p) || a.n.localeCompare(b.n, 'ko'),
  }[state.sort];
  return out.sort(cmp);
}

function renderList() {
  if (!state.data) return;
  renderFoodChips();
  const list = filtered();
  const shown = list.slice(0, state.limit);
  els.count.innerHTML = `<b>${fmtNum(list.length)}</b>곳${state.q ? ` · ‘${esc(state.q)}’` : ''}`;
  els.empty.hidden = list.length > 0;
  if (!list.length) {
    const cats = matchedCategories(state.q).filter((c) => !c.count);
    els.empty.innerHTML = state.q
      ? `‘${esc(state.q)}’ 에 맞는 장소가 없어요.${cats.length ? `<br>‘<b>${esc(cats[0].label)}</b>’ 카테고리 식당은 아직 수집되지 않았습니다.<br><span class="muted">데이터가 늘면 다시 빌드해 목록이 채워집니다.</span>` : ''}<br><span class="muted">다른 말로 검색해 보세요 (예: 샤오룽바오, 라멘, 성황묘).</span>`
      : '고른 필터에 맞는 장소가 없어요. 필터를 풀어 보세요.';
  }
  const html = shown.map(cardHtml).join('');
  els.cards.innerHTML = html;
  els.moreWrap.hidden = list.length <= state.limit;
  $('#moreBtn').onclick = () => { state.limit += PAGE; renderList(); };
  renderSummary(list);
  updateOfflineLabel();
}

function renderSummary(list) {
  const box = $('#activeInfo');
  const bits = [];
  if (state.q) bits.push(`검색: ${state.q}`);
  if (state.city !== 'all') bits.push(state.data.cities.find((c) => c.id === state.city)?.name || '');
  if (state.kind !== 'all') bits.push(KIND[state.kind]);
  if (state.cats.size) bits.push([...state.cats].map((id) => state.data.categories.find((c) => c.id === id)?.label || id).join('·'));
  if (state.photoOnly) bits.push('사진 있음');
  if (state.verifiedOnly) bits.push('검증됨');
  if (state.topOnly) bits.push('우선순위 1~2');
  box.innerHTML = bits.filter(Boolean).length
    ? `<div class="filtersum" aria-label="적용된 필터">${bits.filter(Boolean).map((b) => `<span class="p">${esc(b)}</span>`).join('')}</div>` : '';
}

function cardHtml(i) {
  const ph = i.t ? `<img src="${esc(i.t)}" alt="" loading="lazy" decoding="async" width="96" height="96">` : `<span>${esc(KIND[i.k] || '')}</span>`;
  const tags = [];
  if (i.p < 90) tags.push(`<span class="badge rec">추천 ${i.p}</span>`);
  tags.push(`<span class="badge ${i.k}">${esc(KIND[i.k] || i.k)}</span>`);
  if (i.v) tags.push('<span class="badge ok">검증</span>');
  if (i.k === 'food' && i.fc.length) for (const c of i.fc.slice(0, 2)) {
    const cat = state.data.categories.find((x) => x.id === c); if (cat && c !== 'other') tags.push(`<span class="badge food">${esc(cat.label)}</span>`);
  }
  if (i.ph > 1) tags.push(`<span class="badge">사진 ${i.ph}</span>`);
  return `<a class="card" href="#/p/${encodeURIComponent(i.c)}" data-code="${esc(i.c)}">
    <span class="thumb">${ph}</span>
    <span class="b">
      <span class="nm">${esc(i.n)}${i.s ? `<span class="sub">${esc(i.s)}</span>` : ''}</span>
      <span class="loc">${esc(i.cn)}${i.a ? ' · ' + esc(i.a) : ''}</span>
      <span class="lead">${esc(i.lead)}</span>
      <span class="tags">${tags.join('')}</span>
    </span></a>`;
}

/* ---------------- 상세 ---------------- */
function route(first = false) {
  const h = location.hash.replace(/^#/, '');
  if (h.startsWith('/p/')) {
    const code = decodeURIComponent(h.slice(3));
    openDetail(code, first);
    return;
  }
  els.detail.hidden = true; document.body.style.overflow = '';
  const tab = h === '/food' ? 'food' : h === '/country' ? 'country' : 'list';
  state.tab = tab;
  document.body.dataset.tab = tab;
  $$('.tab').forEach((a) => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#listView').hidden = tab === 'country';
  $('#countryView').hidden = tab !== 'country';
  if (tab === 'country') renderCountry();
  else { if (tab === 'food' && state.kind !== 'food') state.kind = 'all'; renderChips(); renderList(); }
  window.scrollTo({ top: state.tab === 'list' && first ? 0 : window.scrollY });
}

async function openDetail(code, first) {
  const item = state.data.items.find((i) => i.c === code);
  els.detail.hidden = false;
  if (!item) { els.detail.innerHTML = `<div class="dhead"><button class="back" data-close>← 목록</button><span class="conn">장소를 찾을 수 없음</span></div><p class="empty">장소를 찾을 수 없어요.</p>`; bindDetailClose(); return; }
  const dir = state.cityDir[item.city];
  els.detail.scrollTop = 0;
  els.detail.innerHTML = `<div class="dhead"><button class="back" type="button" data-close>← 목록</button><span class="conn">${esc(item.n)}</span><button class="share" type="button" data-share>공유</button></div>
    <div class="dbody"><div class="dwrap"><p class="muted">불러오는 중…</p></div></div>`;
  bindDetailClose(item);
  try {
    const p = await fetch(`./data/cities/${dir}/places/${encodeURIComponent(code)}.json`).then((r) => { if (!r.ok) throw new Error('상세 ' + r.status); return r.json(); });
    els.detail.innerHTML = `<div class="dhead"><button class="back" type="button" data-close>← 목록</button><span class="conn">${esc(item.n)}</span><button class="share" type="button" data-share>공유</button></div>${detailHtml(p, item)}`;
    bindDetailClose(item);
    const sh = $('[data-share]');
    if (sh) sh.addEventListener('click', () => sharePlace(p));
  } catch (e) {
    els.detail.innerHTML = `<div class="dhead"><button class="back" type="button" data-close>← 목록</button><span class="conn">${esc(item.n)}</span></div><div class="dbody"><p class="empty">상세 정보를 불러오지 못했어요.<br><span class="muted">${esc(e.message)} · 오프라인 저장을 해 두면 열립니다.</span></p></div>`;
    bindDetailClose(item);
  }
}

function bindDetailClose(item) {
  for (const b of $$('[data-close]', els.detail)) b.addEventListener('click', () => {
    if (location.hash.startsWith('#/p/')) history.back(); else location.hash = '#/';
  });
}

function detailHtml(p, item) {
  const photos = state.photos[p.code] || [];
  const hero = photos[0];
  const ver = p.verified_at
    ? { cls: 'ok', text: p.meta && p.meta.verification === 'cross_checked' ? '교차 확인' : '검증됨', title: p.verified_at }
    : { cls: 'warnb', text: '미검증', title: '수집 시점 기준, 공식 확인 전' };
  const catLabels = (p.kind === 'food' ? (item.fc || []) : []).map((id) => state.data.categories.find((c) => c.id === id)).filter((c) => c && c.id !== 'other');
  const facts = [...(p.facts || [])];
  const rows = [];
  if (p.open_hours) rows.push(['영업시간', p.open_hours]);
  if (p.price_hint) rows.push(['가격대', p.price_hint]);
  if (p.stay_min) rows.push(['머무는 시간', `약 ${p.stay_min}분`]);
  if (p.addr_local) rows.push(['주소', p.addr_local]);
  if (item.a) rows.push(['구역', item.a]);
  for (const [k, v] of facts) rows.push([k, v]);

  const mapQ = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : [p.name_local, p.addr_local].filter(Boolean).join(' ');
  const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ || p.name_ko)}`;
  const amap = p.lat != null && p.lng != null
    ? `https://uri.amap.com/marker?position=${p.lng},${p.lat}&name=${encodeURIComponent(p.name_local || p.name_ko)}`
    : `https://uri.amap.com/search?keyword=${encodeURIComponent(p.name_local || p.name_ko)}`;
  const isCN = (state.data.cities.find((c) => c.id === item.city) || {}).country === 'CN';

  const sec = (t, sub = '') => `<h2 class="sec">${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2>`;
  let h = '<div class="dbody">';
  h += hero ? `<img class="hero" src="${esc(hero.f)}" alt="${esc(hero.cap || p.name_ko)}" decoding="async">` : '';
  if (hero && (hero.cap || hero.credit)) h += `<p class="hero-cap">${esc(hero.cap)}${hero.cap && hero.credit ? ' · ' : ''}${esc(hero.credit)}</p>`;
  h += `<div class="dwrap">
    <div class="crumb">${esc(item.cn)}${item.a ? ` · ${esc(item.a)}` : ''} · ${esc(KIND[p.kind] || p.kind)}</div>
    <h1 class="dtitle">${esc(p.name_ko)}</h1>
    ${p.name_sub || p.name_local ? `<p class="dlocal">${esc([p.name_sub, p.name_local].filter(Boolean).join(' · '))}</p>` : ''}
    <div class="badges">
      <span class="badge ${ver.cls}" title="${esc(ver.title)}">${esc(ver.text)}</span>
      <span class="badge ${p.kind}">${esc(KIND[p.kind] || p.kind)}</span>
      ${p.meta && p.meta.priority < 90 ? `<span class="badge rec">추천 ${p.meta.priority}</span>` : ''}
      ${catLabels.slice(0, 4).map((c) => `<span class="badge food">${esc(c.label)}</span>`).join('')}
    </div>
    <p class="lead">${esc(p.lead)}</p>
    <div class="actions">
      <a class="primary" href="${gmap}" target="_blank" rel="noopener">구글 지도</a>
      ${isCN ? `<a href="${amap}" target="_blank" rel="noopener">암맵(高德)</a>` : `<a href="${gmap}" target="_blank" rel="noopener">길찾기</a>`}
    </div>`;

  if (rows.length) h += `<dl class="facts">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${rich(v)}</dd>`).join('')}</dl>`;
  if (p.tip) h += `<div class="tipbox"><b>팁</b> · ${rich(p.tip)}</div>`;

  if (p.order && p.order.length) {
    h += sec('대표 메뉴', p.kind === 'food' ? '주문할 때 보여 주세요' : '');
    h += `<div class="card-blk"><ul class="menu">${p.order.map((o) => `<li>${rich(o)}</li>`).join('')}</ul></div>`;
  }
  if (p.origin && p.origin.length) {
    h += sec('이야기');
    h += `<div class="card-blk">${p.origin.map((t) => `<p>${rich(t)}</p>`).join('')}</div>`;
  }
  if (p.timeline && p.timeline.length) {
    h += sec('타임라인');
    h += `<div class="card-blk"><ul class="tl">${p.timeline.map(([y, t]) => `<li><span class="y">${esc(y)}</span><span>${rich(t)}</span></li>`).join('')}</ul></div>`;
  }
  if (p.course && p.course.points) {
    h += sec('이렇게 즐겨 보세요', p.course.title || '');
    h += `<div class="card-blk">${p.course.intro ? `<p>${rich(p.course.intro)}</p>` : ''}<ol>${p.course.points.map((pt) => `<li><b>${esc(pt.name)}</b> — ${rich(pt.look)}</li>`).join('')}</ol></div>`;
  }
  if (p.details && p.details.length) {
    h += sec('자세히');
    h += `<div class="card-blk">${p.details.map((d) => `<p><b>${esc(d.t)}</b><br>${rich(d.d)}</p>`).join('')}</div>`;
  }
  if (p.practical && p.practical.length) {
    h += sec('실용 정보');
    h += `<div class="card-blk"><ul>${p.practical.map((t) => `<li>${rich(t)}</li>`).join('')}</ul></div>`;
  }
  if (p.kid && ((p.kid.missions || []).length || (p.kid.fun || []).length)) {
    h += `<details class="adv"><summary>아이와 함께</summary><div class="in">${(p.kid.missions || []).map((t) => `<p>☑️ ${rich(t)}</p>`).join('')}${(p.kid.fun || []).map((t) => `<p>🎲 ${rich(t)}</p>`).join('')}</div></details>`;
  }
  if (p.teen && p.teen.length) h += `<details class="adv"><summary>청소년과 함께</summary><div class="in">${p.teen.map((t) => `<p>${rich(t)}</p>`).join('')}</div></details>`;
  if (p.quiz && p.quiz.length) h += `<details class="adv"><summary>퀴즈</summary><div class="in"><ul class="quiz">${p.quiz.map((q) => `<li><div class="q">${rich(q.q)}</div><div class="a">${rich(q.a)}</div></li>`).join('')}</ul></div></details>`;

  if (photos.length > 1) {
    h += sec('사진', `${photos.length}장 · CC 라이선스`);
    h += `<div class="gallery">${photos.map((ph) => `<figure><img src="${esc(ph.f)}" alt="${esc(ph.cap || p.name_ko)}" loading="lazy" decoding="async"><figcaption>${esc(ph.cap || '')}${ph.credit ? `<br>${esc(ph.credit)}` : ''}</figcaption></figure>`).join('')}</div>`;
  }

  h += sec('인기 근거·검증');
  h += `<div class="card-blk">`;
  if (p.meta && p.meta.popularity && p.meta.popularity.note) h += `<p>${esc(p.meta.popularity.note)}</p>`;
  else h += `<p class="muted">인기 근거 메모가 아직 없어요.</p>`;
  h += `<p class="muted">검증: ${p.verified_at ? esc(p.verified_at) + ' · ' + esc((p.meta && p.meta.verification) || '') : '미검증(수집가 1차 자료)'}${p.meta && p.meta.verified_scope ? ' · ' + esc(p.meta.verified_scope) : ''}</p>`;
  if (p.meta && p.meta.hours_basis) h += `<p class="muted">영업시간 근거: ${esc(p.meta.hours_basis)} · 가격 근거: ${esc(p.meta.price_basis || '-')}</p>`;
  h += `</div>`;
  if (p.kr_refs && p.kr_refs.length) {
    h += sec('한국 후기·영상', '새 탭에서 열려요');
    h += `<div class="card-blk krrefs">${p.kr_refs.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><span class="krt ${esc(r.type)}">${r.type === 'youtube' ? '유튜브' : '블로그'}</span><span>${esc(r.title)}</span></a>`).join('')}</div>`;
    h += `<p class="muted krnote">한국어 블로그·영상 링크만 모았습니다(본문·자막은 옮기지 않음). 작성 시점 기준이니 방문 전 최신 정보를 확인하세요.</p>`;
  }
  if (p.sources && p.sources.length) {
    h += sec('출처');
    h += `<div class="srcs">${p.sources.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">↗ ${esc(shortUrl(u))}</a>`).join('')}</div>`;
  }
  h += `<p class="dfoot">개인 연구용 프로토타입 · 일부 정보는 미검증입니다. 방문 전 공식 채널로 확인하세요.<br>수집: ${esc((p.meta && p.meta.collected_at) || '-')} · 사진은 각 캡션의 CC 라이선스를 따릅니다.</p>`;
  h += `</div></div>`;
  return h;
}

function shortUrl(u) {
  try { const x = new URL(u); const s = decodeURIComponent(x.pathname); return (x.hostname + s).slice(0, 90); } catch { return u; }
}

async function sharePlace(p) {
  const url = location.href;
  const data = { title: p.name_ko, text: `${p.name_ko} — ${p.lead || ''}`, url };
  if (navigator.share) { try { await navigator.share(data); return; } catch { } }
  try { await navigator.clipboard.writeText(`${p.name_ko} ${url}`); toast('링크를 복사했어요'); }
  catch { toast(url); }
}

/* ---------------- 국가 정보 ---------------- */
function renderCountry() {
  const box = $('#countryView');
  if (!state.countries || !state.countries.length) { box.innerHTML = '<p class="empty">국가 정보를 불러오지 못했어요.</p>'; return; }
  const html = state.countries.map((c) => {
    const pro = [...(c.procedures || [])].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
    const groups = [];
    for (const t of TYPE_ORDER) {
      const list = pro.filter((p) => p.type === t);
      if (list.length) groups.push([t, list]);
    }
    return `<div class="cview">
      <div class="cvp"><h3>${esc(c.name_ko)} <span class="muted">${esc(c.name_local)}</span></h3>
        <div class="ci"><span>통화 ${esc(c.currency)}</span><span>플러그 ${esc(c.plug)}</span><span>${esc(c.timezone)}</span></div></div>
      <div class="cwarn">입국·환전·통신 규정은 수시로 바뀝니다. 이 카드는 수집 시점 기준이며 <b>공식 발표로 재확인</b>이 필요합니다.</div>
      ${groups.map(([t, list]) => `<div class="grp">${esc(TYPE_LABEL[t] || t)}</div>${list.map(procHtml).join('')}`).join('')}
      ${(c.phrases || []).length ? `<div class="grp">여행 회화</div><div class="cpro">${(c.phrases || []).map((p) => `<div class="phrase"><span class="l">${esc(p.title)}</span><span class="r">${esc(p.body_md)}</span></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
  box.innerHTML = html;
}

function procHtml(p) {
  return `<div class="cpro">
    <h4>${esc(p.title)} ${p.unverified ? '<span class="badge warnb">미검증</span>' : ''}</h4>
    ${p.body_md ? `<p>${esc(p.body_md)}</p>` : ''}
    ${(p.steps || []).length ? `<ol>${p.steps.map((s) => `<li>${esc(s.text)}${s.minutes ? ` <span class="muted">약 ${s.minutes}분</span>` : ''}</li>`).join('')}</ol>` : ''}
    ${p.total_min ? `<p class="muted">총 약 ${p.total_min}분${p.arrive_before_min ? ` · 출발 ${Math.round(p.arrive_before_min / 60 * 10) / 10}시간 전 도착 권장` : ''}</p>` : ''}
    ${p.source_url ? `<a class="src" href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">↗ 출처</a>` : ''}
  </div>`;
}

/* ---------------- 오프라인 ---------------- */
function setupOfflineBar() {
  const bar = $('#offlineBar');
  const upd = () => { bar.hidden = navigator.onLine; };
  window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();
}

function offlineTargetCity() {
  if (state.city !== 'all') return state.city;
  return 'CN-SHA';
}

function updateOfflineLabel() {
  if (!('serviceWorker' in navigator)) { els.offlineBtn.hidden = true; return; }
  els.offlineBtn.hidden = false;
  const city = offlineTargetCity();
  const c = state.data.cities.find((x) => x.id === city);
  if (!c) return;
  const saved = localStorage.getItem('tp-offline:' + city);
  const bytes = c.photoBytes || 0;
  els.offlineBtn.textContent = saved ? `${c.name} 저장됨 ✓` : `${c.name} 오프라인 저장`;
  els.offlineBtn.title = saved ? '저장 시각 ' + new Date(+saved).toLocaleString('ko-KR') : `사진 포함 약 ${fmtMB(bytes)}MB`;
}

async function saveOffline() {
  if (!state.data) return;
  const city = offlineTargetCity();
  const c = state.data.cities.find((x) => x.id === city);
  if (!c) return;
  const items = state.data.items.filter((i) => i.city === city);
  const urls = [
    './data/browse-index.json', './data/photos-index.json', './data/countries.json',
    `./data/cities/${c.dir}/city.json`, `./data/cities/${c.dir}/places-index.json`,
    ...items.map((i) => `./data/cities/${c.dir}/places/${encodeURIComponent(i.c)}.json`),
    ...items.flatMap((i) => (state.photos[i.c] || []).flatMap((ph) => [ph.f, ph.t])),
  ];
  els.offlineBtn.classList.add('busy');
  els.offlineBtn.textContent = '저장 중…';
  try {
    const reg = await navigator.serviceWorker.ready;
    await new Promise((resolve, reject) => {
      const ch = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('시간 초과')), 180000);
      ch.port1.onmessage = (e) => {
        const m = e.data || {};
        if (m.type === 'progress') {
          els.offlineBtn.textContent = `${Math.round((m.done / m.total) * 100)}% 저장`;
          if (m.done % 10 === 0) toast(`${c.name} 저장 중 ${m.done}/${m.total}`);
        } else if (m.type === 'done') { clearTimeout(timer); resolve(m); }
      };
      (reg.active || navigator.serviceWorker.controller).postMessage({ type: 'prefetch', urls, label: c.name }, [ch.port2]);
    }).then((m) => {
      localStorage.setItem('tp-offline:' + city, String(Date.now()));
      els.offlineBtn.classList.remove('busy');
      updateOfflineLabel();
      toast(m && m.failed ? `${c.name} 저장 완료 (${m.failed}개 실패)` : `${c.name} 오프라인 저장 완료 · 비행기 모드에서도 열려요`);
    });
  } catch (e) {
    els.offlineBtn.classList.remove('busy');
    updateOfflineLabel();
    toast('저장하지 못했어요: ' + e.message);
  }
}

function setupSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'prefetch-done') updateOfflineLabel();
  });
}

/* ---------------- 기타 ---------------- */
function setupFont() {
  const saved = localStorage.getItem('tp-fs') || '2';
  document.documentElement.dataset.fs = saved;
}
function cycleFont() {
  const cur = +(document.documentElement.dataset.fs || 2);
  const next = cur >= 3 ? 1 : cur + 1;
  document.documentElement.dataset.fs = String(next);
  localStorage.setItem('tp-fs', String(next));
  toast(next === 3 ? '글씨 크게' : next === 1 ? '글씨 작게' : '글씨 보통');
}
let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}
