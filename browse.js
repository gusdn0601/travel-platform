// 둘러보기 — 홈: 도시 먼저 → 카테고리 카드 격자 → 목록(도시·종류로 미리 걸러진 기존 둘러보기).
// 정적 사이트(site/)에서 상대경로로 동작. 데이터: ./data/browse-index.json (build-site.mjs 파생).
import { iconSvg, KIND_ICON } from './place-icons.js';
import { ads } from './ads-config.js';
import { chipsHtml, lodgingHtml, transitHtml, guideSummary } from './guide.js';
import { amapUrl, gmapUrl } from './maps-link.js';
import { branchesHtml } from './branch-list.js';

const KIND = { sight: '관광', food: '맛집', shop: '쇼핑', transit: '교통', activity: '액티비티' };
const KIND_ORDER = ['sight', 'food', 'shop', 'transit'];
const TYPE_LABEL = {
  entry: '입국', visa: '비자·체류', app: '필수 앱', customs: '세관', exchange: '환전·결제',
  sim: 'SIM·인터넷', transport: '교통', power: '전원·콘센트', emergency: '비상연락', exit: '출국',
};
const TYPE_ORDER = ['entry', 'visa', 'app', 'exchange', 'sim', 'transport', 'power', 'customs', 'emergency', 'exit'];
const PAGE = 40;
// 상단 도시 세그먼트 순서 — 대표님 지시(10/29): 상하이·오사카·교토·나라·후쿠오카
const CITY_ORDER = ['CN-SHA', 'JP-OSA', 'JP-KYO', 'JP-NAR', 'JP-FUK'];
const CAL_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18M8 15h3M8 18h3M14 15h2"/></svg>';

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
const norm = (s) => String(s || '').toLowerCase().normalize('NFKC').replace(/[\s ]+/g, '').replace(/[·・,，.。:;'"“”‘’()（）\[\]{}<>!?~\-_/\\|]/g, '');
const fmtNum = (n) => Number(n || 0).toLocaleString('ko-KR');
const fmtMB = (b) => (b / 1048576).toFixed(b > 10485760 ? 0 : 1);

const state = {
  data: null, countries: null, photos: {}, cityDir: {},
  view: 'home', city: 'CN-SHA', kind: 'all', cats: new Set(), acts: new Set(), area: '', q: '',
  photoOnly: false, verifiedOnly: false, sort: 'rec', limit: PAGE, topOnly: false, guideType: 'all', guideCity: '',
};
const els = {};

init();

async function init() {
  els.q = $('#q'); els.cards = $('#cards'); els.count = $('#count'); els.empty = $('#empty');
  els.citySeg = $('#citySeg'); els.kindChips = $('#kindChips');
  els.subWrap = $('#subWrap'); els.subHead = $('#subHead'); els.subChips = $('#subChips');
  els.guideWrap = $('#guideWrap'); els.listHead = $('#listHead');
  els.homeView = $('#homeView'); els.listView = $('#listView'); els.guideView = $('#guideView'); els.countryView = $('#countryView');
  els.detail = $('#detail'); els.toast = $('#toast');
  els.moreWrap = $('#moreWrap'); els.offlineBtn = $('#offlineBtn'); els.sortBtn = $('#sortBtn');
  setupFont(); setupOfflineBar(); setupSearch(); setupDelegates();
  try {
    const [idx, countries, photos] = await Promise.all([
      fetch('./data/browse-index.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('index ' + r.status); return r.json(); }),
      fetch('./data/countries.json').then((r) => r.json()).catch(() => []),
      fetch('./data/photos-index.json').then((r) => r.json()).catch(() => ({})),
    ]);
    state.data = idx; state.countries = countries; state.photos = photos;
    for (const c of idx.cities) state.cityDir[c.id] = c.dir;
    state.city = resolveCity();
    renderChips();
    route(true);
    setupSW();
  } catch (e) {
    els.homeView.innerHTML = `<p class="empty">데이터를 불러오지 못했어요.<br><b>인터넷 연결</b> 후 다시 열어 주세요.<br><span class="muted">${esc(e.message)}</span></p>`;
  }
  window.addEventListener('hashchange', () => route(false));
  window.addEventListener('popstate', () => route(false));
}

function resolveCity() {
  const saved = localStorage.getItem('tp-city');
  if (saved && state.cityDir[saved]) return saved;
  if (state.cityDir['CN-SHA']) return 'CN-SHA';
  return state.data.cities[0].id;
}
function cityObj() { return state.data.cities.find((c) => c.id === state.city) || state.data.cities[0]; }
function setCity(id) {
  if (!state.cityDir[id] || id === state.city) return;
  state.city = id; state.area = ''; state.limit = PAGE;
  try { localStorage.setItem('tp-city', id); } catch { }
}

/* ---------------- 검색·필터 ---------------- */
function setupSearch() {
  let t = 0;
  els.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); els.q.blur(); } });
  els.q.addEventListener('input', () => {
    $('#clearQ').hidden = !els.q.value;
    clearTimeout(t);
    t = setTimeout(() => {
      state.q = els.q.value.trim(); state.limit = PAGE;
      if (state.view === 'list') { syncListHash(true); renderList(); }
      else if (state.data) location.hash = `/list/${encodeURIComponent(state.city)}/all${state.q ? `?q=${encodeURIComponent(state.q)}` : ''}`;
    }, 90);
  });
  $('#clearQ').addEventListener('click', () => {
    els.q.value = ''; state.q = ''; $('#clearQ').hidden = true; state.limit = PAGE;
    if (state.view === 'list') { syncListHash(true); renderList(); }
    els.q.focus();
  });
  els.sortBtn.addEventListener('click', () => {
    const order = ['rec', 'name', 'city'];
    const labels = { rec: '추천순', name: '이름순', city: '도시순' };
    state.sort = order[(order.indexOf(state.sort) + 1) % order.length];
    els.sortBtn.textContent = labels[state.sort];
    renderList();
  });
  $('#fontBtn').addEventListener('click', cycleFont);
}

function syncListHash(replace) {
  const q = state.area ? `?area=${encodeURIComponent(state.area)}${state.q ? `&q=${encodeURIComponent(state.q)}` : ''}` : state.q ? `?q=${encodeURIComponent(state.q)}` : '';
  const h = `#/list/${encodeURIComponent(state.city)}/${state.kind}${q}`;
  try { history[replace ? 'replaceState' : 'pushState'](null, '', h); } catch { }
}

function setupDelegates() {
  els.citySeg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-city]'); if (!b) return;
    const id = b.dataset.city;
    if (id === state.city) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setCity(id);
    renderCitySeg();
    const q = state.q ? `?q=${encodeURIComponent(state.q)}` : '';
    if (state.view === 'list') location.hash = `/list/${encodeURIComponent(id)}/${state.kind}${q}`;
    else if (state.view === 'guide') location.hash = `/guide/${encodeURIComponent(id)}/lodging`;
    else if (state.view === 'country') { renderCountry(); }
    else { renderHome(); window.scrollTo({ top: 0 }); }
  });
  els.kindChips.addEventListener('click', (e) => {
    const top = e.target.closest('[data-top]');
    if (top) { state.topOnly = !state.topOnly; state.limit = PAGE; renderChips(); renderList(); return; }
    if (e.target.closest('[data-photo]')) { state.photoOnly = !state.photoOnly; state.limit = PAGE; renderChips(); renderList(); return; }
    if (e.target.closest('[data-verified]')) { state.verifiedOnly = !state.verifiedOnly; state.limit = PAGE; renderChips(); renderList(); return; }
    const b = e.target.closest('[data-kind]'); if (!b) return;
    const q = state.q ? `?q=${encodeURIComponent(state.q)}` : '';
    location.hash = `/list/${encodeURIComponent(state.city)}/${b.dataset.kind}${q}`;
  });
  const skip = $('.skip');
  if (skip) skip.addEventListener('click', (e) => { e.preventDefault(); $('#view').focus(); $('#view').scrollIntoView(); });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-offline]')) { saveOffline(); return; }
    const r = e.target.closest('[data-reset]');
    if (r) {
      state.q = ''; state.cats.clear(); state.acts.clear(); state.area = '';
      state.photoOnly = state.verifiedOnly = state.topOnly = false; state.limit = PAGE;
      els.q.value = ''; $('#clearQ').hidden = true;
      location.hash = `/list/${encodeURIComponent(state.city)}/all`;
    }
  });
}

// 선택된 필터를 반영한 개수 — 도시를 고르면 아래 종류·하위 분류 개수가 따라 바뀐다
function cityItems(city = state.city) { return state.data.items.filter((i) => i.city === city); }

function renderCitySeg() {
  const rank = (id) => { const i = CITY_ORDER.indexOf(id); return i < 0 ? 99 : i; };
  const cities = [...state.data.cities].sort((a, b) => rank(a.id) - rank(b.id));
  els.citySeg.innerHTML = cities.map((c) =>
    `<button class="chip${state.city === c.id ? ' on' : ''}" type="button" data-city="${esc(c.id)}" aria-pressed="${state.city === c.id}">${esc(c.name)}</button>`).join('');
}

function renderChips() {
  const items = cityItems();
  const perKind = {};
  for (const i of items) perKind[i.k] = (perKind[i.k] || 0) + 1;
  const actSet = new Set(items.filter((i) => (i.ac || []).length).map((i) => i.c));
  const chips = [
    { id: 'all', name: '전체', count: items.length },
    ...KIND_ORDER.map((k) => ({ id: k, name: KIND[k], count: perKind[k] || 0 })),
    { id: 'activity', name: '액티비티', count: actSet.size },
  ];
  const toggles = `<button class="chip${state.photoOnly ? ' on' : ''}" type="button" data-photo="1" aria-pressed="${state.photoOnly}">사진 있음</button>` +
    `<button class="chip${state.verifiedOnly ? ' on' : ''}" type="button" data-verified="1" aria-pressed="${state.verifiedOnly}">검증됨</button>` +
    `<button class="chip${state.topOnly ? ' on' : ''}" type="button" data-top="1" aria-pressed="${state.topOnly}">우선순위 1~2</button>`;
  els.kindChips.innerHTML = '<span class="rowlab">종류</span>' + chips.map((c) => {
    const on = state.kind === c.id;
    return `<button class="chip${on ? ' on' : ''}" type="button" data-kind="${c.id}" aria-pressed="${on}">${esc(c.name)} <span class="n">${fmtNum(c.count)}</span></button>`;
  }).join('') + toggles;
  // 고른 종류가 칩 줄 밖에 있으면 보이게 스크롤(예: 액티비티·교통)
  const on = els.kindChips.querySelector('[data-kind].on');
  if (on) {
    const box = els.kindChips.getBoundingClientRect(), r = on.getBoundingClientRect();
    if (r.left < box.left || r.right > box.right) els.kindChips.scrollLeft += (r.left - box.left) - 24;
  }
}

function matchedCategories(q) {
  const nq = norm(q); if (!nq) return [];
  return state.data.categories.filter((c) => c.aliases.some((a) => norm(a).includes(nq) || nq.includes(norm(a)) && norm(a).length >= 2) || norm(c.label) === nq);
}

function filtered() {
  const q = state.q.trim();
  const terms = q ? q.split(/\s+/).map(norm).filter(Boolean) : [];
  const useCats = state.kind === 'all' || state.kind === 'food';
  const catCat = new Set(useCats ? state.cats : []);
  // 검색어가 음식 카테고리와 정확히 맞으면 그 카테고리도 후보에 넣는다(예: 꿔바로우·소룡포·라멘)
  if (useCats) for (const c of matchedCategories(q)) catCat.add(c.id);
  const out = state.data.items.filter((i) => {
    if (i.city !== state.city) return false;
    if (state.kind === 'activity') {
      if (!(i.ac || []).length) return false;
      if (state.acts.size && !i.ac.some((a) => state.acts.has(a))) return false;
    } else if (state.kind !== 'all' && i.k !== state.kind) return false;
    if (state.area && i.a !== state.area) return false;
    if (state.photoOnly && !i.ph) return false;
    if (state.verifiedOnly && !i.v) return false;
    if (state.topOnly && !(i.p <= 2)) return false;
    if (catCat.size) {
      if (i.k !== 'food') return false;
      if (!i.fc.some((c) => catCat.has(c))) return false;
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

/* ---------------- 홈 ---------------- */
function cityCounts(c) {
  const items = cityItems(c.id);
  const per = {};
  for (const i of items) per[i.k] = (per[i.k] || 0) + 1;
  const act = new Set(items.filter((i) => (i.ac || []).length).map((i) => i.c));
  const country = countryForCity(c.id);
  const richAreas = c.guides && c.guides.lodging && c.guides.lodging.rich && Array.isArray(c.guides.lodging.rich.areas) ? c.guides.lodging.rich.areas.length : 0;
  return {
    all: items.length, sight: per.sight || 0, food: per.food || 0, shop: per.shop || 0, transit: per.transit || 0,
    activity: act.size,
    lodging: richAreas || ((c.guides && c.guides.lodging && c.guides.lodging.items) || []).length,
    country: (country && country.counts && country.counts.procedures) || 0,
  };
}

function tileHtml({ cls, href, icon, name, sub, count, unit }) {
  return `<a class="tile ${cls}" href="${href}">
    <span class="tic" aria-hidden="true">${iconSvg(icon)}</span>
    <span class="tname">${esc(name)}</span>
    <span class="tsub">${esc(sub)}</span>
    <span class="tcount"><b>${fmtNum(count)}</b>${esc(unit)}</span>
    <span class="go" aria-hidden="true">›</span></a>`;
}

function adSlotHtml() {
  // 웹(PWA) 단계는 광고 0건 → DOM 자체를 만들지 않는다(AC-AD-01/AC-HOME-04).
  if (!ads.enabled) return '';
  return `<aside class="ad-slot" data-ad="1" data-ad-slot="${esc(ads.slot)}" aria-label="${esc(ads.label)} 자리">
    <span class="adlab">${esc(ads.label)}</span><span>파트너 자리 · 앱 단계에서만 표시</span></aside>`;
}

function renderHome() {
  const c = cityObj();
  if (!c) return;
  state.view = 'home';
  const n = cityCounts(c);
  const id = encodeURIComponent(c.id);
  const tiles = [
    tileHtml({ cls: 't-transit', href: `#/list/${id}/transit`, icon: 'train', name: '교통', sub: '공항·역·노선', count: n.transit, unit: '곳' }),
    tileHtml({ cls: 't-lodging', href: `#/guide/${id}/lodging`, icon: 'bed', name: '숙박', sub: '지역별로 고르기', count: n.lodging, unit: '지역' }),
    tileHtml({ cls: 't-food', href: `#/list/${id}/food`, icon: 'bowl', name: '맛집', sub: '음식 종류로 찾기', count: n.food, unit: '곳' }),
    tileHtml({ cls: 't-sight', href: `#/list/${id}/sight`, icon: 'sight', name: '관광', sub: '명소·산책', count: n.sight, unit: '곳' }),
    tileHtml({ cls: 't-shop', href: `#/list/${id}/shop`, icon: 'bag', name: '쇼핑', sub: '시장·백화점', count: n.shop, unit: '곳' }),
    tileHtml({ cls: 't-activity', href: `#/list/${id}/activity`, icon: 'themepark', name: '액티비티', sub: '체험·온천·야경', count: n.activity, unit: '곳' }),
  ].join('');
  const countryWide = `<a class="tile wide t-country" href="#/country">
    <span class="tic" aria-hidden="true">${iconSvg('airport')}</span>
    <span class="tw"><span class="tname">입국·국가정보</span><span class="tsub">입국·환전·통신·회화</span></span>
    <span class="tcount"><b>${fmtNum(n.country)}</b>항목</span>
    <span class="go" aria-hidden="true">›</span></a>`;
  els.homeView.innerHTML = `<div class="home">
    <div class="home-head"><h1>${esc(c.name)}</h1><span class="loc">${esc(c.name_local || '')}</span><span class="hs">${fmtNum(n.all)}곳</span></div>
    <a class="cta" href="./app/#/new?city=${id}" data-builder>
      <span class="ci" aria-hidden="true">${CAL_ICON}</span>
      <span class="ct"><b>일정 만들기</b><span>${esc(c.name)}로 바로 시작 · 3박 4일부터</span></span>
      <span class="go" aria-hidden="true">→</span>
    </a>
    <div class="tiles" aria-label="${esc(c.name)} 분류 카드">${tiles}${countryWide}</div>
    ${adSlotHtml()}
  </div>`;
  document.body.dataset.view = 'home';
  document.body.dataset.tab = 'home';
  setTab('home');
  showOnly('home');
  renderCitySeg();
  updateOfflineLabel();
}

/* ---------------- 목록 ---------------- */
function renderListHead() {
  const c = cityObj();
  const label = state.kind === 'all' ? '전체' : (KIND[state.kind] || state.kind);
  const dirty = state.q || state.area
    || (state.kind === 'activity' && state.acts.size)
    || ((state.kind === 'all' || state.kind === 'food') && state.cats.size)
    || state.photoOnly || state.verifiedOnly || state.topOnly;
  els.listHead.innerHTML = `<a class="lback" href="#/">← 홈</a><span class="lcrumbs">${esc(c.name)} · ${esc(label)}</span>` +
    (dirty ? '<button class="tool" type="button" data-reset style="margin-left:auto">초기화</button>' : '');
}

function renderSub() {
  const c = cityObj();
  if (state.kind === 'food') {
    els.subWrap.hidden = false;
    els.subHead.textContent = '음식 종류 · 여러 개 고를 수 있어요';
    const foods = cityItems().filter((i) => i.k === 'food');
    const perCat = {};
    for (const i of foods) for (const cat of i.fc || []) perCat[cat] = (perCat[cat] || 0) + 1;
    const cats = state.data.categories.map((x) => ({ ...x, count: perCat[x.id] || 0 })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
    els.subChips.innerHTML = `<button class="chip${state.cats.size ? '' : ' on'}" type="button" data-cat="" aria-pressed="${!state.cats.size}">전체 <span class="n">${fmtNum(foods.length)}</span></button>` +
      cats.map((x) => `<button class="chip${state.cats.has(x.id) ? ' on' : ''}" type="button" data-cat="${esc(x.id)}" aria-pressed="${state.cats.has(x.id)}">${esc(x.label)} <span class="n">${fmtNum(x.count)}</span></button>`).join('');
    els.subChips.onclick = (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      const id = b.dataset.cat;
      if (!id) state.cats.clear();
      else if (state.cats.has(id)) state.cats.delete(id); else state.cats.add(id);
      state.limit = PAGE; renderSub(); renderList();
    };
    return;
  }
  if (state.kind === 'activity') {
    els.subWrap.hidden = false;
    els.subHead.textContent = '액티비티 주제 · 여러 개 고를 수 있어요';
    const items = cityItems();
    const acts = (state.data.activities || []).map((a) => ({ ...a, count: items.filter((i) => (i.ac || []).includes(a.id)).length }))
      .filter((a) => a.count > 0).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
    const total = items.filter((i) => (i.ac || []).length).length;
    els.subChips.innerHTML = `<button class="chip${state.acts.size ? '' : ' on'}" type="button" data-act="" aria-pressed="${!state.acts.size}">전체 <span class="n">${fmtNum(total)}</span></button>` +
      acts.map((a) => `<button class="chip${state.acts.has(a.id) ? ' on' : ''}" type="button" data-act="${esc(a.id)}" aria-pressed="${state.acts.has(a.id)}">${esc(a.label)} <span class="n">${fmtNum(a.count)}</span></button>`).join('');
    els.subChips.onclick = (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = b.dataset.act;
      if (!id) state.acts.clear();
      else if (state.acts.has(id)) state.acts.delete(id); else state.acts.add(id);
      state.limit = PAGE; renderSub(); renderList();
    };
    return;
  }
  els.subWrap.hidden = true;
  els.subChips.innerHTML = '';
  els.subChips.onclick = null;
}

function renderGuide() {
  const c = cityObj();
  const g = c && c.guides && c.guides.transit;
  if (state.kind !== 'transit' || !g || !(g.items || []).length) { els.guideWrap.innerHTML = ''; return; }
  els.guideWrap.innerHTML = `<section class="guidebox" aria-label="교통 노선 요약">
    <div class="gh"><b>${esc(g.title || '교통·노선')}</b><span class="muted">주요 ${g.items.length}곳 · 눌러서 상세</span></div>
    <p class="gintro">${esc(g.intro || '')}</p>
    <div class="gitems">${g.items.map((it) => `<a class="gitem" href="#/p/${encodeURIComponent(it.code)}">
      <span class="gi" aria-hidden="true">${iconSvg('train')}</span>
      <span class="gt"><b>${esc(it.name)}</b><span>${esc([it.area, it.note].filter(Boolean).join(' · '))}</span></span>
      <span class="go" aria-hidden="true">›</span></a>`).join('')}</div>
    <a class="gmore" href="#/guide/${encodeURIComponent(c.id)}/transit">노선·공항·패스 가이드 더 보기 →</a>
  </section>`;
}

function renderList() {
  if (!state.data) return;
  renderListHead();
  renderChips();
  renderSub();
  renderGuide();
  const list = filtered();
  const shown = list.slice(0, state.limit);
  els.count.innerHTML = `<b>${fmtNum(list.length)}</b>곳${state.q ? ` · ‘${esc(state.q)}’` : ''}${state.area ? ` · ${esc(state.area)}` : ''}`;
  els.empty.hidden = list.length > 0;
  if (!list.length) {
    const cats = matchedCategories(state.q).filter((c) => !c.count);
    els.empty.innerHTML = state.q
      ? `‘${esc(state.q)}’ 에 맞는 장소가 없어요.${cats.length ? `<br>‘<b>${esc(cats[0].label)}</b>’ 카테고리 식당은 아직 수집되지 않았습니다.` : ''}<br><span class="muted">다른 말로 검색해 보세요 (예: 샤오룽바오, 라멘, 성황묘).</span>`
      : '고른 필터에 맞는 장소가 없어요. 필터를 풀어 보세요.';
  }
  els.cards.innerHTML = shown.map(cardHtml).join('');
  els.moreWrap.hidden = list.length <= state.limit;
  $('#moreBtn').onclick = () => { state.limit += PAGE; renderList(); };
  els.adWrap = els.adWrap || $('#adWrap');
  els.adWrap.innerHTML = adSlotHtml();
  renderSummary(list);
  updateOfflineLabel();
}

function renderSummary(list) {
  const box = $('#activeInfo');
  const bits = [];
  if (state.q) bits.push(`검색: ${state.q}`);
  if (state.area) bits.push(state.area);
  if (state.kind === 'activity' && state.acts.size) bits.push([...state.acts].map((id) => ((state.data.activities || []).find((a) => a.id === id) || {}).label || id).join('·'));
  if ((state.kind === 'all' || state.kind === 'food') && state.cats.size) bits.push([...state.cats].map((id) => (state.data.categories.find((c) => c.id === id) || {}).label || id).join('·'));
  if (state.photoOnly) bits.push('사진 있음');
  if (state.verifiedOnly) bits.push('검증됨');
  if (state.topOnly) bits.push('우선순위 1~2');
  box.innerHTML = bits.length
    ? `<div class="filtersum" aria-label="적용된 필터">${bits.map((b) => `<span class="p">${esc(b)}</span>`).join('')}</div>` : '';
}

function cardHtml(i) {
  // 사진이 없으면 종류·하위분류 삽화 아이콘(사진처럼 보이지 않게 '삽화' 라벨 고정)
  const thumb = i.t
    ? `<span class="thumb"><img src="${esc(i.t)}" alt="" loading="lazy" decoding="async" width="96" height="96"></span>`
    : `<span class="thumb ill ill-${esc(i.k)}">${iconSvg(i.ic || KIND_ICON[i.k])}<span class="illtag" aria-hidden="true">삽화</span></span>`;
  const tags = [];
  if (i.p < 90) tags.push(`<span class="badge rec">추천 ${i.p}</span>`);
  tags.push(`<span class="badge ${i.k}">${esc(KIND[i.k] || i.k)}</span>`);
  if (state.kind === 'activity' && (i.ac || []).length) {
    for (const id of i.ac.slice(0, 2)) {
      const a = (state.data.activities || []).find((x) => x.id === id);
      if (a) tags.push(`<span class="badge act">${esc(a.label)}</span>`);
    }
  }
  if (i.v) tags.push('<span class="badge ok">검증</span>');
  if (i.k === 'food' && i.fc.length) for (const c of i.fc.slice(0, 2)) {
    const cat = state.data.categories.find((x) => x.id === c); if (cat && c !== 'other') tags.push(`<span class="badge food">${esc(cat.label)}</span>`);
  }
  if (i.ph > 1) tags.push(`<span class="badge">사진 ${i.ph}</span>`);
  return `<a class="card" href="#/p/${encodeURIComponent(i.c)}" data-code="${esc(i.c)}">
    ${thumb}
    <span class="b">
      <span class="nm">${esc(i.n)}${i.s ? `<span class="sub">${esc(i.s)}</span>` : ''}</span>
      <span class="loc">${esc(i.cn)}${i.a ? ' · ' + esc(i.a) : ''}</span>
      <span class="lead">${esc(i.lead)}</span>
      <span class="tags">${tags.join('')}</span>
    </span></a>`;
}

/* ---------------- 가이드(숙박) ---------------- */
function showGuide(cityId, type) {
  if (state.cityDir[cityId]) setCity(cityId);
  state.view = 'guide'; state.kind = 'all';
  document.body.dataset.view = 'guide';
  document.body.dataset.tab = 'home';
  setTab('home');
  showOnly('guide');
  renderCitySeg();
  const c = cityObj();
  const g = c && c.guides && c.guides[type];
  const box = els.guideView;
  if (!g) {
    box.innerHTML = `<div class="listhead"><a class="lback" href="#/">← 홈</a><span class="lcrumbs">${esc(c.name)}</span></div><p class="empty">가이드가 아직 없어요.</p>`;
    return;
  }
  const rich = g.rich; // 구역·노선·공항·패스 상세(guide.js 렌더)
  // 다른 도시로 넘어가면 여행자 유형 선택은 초기화한다(도시마다 해당 구역이 다름).
  if (state.guideCity !== cityId) { state.guideCity = cityId; state.guideType = 'all'; }
  const items = (g.items || []).slice(0, 4);
  const cards = type === 'lodging'
    ? items.map((it) => `<a class="gcard" href="#/list/${encodeURIComponent(c.id)}/all?area=${encodeURIComponent(it.area || it.name)}">
        <b>${esc(it.name || it.area)}</b>
        <span class="gmeta">${String(it.note || '').split(' · ').filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</span>
        <span class="gsub">이 지역 장소 보기 →</span></a>`).join('')
    : items.map((it) => `<a class="gitem" href="#/p/${encodeURIComponent(it.code)}">
        <span class="gi" aria-hidden="true">${iconSvg('train')}</span>
        <span class="gt"><b>${esc(it.name)}</b><span>${esc([it.area, it.note].filter(Boolean).join(' · '))}</span></span>
        <span class="go" aria-hidden="true">›</span></a>`).join('');
  const switchChips = `<div class="chips gswitch" role="group" aria-label="가이드 종류">
    <a class="chip${type === 'lodging' ? ' on' : ''}" href="#/guide/${encodeURIComponent(c.id)}/lodging"${type === 'lodging' ? ' aria-current="page"' : ''}>숙박</a>
    <a class="chip${type === 'transit' ? ' on' : ''}" href="#/guide/${encodeURIComponent(c.id)}/transit"${type === 'transit' ? ' aria-current="page"' : ''}>교통</a></div>`;
  let body;
  if (rich && type === 'lodging') {
    body = `<div class="chips lgtypes" id="lgTypes" role="group" aria-label="여행자 유형">${chipsHtml(state.guideType)}</div>
      <div id="lgBody">${lodgingHtml(rich, state.guideType)}</div>`;
  } else if (rich && type === 'transit') {
    body = transitHtml(rich);
  } else {
    body = type === 'lodging' ? `<div class="gcards">${cards}</div>` : `<section class="guidebox">${cards}</section>`;
  }
  box.innerHTML = `<div class="listhead"><a class="lback" href="#/">← 홈</a><span class="lcrumbs">${esc(c.name)} · ${esc(g.title || '')}</span></div>
    <div class="vhead"><h1>${esc(g.title || '')}</h1>${rich ? `<p class="gsumline">${guideSummary(rich, type)}</p>` : `<p>${esc(g.intro || '')}</p>`}</div>
    ${switchChips}
    ${body}
    ${!rich && g.note ? `<p class="gnote">${esc(g.note)}</p>` : ''}
    <a class="bigbtn" href="#/list/${encodeURIComponent(c.id)}/all">${esc(c.name)} 전체 ${fmtNum(c.count)}곳 보기 →</a>`;
  // 여행자 유형 칩 — 다시 그릴 때도 이벤트가 살아 있도록 컨테이너에 한 번만 건다.
  const types = box.querySelector('#lgTypes');
  if (types) {
    types.onclick = (e) => {
      const b = e.target.closest('[data-gtype]'); if (!b) return;
      state.guideType = b.dataset.gtype;
      types.innerHTML = chipsHtml(state.guideType);
      box.querySelector('#lgBody').innerHTML = lodgingHtml(rich, state.guideType);
    };
  }
  window.scrollTo({ top: 0 });
}

/* ---------------- 상세 ---------------- */
function route(first = false) {
  if (!state.data) return;
  const raw = location.hash.replace(/^#/, '');
  const [pathPart, qs] = raw.split('?');
  const path = pathPart.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(qs || '');
  if (path.startsWith('/p/')) {
    state.view = 'detail';
    openDetail(decodeURIComponent(path.slice(3)), first);
    return;
  }
  els.detail.hidden = true; document.body.style.overflow = '';
  if (path === '/country') return showCountry();
  if (path.startsWith('/guide/')) {
    const seg = path.split('/');
    return showGuide(seg[2] || state.city, seg[3] || 'lodging');
  }
  if (path === '/food') {
    state.kind = 'food'; state.area = ''; state.limit = PAGE; state.acts.clear();
    return showList();
  }
  if (path.startsWith('/list/')) {
    const seg = path.split('/');
    if (seg[2] && state.cityDir[seg[2]]) setCity(seg[2]);
    const kind = seg[3] || 'all';
    state.kind = kind === 'activity' || KIND[kind] ? kind : 'all';
    if (state.kind !== 'activity') state.acts.clear();
    if (state.kind !== 'all' && state.kind !== 'food') state.cats.clear();
    state.area = params.get('area') || '';
    state.q = params.get('q') || '';
    state.limit = PAGE;
    return showList();
  }
  return showHome();
}

function showHome() {
  els.q.value = ''; $('#clearQ').hidden = true;
  state.q = ''; state.kind = 'all'; state.area = ''; state.limit = PAGE; state.cats.clear(); state.acts.clear();
  renderHome();
  window.scrollTo({ top: 0 });
}

function showList() {
  state.view = 'list';
  document.body.dataset.view = 'list';
  document.body.dataset.tab = state.kind === 'food' ? 'food' : 'home';
  setTab(state.kind === 'food' ? 'food' : 'home');
  showOnly('list');
  els.q.value = state.q; $('#clearQ').hidden = !state.q;
  renderCitySeg();
  renderList();
  els.sortBtn.textContent = { rec: '추천순', name: '이름순', city: '도시순' }[state.sort];
  window.scrollTo({ top: 0 });
}

function showCountry() {
  state.view = 'country';
  document.body.dataset.view = 'country';
  document.body.dataset.tab = 'country';
  setTab('country');
  showOnly('country');
  renderCitySeg();
  renderCountry();
  window.scrollTo({ top: 0 });
}

function showOnly(which) {
  els.homeView.hidden = which !== 'home';
  els.listView.hidden = which !== 'list';
  els.guideView.hidden = which !== 'guide';
  els.countryView.hidden = which !== 'country';
}

function setTab(name) {
  $$('.tab').forEach((a) => {
    const on = a.dataset.tab === name;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
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

/* 지점(체인) — 데이터에 있는 지점만 그린다. 렌더는 branch-list.js(순수 함수). */
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

  const cityRow = state.data.cities.find((c) => c.id === item.city) || {};
  const cityLocal = cityRow.name_local || '';
  // 좌표계·도시 범위는 maps-link.js 에서 처리(고덕 marker 는 coordinate=wgs84, search 는 city=도시명).
  const gmap = gmapUrl(p, cityLocal);
  const amap = amapUrl(p, cityLocal);
  const isCN = cityRow.country === 'CN';

  const sec = (t, sub = '') => `<h2 class="sec">${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2>`;
  let h = '<div class="dbody">';
  h += hero
    ? `<img class="hero" src="${esc(hero.f)}" alt="${esc(hero.cap || p.name_ko)}" decoding="async">`
    : `<div class="hero-ill ill ill-${esc(p.kind)}">${iconSvg(item.ic || KIND_ICON[p.kind])}<span class="illnote">삽화 · 사진 없음</span></div>`;
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
  h += branchesHtml(p, cityLocal, isCN);

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

/* ---------------- 국가 정보: 핵심만 앞에, 나머지는 접기 ---------------- */
function countryForCity(cityId) {
  const c = state.data.cities.find((x) => x.id === cityId);
  const code = c && (c.country || c.country_code);
  return (state.countries || []).find((x) => x.code === code) || null;
}

function renderCountry() {
  const box = els.countryView;
  if (!state.countries || !state.countries.length) { box.innerHTML = '<p class="empty">국가 정보를 불러오지 못했어요.</p>'; return; }
  const selected = countryForCity(state.city);
  const others = state.countries.filter((c) => c !== selected);
  box.innerHTML = `<div class="cview">${selected ? countryHtml(selected) : ''}
    ${others.map((c) => `<details class="adv"><summary>${esc(c.name_ko)} 정보 <span class="muted">펼치기</span></summary><div class="in">${countryHtml(c, true)}</div></details>`).join('')}
  </div>`;
}

function countryHtml(c, nested = false) {
  const pro = [...(c.procedures || [])].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  const groups = [];
  for (const t of TYPE_ORDER) {
    const list = pro.filter((p) => p.type === t);
    if (list.length) groups.push([t, list]);
  }
  const key = groups.filter(([t]) => t === 'entry' || t === 'exit');
  const rest = groups.filter(([t]) => t !== 'entry' && t !== 'exit');
  const restCount = rest.reduce((n, [, l]) => n + l.length, 0);
  return `<div class="cvp"><h3>${esc(c.name_ko)} <span class="muted">${esc(c.name_local)}</span></h3>
      <div class="ci"><span>통화 ${esc(c.currency)}</span><span>플러그 ${esc(c.plug)}</span><span>${esc(c.timezone)}</span></div></div>
    ${nested ? '' : '<div class="cwarn">입국·환전·통신 규정은 수시로 바뀝니다. 수집 시점 기준이며 <b>공식 발표로 재확인</b>하세요.</div>'}
    ${key.map(([t, list]) => `<div class="grp">${esc(TYPE_LABEL[t] || t)}</div>${list.map(procHtml).join('')}`).join('')}
    ${restCount ? `<details class="adv"><summary>그 밖의 정보 <span class="muted">${restCount}개 · 펼치기</span></summary><div class="in">${rest.map(([t, list]) => `<div class="grp">${esc(TYPE_LABEL[t] || t)}</div>${list.map(procHtml).join('')}`).join('')}</div></details>` : ''}
    ${(c.phrases || []).length ? `<details class="adv"><summary>여행 회화 <span class="muted">${c.phrases.length}개 · 펼치기</span></summary><div class="in"><div class="cpro">${c.phrases.map((p) => `<div class="phrase"><span class="l">${esc(p.title)}</span><span class="r">${esc(p.body_md)}</span></div>`).join('')}</div></div></details>` : ''}`;
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
  return state.cityDir[state.city] ? state.city : 'CN-SHA';
}

function updateOfflineLabel() {
  if (!state.data) return;
  const city = offlineTargetCity();
  const c = state.data.cities.find((x) => x.id === city);
  if (!c) return;
  const saved = localStorage.getItem('tp-offline:' + city);
  const label = saved ? `${c.name} 저장됨 ✓` : `${c.name} 오프라인 저장`;
  const title = saved ? '저장 시각 ' + new Date(+saved).toLocaleString('ko-KR') : `사진 포함 약 ${fmtMB(c.photoBytes || 0)}MB`;
  const hasSW = 'serviceWorker' in navigator;
  for (const b of $$('[data-offline]')) {
    b.textContent = label; b.title = title;
    b.hidden = !hasSW;
  }
}

async function saveOffline() {
  if (!state.data) return;
  const city = offlineTargetCity();
  const c = state.data.cities.find((x) => x.id === city);
  if (!c) return;
  if (!('serviceWorker' in navigator)) { toast('이 브라우저는 오프라인 저장을 지원하지 않아요'); return; }
  const items = state.data.items.filter((i) => i.city === city);
  const urls = [
    './data/browse-index.json', './data/photos-index.json', './data/countries.json',
    `./data/cities/${c.dir}/city.json`, `./data/cities/${c.dir}/places-index.json`,
    ...items.map((i) => `./data/cities/${c.dir}/places/${encodeURIComponent(i.c)}.json`),
    ...items.flatMap((i) => (state.photos[i.c] || []).flatMap((ph) => [ph.f, ph.t])),
  ];
  const btns = $$('[data-offline]');
  for (const b of btns) { b.classList.add('busy'); b.textContent = '저장 중…'; }
  try {
    const reg = await navigator.serviceWorker.ready;
    await new Promise((resolve, reject) => {
      const ch = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('시간 초과')), 180000);
      ch.port1.onmessage = (e) => {
        const m = e.data || {};
        if (m.type === 'progress') {
          for (const b of btns) b.textContent = `${Math.round((m.done / m.total) * 100)}% 저장`;
          if (m.done % 10 === 0) toast(`${c.name} 저장 중 ${m.done}/${m.total}`);
        } else if (m.type === 'done') { clearTimeout(timer); resolve(m); }
      };
      (reg.active || navigator.serviceWorker.controller).postMessage({ type: 'prefetch', urls, label: c.name }, [ch.port2]);
    }).then((m) => {
      try { localStorage.setItem('tp-offline:' + city, String(Date.now())); } catch { }
      for (const b of btns) b.classList.remove('busy');
      updateOfflineLabel();
      toast(m && m.failed ? `${c.name} 저장 완료 (${m.failed}개 실패)` : `${c.name} 오프라인 저장 완료 · 비행기 모드에서도 열려요`);
    });
  } catch (e) {
    for (const b of btns) b.classList.remove('busy');
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
