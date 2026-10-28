// 여행책 앱 (정적, 서버 없음). 해시 라우터: #/  #/new  #/settings  #/trip/:id
import { loadTheme, listThemes, dayColor, THEME_KEY } from './theme.js';
import { mergeMeta } from './placemeta.js';
import { CITIES, CITY_ORDER, DEFAULT_CITY, cityDef, cityDir } from './cities.js';
import { reflowDay, toMin, fromMin, travel, km as kmBetween } from './scheduler.js';
import { encodeShare, decodeShare, shareUrl } from './share.js';
import { savePack, deletePack, packMeta, fmtBytes } from './pack.js';
import { deleteStop, moveStop, shiftStay, setStart, setNote, moveToDay } from './edit.js';
import { debounce } from './util.js';
import { normalizePlace } from './sources/model.js';
import { LocalCuratedSource, ManualSource, RemotePlaceSource, searchAll } from './sources/index.js';
import { AIRPORTS, PACE, BUFFERS, DEFAULT_OPTS, WD, normalizeTrip, tripDays, dayWindows, dayWarnings, usedMinutes, overMinutes, paceMax, validHHMM, placeCount, recommend, firstMeal, tripBase, fillDay, appendPlace, fmtDur, fmtHM, weekday } from './availability.js';
import { validateTip, TIP_MAX } from './tips.js';
import { iconSvg, KIND_ICON } from '../place-icons.js';
import { storyEntries } from './story.js';
import { getCover, listCovers } from './covers/index.js';
import { mapsAdapter } from './adapters/maps.js';
import { authAdapter } from './adapters/auth.js';
import { storage } from './adapters/storage.js';

let CITY = cityDir(DEFAULT_CITY);
const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { sight: '명소', food: '맛집', shop: '쇼핑' };
const TYPES = ['관광', '미식', '역사', '휴양'], PARTY = ['가족', '커플', '친구', '혼자'];
const state = { theme: null, cityId: null, city: null, places: [], byId: new Map(), photos: new Map(), kr: new Map(), shortNames: {}, db: storage.load(), day: 1, tab: 'plan', planView: 'cards', dayMode: 'compact', add: null, addKind: 'all', open: null, q: '' };

// 라인 아이콘 세트 (인라인 SVG, 24px 격자)
const IC = {
  pin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 8-.5L17 4.5a2 2 0 0 1 3 3L15.5 12l-.5 8L13.5 21.5 11 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m6 15 6-6 6 6"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', wand: '<path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/>', fork: '<path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v6M11 3v6M16 3c-2 2-2.5 5-2 8h2v10"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8zM9 8a3 3 0 0 1 6 0"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  alert: '<path d="M12 4 2.5 20h19L12 4zM12 10v4M12 17v.5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', move: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.5"/>', map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', gear: '', check: '<path d="m5 12 5 5 9-10"/>',
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

const save = () => storage.save(state.db);
const getTrip = (id) => state.db.trips.find((t) => t.id === id);
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }
const uid = () => 't_' + Math.random().toString(36).slice(2, 9);
const dlabel = (iso) => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}(${WD[weekday(iso)]})`;
const photoUrl = (p) => { const ph = p && state.photos.get(p.id)?.[0]; return ph ? CITY + ph.file : null; };

async function applyTheme(id) {
  const t = state.themes.find((x) => x.id === id) || state.themes[0];
  state.theme = await loadTheme(t.file);
}

async function boot() {
  state.themes = await listThemes();
  state.db.settings ||= {};
  await applyTheme(state.db.settings.theme_id);
  await loadCity(hashCityId() || DEFAULT_CITY);
  state.extras = [new RemotePlaceSource({ apiKey: state.db.settings.places_key || null })]; // 키 없으면 'unavailable' → 조용히 건너뜀
  state.countries = {};
  await Promise.all(['CN', 'JP'].map(async (cc) => {
    try {
      const [info, proc, phrases] = await Promise.all(['country.json', 'info-procedures.json', 'info-phrases.json'].map((f) => fetch(`../data/countries/${cc}/${f}`).then((r) => r.json())));
      state.countries[cc] = { info, proc, phrases };
    } catch { state.countries[cc] = null; }
  }));
  window.addEventListener('hashchange', () => { route(); });
  await route();
  setupOffline();
}

/** 지금 해시가 가리키는 도시(?city= 또는 여행 id) — 없으면 null */
function hashCityId() {
  const [path, qs] = (location.hash || '').replace(/^#/, '').split('?');
  const wanted = new URLSearchParams(qs || '').get('city');
  if (wanted && CITIES[wanted]) return wanted;
  const [, view, id] = path.split('/');
  if (view === 'trip') return getTrip(id)?.city_id || null;
  return null;
}

let cityReq = 0;
const cityLoading = new Map();
/** 도시 데이터(장소·사진·지도)를 바꿔 싣는다. 같은 도시면 그대로 둔다. */
function loadCity(id) {
  const def = cityDef(id);
  if (state.cityId === def.id && state.city) return Promise.resolve();
  if (cityLoading.has(def.id)) return cityLoading.get(def.id);
  const p = loadCityNow(def).finally(() => cityLoading.delete(def.id));
  cityLoading.set(def.id, p);
  return p;
}
async function loadCityNow(def) {
  const token = ++cityReq, dir = cityDir(def.id);
  const [city, index, photos, rm] = await Promise.all([
    ...['city.json', 'places-index.json', 'photos.json'].map((f) => fetch(dir + f).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); })),
    def.routeMap ? fetch(dir + 'route-map.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : Promise.resolve({}), // 근거리 이동 지도는 있는 도시만
  ]);
  const full = await Promise.all(index.map((i) => fetch(`${dir}places/${i.code}.json`).then((r) => r.json())));
  if (token !== cityReq) return; // 그 사이 다른 도시를 고른 요청이 있으면 버린다
  CITY = dir;
  state.cityId = def.id; state.city = city; state.shortNames = rm.short_names || {};
  state.places = full.map((p) => normalizePlace(mergeMeta(p), { provider: 'local' }));
  state.local = new LocalCuratedSource(state.places);
  state.byId = new Map(state.places.map((p) => [p.id, p]));
  state.photos = new Map();
  for (const ph of photos) { if (!state.photos.has(ph.place_id)) state.photos.set(ph.place_id, []); state.photos.get(ph.place_id).push(ph); }
}

// 오프라인: 서비스워커가 앱·데이터를 캐시해 두고, 연결이 끊기면 상단에 배지를 보여준다
function setupOffline() {
  const badge = document.getElementById('offline'), upd = () => { badge.hidden = navigator.onLine; };
  window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => { // 첫 방문에도 오프라인용 데이터를 미리 받아 둔다
    const base = ['city.json', 'places-index.json', 'photos.json', ...(Object.keys(state.shortNames || {}).length ? ['route-map.json'] : [])];
    const urls = [...base, ...state.places.map((p) => `places/${p.code}.json`)].map((f) => CITY + f);
    for (const ph of [...state.photos.values()].flat()) urls.push(CITY + ph.file);
    for (const t of state.themes) urls.push('../data/themes/' + t.file);
    urls.push('../data/themes/index.json');
    for (const cc of Object.keys(state.countries || {})) for (const f of ['country.json', 'info-procedures.json', 'info-phrases.json']) urls.push(`../data/countries/${cc}/${f}`);
    return Promise.all(urls.map((u) => fetch(u).catch(() => null)));
  }).then(() => { document.documentElement.dataset.offlineReady = '1'; }).catch(() => {});
}

async function route() {
  const [path, qs] = (location.hash || '').replace(/^#/, '').split('?');
  const [, view, id] = path.split('/');
  document.getElementById('topTitle').textContent = '';
  if (view === 'new') {
    const wanted = new URLSearchParams(qs || '').get('city');
    const cityId = wanted && CITIES[wanted] ? wanted : null;
    if (cityId) await loadCity(cityId).catch(() => {});
    return viewNew(cityId);
  }
  if (view === 'settings') return viewSettings();
  if (view === 'trip') {
    const t = getTrip(id);
    if (t?.city_id) await loadCity(t.city_id).catch(() => {});
    return viewTrip(id);
  }
  if (view === 'share') return viewShare(id);
  viewHome();
}
const nav = (h) => { location.hash = h; };

// ---------- 설정 (테마) ----------
async function viewSettings() {
  const all = await Promise.all(state.themes.map((t) => fetch('../data/themes/' + t.file).then((r) => r.json())));
  $app.innerHTML = `<h1>설정</h1><h3>테마</h3><p class="muted">색과 장식이 바뀌어요. 글꼴 위계는 모든 테마가 같고, 표지 시안과는 따로 고를 수 있어요.</p>
    ${all.map((t) => `<button class="theme-card ${t.id === state.theme.id ? 'on' : ''}" data-theme="${t.id}"><b>${esc(t.name)}</b><div style="margin-top:8px">${[t.colors.bg, t.colors.accent, ...Object.values(t.dayColors)].map((c) => `<span class="swatch" style="background:${c}"></span>`).join('')}</div></button>`).join('')}
    <a class="btn ghost" href="#/">${ic('left')} 홈으로</a>`;
  $app.querySelectorAll('[data-theme]').forEach((b) => b.onclick = async () => {
    state.db.settings.theme_id = b.dataset.theme; save(); await applyTheme(b.dataset.theme); toast('테마를 바꿨어요'); viewSettings();
  });
}

// ---------- 공유 링크 (AC-SHARE-01): 읽기 전용 하루 요약 ----------
function viewShare(payload) {
  const s = decodeShare(payload);
  if (!s) { $app.innerHTML = `<h1>공유 링크를 열 수 없어요</h1><div class="card"><p>링크가 잘렸거나 형식이 달라요. 만든 사람에게 새 링크를 받아 주세요.</p><a class="btn ghost" href="#/">${ic('left')} 홈으로</a></div>`; return; }
  const days = s.p, cur = days.find((d) => d.n === state.shareDay) || days[0]; state.shareDay = cur?.n || 1;
  const rows = (cur?.x || []).map((x) => x.y === 'move'
    ? `<div class="tl-row mv"><span class="t">${esc(x.b)}</span><span class="dot"></span><span class="n">${esc(x.l)}</span></div>`
    : `<div class="tl-row"><span class="t">${esc(x.b)}</span><span class="dot"></span><span class="n">${esc(x.l)}</span><span class="stay">${toMin(x.f) - toMin(x.b)}분</span></div>`).join('');
  $app.innerHTML = `<h1>${esc(s.t)}</h1>
    <p class="muted">${esc(s.s)} ~ ${esc(s.e)}${s.a ? ` · 도착 ${esc(s.a)}` : ''}${s.d ? ` · 출발 ${esc(s.d)}` : ''} · 읽기 전용</p>
    <div class="tabs" role="tablist">${days.map((d) => `<button class="tab ${d.n === state.shareDay ? 'on' : ''}" role="tab" aria-selected="${d.n === state.shareDay}" data-sday="${d.n}">${d.n}일차<small>${esc(d.dt.slice(5).replace('-', '/'))}</small></button>`).join('')}</div>
    <div class="card avail"><div class="head"><span><b>${cur?.x?.filter((x) => x.y !== 'move').length || 0}곳</b> <span class="muted">일정</span></span><span class="muted">공유된 요약</span></div></div>
    <div class="tl" id="timeline">${rows || '<div class="muted" style="padding:16px">아직 비어 있는 날이에요.</div>'}</div>
    <div class="card"><h3>이 일정을 저장하고 싶다면</h3><p class="muted">링크를 복사해 공유하세요. 이 화면은 읽기 전용이라 편집·삭제·추가 버튼이 없어요.</p>
      <button class="cta" data-copy>${ic('check')} 링크 복사</button><div class="muted" id="copyn" role="status"></div></div>`;
  $app.querySelectorAll('[data-sday]').forEach((b) => b.onclick = () => { state.shareDay = +b.dataset.sday; viewShare(payload); });
  $app.querySelector('[data-copy]').onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); $app.querySelector('#copyn').textContent = '복사했어요. 붙여넣기로 보내 주세요.'; }
    catch { $app.querySelector('#copyn').textContent = '주소창의 링크를 길게 눌러 복사해 주세요.'; }
  };
}

// ---------- 홈 ----------
function viewHome() {
  const u = authAdapter.current();
  $app.innerHTML = `<h1>${esc(u.name)}의 여행책</h1>
  <p class="muted">로그인 없이 이 기기에만 저장돼요.</p>
  ${state.db.trips.map((t) => { normalizeTrip(t); return `<a class="card trip-card" href="#/trip/${t.id}">
    <h3 style="margin:0 0 4px">${esc(t.title)}</h3><div class="muted">${dlabel(t.arrive.date)} ~ ${dlabel(t.depart.date)} · ${tripDays(t)}일 · 성인 ${t.adults}${t.kids ? ' · 아이 ' + t.kids : ''} · ${esc(PACE[t.pace].label)} 페이스</div></a>`; }).join('') || '<div class="card muted">아직 여행이 없어요. 첫 여행을 등록해 보세요.</div>'}
  <button class="cta" data-act="go-new">${ic('plus')} 새 여행 등록</button>`;
  $app.querySelector('[data-act=go-new]').onclick = () => nav('#/new');
}

// ---------- 여행 등록: 1) 어디로·언제·누구와  2) 항공편 시간 → 일자별 가용시간 미리보기 ----------
const chipBtn = (g, v, l, on, mode = 'one') => `<button type="button" class="chip ${on ? 'on' : ''}" data-g="${g}" data-v="${v}" data-mode="${mode}" aria-pressed="${on}">${l}</button>`;
const chipGroup = (g, items, on, label) => `<div class="chips" role="group" aria-label="${label}">${items.map(([v, l]) => chipBtn(g, v, l, v === on)).join('')}</div>`;
const nights = (a, d) => Math.round((Date.parse(d) - Date.parse(a)) / 864e5);
const periodText = (n) => (n < 0 ? '' : n === 0 ? '당일치기' : `${n}박 ${n + 1}일`);
const draft = { step: 1, types: ['관광'], a_ap: 'PVG', d_ap: 'PVG', intl: 'intl', pace: 'normal', a_time: '14:00', d_time: '17:00', o_start: DEFAULT_OPTS.dayStart, o_end: DEFAULT_OPTS.dayEnd, o_checkin: DEFAULT_OPTS.checkin, o_dep: '', l_area: '', l_name: '' };
function resetDraft() {
  const iso = (d) => d.toISOString().slice(0, 10), now = Date.now();
  Object.assign(draft, { step: 1, city: 'CN-SHA', a_date: iso(new Date(now + 14 * 864e5)), d_date: iso(new Date(now + 17 * 864e5)), adults: 2, kids: 0, types: ['관광'], a_ap: 'PVG', d_ap: 'PVG', intl: 'intl', pace: 'normal', a_time: '14:00', d_time: '17:00', o_start: DEFAULT_OPTS.dayStart, o_end: DEFAULT_OPTS.dayEnd, o_checkin: DEFAULT_OPTS.checkin, o_dep: '', l_area: '', l_name: '' });
}
function draftTrip() {
  const intl = draft.intl === 'intl';
  return normalizeTrip({ start: draft.a_date, end: draft.d_date, domestic: !intl, kids: +draft.kids, pace: draft.pace, arrive: { date: draft.a_date, time: draft.a_time, airport: draft.a_ap }, depart: { date: draft.d_date, time: draft.d_time, airport: draft.d_ap },
    opts: { dayStart: draft.o_start || DEFAULT_OPTS.dayStart, dayEnd: draft.o_end || DEFAULT_OPTS.dayEnd, checkin: draft.o_checkin === '' ? DEFAULT_OPTS.checkin : +draft.o_checkin, departBuffer: draft.o_dep === '' ? null : +draft.o_dep, arriveBuffer: null } });
}
const numOpts = (from, to, on) => Array.from({ length: to - from + 1 }, (_, i) => `<option value="${from + i}" ${from + i === on ? 'selected' : ''}>${from + i}</option>`).join('');
/** 도시를 바꾸면 그 도시 기본 공항·숙소 지역 선택을 다시 잡는다. */
function applyDraftCity(id) {
  const def = cityDef(id);
  draft.city = def.id;
  draft.a_ap = def.defaultAirport; draft.d_ap = def.defaultAirport;
  draft.l_area = '';
}
function viewNew(cityId) {
  if (!draft.city) resetDraft();
  if (cityId && draft.city !== cityId) { applyDraftCity(cityId); draft.step = 1; }
  $app.innerHTML = draft.step === 1 ? regStep1() : regStep2();
  (draft.step === 1 ? wireStep1 : wireStep2)();
}
function regStep1() {
  return `<h1>여행 등록</h1>
  <form id="f1" class="card" novalidate>
    <label class="f" for="city">도시</label><select id="city" name="city">${CITY_ORDER.map((id) => `<option value="${id}" ${id === draft.city ? 'selected' : ''}>${esc(CITIES[id].countryLabel)} · ${esc(CITIES[id].name)}</option>`).join('')}</select>
    <div class="row" style="margin-top:16px"><div class="sp"><label class="f" for="a_date">시작일</label><input type="date" id="a_date" name="a_date" value="${draft.a_date}"></div><div class="sp"><label class="f" for="d_date">종료일</label><input type="date" id="d_date" name="d_date" value="${draft.d_date}"></div></div>
    <div id="period" class="period" aria-live="polite"></div><div id="derr" class="err" role="alert"></div>
    <div class="row"><div class="sp"><label class="f" for="adults">성인</label><select id="adults" name="adults">${numOpts(1, 8, +draft.adults)}</select></div><div class="sp"><label class="f" for="kids">아이</label><select id="kids" name="kids">${numOpts(0, 6, +draft.kids)}</select></div></div>
    <div class="f" id="types-l" style="margin:16px 0 8px">여행 유형 (복수 선택)</div>
    <div class="chips" role="group" aria-labelledby="types-l">${TYPES.map((t) => chipBtn('types', t, t, draft.types.includes(t), 'multi')).join('')}</div>
  </form>
  <button class="cta" type="button" id="next">다음 · 항공편 시간</button>`;
}
function wireStep1() {
  const f = document.getElementById('f1'), next = document.getElementById('next');
  const sync = () => {
    if (f.city.value !== draft.city) applyDraftCity(f.city.value);
    Object.assign(draft, { a_date: f.a_date.value, d_date: f.d_date.value, adults: f.adults.value, kids: f.kids.value });
    const n = f.a_date.value && f.d_date.value ? nights(f.a_date.value, f.d_date.value) : NaN;
    const err = !f.a_date.value || !f.d_date.value ? '날짜를 모두 입력해 주세요.' : n < 0 ? '종료일이 시작일보다 빨라요.' : n > 9 ? '최대 10일까지 만들 수 있어요.' : !draft.types.length ? '여행 유형을 하나 이상 골라 주세요.' : '';
    document.getElementById('period').textContent = err ? '' : periodText(n);
    document.getElementById('derr').textContent = err;
    next.disabled = !!err;
  };
  f.addEventListener('input', sync); f.addEventListener('change', sync);
  wireChips($app, () => sync());
  sync();
  next.onclick = async () => {
    sync(); if (next.disabled) return;
    const label = next.textContent;
    next.disabled = true; next.textContent = '도시 정보 불러오는 중…';
    try { await loadCity(draft.city); if (state.cityId !== draft.city) await loadCity(draft.city); } catch { next.disabled = false; next.textContent = label; toast('도시 정보를 불러오지 못했어요. 연결을 확인해 주세요'); return; }
    draft.step = 2; viewNew(); window.scrollTo(0, 0);
  };
}
function wireChips(root, onChange) {
  root.querySelectorAll('.chip[data-g]').forEach((c) => c.onclick = () => {
    const g = c.dataset.g;
    if (c.dataset.mode === 'multi') { const set = new Set(draft[g]); set.has(c.dataset.v) ? set.delete(c.dataset.v) : set.add(c.dataset.v); draft[g] = [...set]; c.classList.toggle('on'); c.setAttribute('aria-pressed', set.has(c.dataset.v)); }
    else { draft[g] = c.dataset.v; root.querySelectorAll(`.chip[data-g=${g}]`).forEach((x) => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c); }); }
    onChange(g);
  });
}
function regStep2() {
  const def = cityDef(draft.city), apKeys = def.airports.filter((k) => AIRPORTS[k]);
  if (!apKeys.includes(draft.a_ap)) draft.a_ap = apKeys[0];
  if (!apKeys.includes(draft.d_ap)) draft.d_ap = apKeys[0];
  const apItems = apKeys.map((k) => [k, AIRPORTS[k].name]);
  const areas = (state.city?.areas || []).filter((a) => a && a !== '기타');
  if (!areas.includes(draft.l_area)) draft.l_area = '';
  return `<h1>항공편 시간</h1><p class="muted">${esc(def.name)} · ${dlabel(draft.a_date)} ~ ${dlabel(draft.d_date)} · ${periodText(nights(draft.a_date, draft.d_date))} · 시각을 넣으면 날짜별 쓸 수 있는 시간을 계산해요.</p>
  <form id="f2" class="card" novalidate>
    <div class="row"><div class="sp"><label class="f" for="a_time">도착 시각</label><input id="a_time" name="a_time" inputmode="numeric" maxlength="5" placeholder="14:00" value="${draft.a_time}" autocomplete="off"></div><div class="sp"><label class="f" for="d_time">출발 시각</label><input id="d_time" name="d_time" inputmode="numeric" maxlength="5" placeholder="17:00" value="${draft.d_time}" autocomplete="off"></div></div>
    <div id="terr" class="err" role="alert"></div>
    <div class="f" id="ap1-l" style="margin:8px 0">도착 공항</div>${chipGroup('a_ap', apItems, draft.a_ap, '도착 공항')}
    <div class="f" id="ap2-l" style="margin:16px 0 8px">출발 공항</div>${chipGroup('d_ap', apItems, draft.d_ap, '출발 공항')}
    <div class="f" style="margin:16px 0 8px">구분</div>${chipGroup('intl', [['intl', '해외 (입국 90분 · 공항 180분 전)'], ['dom', '국내 (30분 · 90분 전)']], draft.intl, '해외 또는 국내')}
    <div class="f" style="margin:16px 0 8px">페이스</div>${chipGroup('pace', Object.entries(PACE).map(([k, v]) => [k, `${v.label} · 하루 ${paceMax(k, +draft.kids)}곳`]), draft.pace, '페이스')}
    <label class="f" for="l_area" style="margin-top:16px">숙소 지역 (선택)</label><select id="l_area" name="l_area"><option value="">아직 안 정했어요</option>${areas.map((a) => `<option ${a === draft.l_area ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
    <details class="adv"><summary id="advsum">시간 설정 · 하루 ${draft.o_start}–${draft.o_end} · 체크인 ${draft.o_checkin || 0}분 · 공항 여유 자동</summary>
      <div class="row"><div class="sp"><label class="f" for="o_start">하루 시작</label><input id="o_start" name="o_start" inputmode="numeric" maxlength="5" value="${draft.o_start}"></div><div class="sp"><label class="f" for="o_end">하루 끝</label><input id="o_end" name="o_end" inputmode="numeric" maxlength="5" value="${draft.o_end}"></div></div>
      <div class="row"><div class="sp"><label class="f" for="o_checkin">체크인·짐 (분)</label><input type="number" id="o_checkin" name="o_checkin" min="0" max="180" value="${draft.o_checkin}"></div><div class="sp"><label class="f" for="o_dep">공항 여유 (분, 비우면 자동)</label><input type="number" id="o_dep" name="o_dep" min="30" max="360" value="${draft.o_dep}"></div></div></details>
  </form>
  <section class="card" aria-labelledby="pv-h"><h3 id="pv-h">일자별 가용시간</h3><div id="pv" class="dchips"></div><div id="pvn" class="muted"></div></section>
  <div class="row"><button class="ghost" type="button" id="prev">이전</button><button class="cta sp" type="button" id="go" style="margin-top:0">일정 만들기 시작</button></div>`;
}
function wireStep2() {
  const f = document.getElementById('f2'), go = document.getElementById('go');
  const sync = () => {
    for (const k of ['a_time', 'd_time', 'o_start', 'o_end', 'o_checkin', 'o_dep', 'l_area']) draft[k] = f[k].value;
    const bad = ['a_time', 'd_time', 'o_start', 'o_end'].filter((k) => !validHHMM(draft[k]));
    const first = bad[0];
    document.getElementById('terr').textContent = bad.length ? `${{ a_time: '도착 시각', d_time: '출발 시각', o_start: '하루 시작', o_end: '하루 끝' }[first]}: 00:00~23:59 형식으로 입력해 주세요 (예: 14:30)` : '';
    f.querySelectorAll('input[inputmode=numeric]').forEach((i) => i.setAttribute('aria-invalid', !validHHMM(i.value)));
    const tr = draftTrip(), dep = tr.opts.departBuffer ?? (tr.domestic ? BUFFERS.domestic.airport : BUFFERS.intl.airport);
    document.getElementById('advsum').textContent = `시간 설정 · 하루 ${draft.o_start}–${draft.o_end} · 체크인 ${draft.o_checkin || 0}분 · 공항 ${dep}분 전`;
    const pv = document.getElementById('pv'), pvn = document.getElementById('pvn');
    if (bad.length) { pv.innerHTML = ''; pvn.textContent = '시각을 바로잡으면 계산해 드려요.'; go.disabled = true; return; }
    const ws = dayWindows(tr);
    pv.innerHTML = ws.map((w) => `<span class="dchip ${w.min ? '' : 'zero'}">${w.day_no}일차 · ${fmtHM(w.min)}</span>`).join('');
    pvn.innerHTML = ws.filter((w) => !w.min).map((w) => `<div>${w.day_no}일차는 관광 시간이 없어요 (${esc(w.notes.at(-2) || w.notes.at(-1))})</div>`).join('');
    go.disabled = nights(draft.a_date, draft.d_date) === 0 && toMin(draft.d_time) <= toMin(draft.a_time);
    if (go.disabled) document.getElementById('terr').textContent = '출발 시각이 도착 시각보다 빨라요.';
  };
  f.addEventListener('input', sync); f.addEventListener('change', sync);
  wireChips($app, (g) => { if (g === 'intl' || g === 'pace') sync(); else sync(); });
  document.getElementById('prev').onclick = () => { draft.step = 1; viewNew(); };
  sync();
  go.onclick = () => {
    sync(); if (go.disabled) return;
    const n = nights(draft.a_date, draft.d_date), days = n + 1, tr = draftTrip(), def = cityDef(draft.city);
    const trip = normalizeTrip({ id: uid(), country: def.country, city_id: def.id, title: `${def.name} ${n}박 ${days}일`, start: draft.a_date, end: draft.d_date, days, arrive: tr.arrive, depart: tr.depart, domestic: tr.domestic,
      lodging: { name: draft.l_name.trim(), area: draft.l_area }, pace: draft.pace, adults: +draft.adults, kids: +draft.kids, party: draft.kids > 0 ? '가족' : '친구', types: draft.types, opts: tr.opts,
      plan: [], cover_layout: 'node', theme_id: state.theme.id, tips: [], created_at: new Date().toISOString() });
    trip.plan = dayWindows(trip).map((w) => ({ day_no: w.day_no, date: w.date, stops: [] }));
    state.db.trips.unshift(trip); save(); draft.city = null;
    state.day = 1; state.tab = 'plan'; state.planView = 'cards'; state.add = null; nav('#/trip/' + trip.id);
  };
}

// ---------- 여행 보기/편집 ----------
function prep(trip) { // 구버전 보정 + 직접 입력 장소 등록 + 일자 수 맞춤
  normalizeTrip(trip);
  trip.custom_places = trip.custom_places.map((p) => normalizePlace(p, { provider: 'manual' }));
  for (const p of trip.custom_places) state.byId.set(p.id, p);
  const wins = dayWindows(trip);
  trip.plan = wins.map((w, i) => ({ day_no: w.day_no, date: w.date, stops: trip.plan[i]?.stops || [] }));
  return wins;
}
function viewTrip(id) {
  const trip = getTrip(id); if (!trip) return nav('#/');
  const wins = prep(trip);
  document.getElementById('topTitle').textContent = trip.title;
  const tabs = [['plan', '일정'], ['cover', '표지'], ['country', '국가 정보'], ['tips', 'Tip']];
  const A = AIRPORTS[trip.arrive.airport], D = AIRPORTS[trip.depart.airport];
  const dayView = state.tab === 'plan' && state.planView === 'day'; // 하루 요약은 머리말 없이 한 화면에
  document.body.classList.toggle('dayview', dayView);
  $app.innerHTML = `${dayView ? '' : `<h2>${esc(trip.title)}</h2>
    <div class="muted">성인 ${trip.adults}${trip.kids ? ' · 아이 ' + trip.kids : ''} · ${esc(trip.types.join('/'))} · ${PACE[trip.pace].label} 페이스${trip.lodging.area ? ' · 숙소 ' + esc(trip.lodging.area) : ''}</div>
    <div class="flight">${ic('plane')}<div><b>${dlabel(trip.arrive.date)} ${trip.arrive.time}</b><div class="muted">${A.name} 도착</div></div><div class="sp">${ic('right', 'sm')}</div><div style="text-align:right"><b>${dlabel(trip.depart.date)} ${trip.depart.time}</b><div class="muted">${D.name} 출발</div></div></div>
    <div class="seg">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${state.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div>`}
    <div id="pane"></div>`;
  $app.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { state.tab = b.dataset.tab; viewTrip(id); });
  ({ plan: paneplan, cover: paneCover, country: paneCountry, tips: paneTips })[state.tab](trip, document.getElementById('pane'), wins);
}

const usedIdsOf = (trip) => new Set(trip.plan.flatMap((d) => d.stops).map((s) => s.place_id).filter(Boolean));
const stopKind = (s) => (s.type === 'meal' ? 'meal' : state.byId.get(s.place_id)?.kind === 'shop' ? 'shop' : '');
const kindTag = (s) => { const p = state.byId.get(s.place_id); return s.type === 'meal' ? '식사' : p?.custom ? '직접' : KIND[p?.kind] || '일정'; };
const stopMin = (s) => toMin(s.end_time) - toMin(s.start_time);
// 사진이 없으면 빈 회색 박스 대신 장소 종류의 삽화 아이콘(둘러보기와 같은 세트)을 쓴다.
const thumb = (p) => {
  const u = photoUrl(p);
  if (u) return `<div class="im" style="background-image:url('${u}')" role="img" aria-label="${esc(p?.name_ko || '')} 사진"></div>`;
  const kind = ['food', 'shop', 'transit', 'sight'].includes(p?.kind) ? p.kind : 'food';
  return `<div class="im ill ill-${kind}">${iconSvg(p?.ic || KIND_ICON[kind])}</div>`;
};
// 이동/체류 라벨 분리 (AC-COPY-01): "1.3km · 1시간 15분" 같은 라벨 없는 숫자 나열 금지
const moveText = (from, to, kids = 0) => {
  if (!from || !to || from.lat == null || to.lat == null) return '이동 추정 불가';
  const t = travel(from, to, kids);
  return t.km == null ? '이동 추정 불가' : `이동 ${t.min}분 · ${t.km.toFixed(1)}km`;
};
const recMove = (r) => (r.km != null ? `이동 ${r.moveMin ?? '–'}분 · ${r.km.toFixed(1)}km` : '이동 추정 불가');

function paneplan(trip, pane, wins) {
  if (state.planView === 'cards') return planCards(trip, pane, wins);
  const day = trip.plan.find((d) => d.day_no === state.day) || trip.plan[0];
  state.day = day.day_no;
  planDay(trip, pane, wins, day, wins[day.day_no - 1]);
}

// 일자 요약 카드 (기본 보기): 썸네일 가로 스크롤 + 시간 요약
function planCards(trip, pane, wins) {
  pane.innerHTML = `<p class="muted">날짜를 눌러 그날 일정을 꾸미세요. 추천 장소는 참고용이고, 가고 싶은 곳은 검색하거나 직접 넣을 수 있어요.</p>` + trip.plan.map((d) => {
    const w = wins[d.day_no - 1], places = d.stops.filter((s) => s.type !== 'move'), warns = dayWarnings(d.stops, w, trip.pace, state.byId, trip.kids);
    const used = usedMinutes(d.stops, w), tag = { arrival: '도착일', departure: '귀국일', both: '당일 왕복' }[w.kind];
    const first = d.stops[0], last = d.stops.at(-1);
    return `<a class="card daycard" href="javascript:void(0)" data-open="${d.day_no}" role="button">
      <div class="hd"><b>${d.day_no}일차 <span class="muted" style="font-weight:400">${dlabel(w.date)}${tag ? ' · ' + tag : ''}</span></b>${ic('right', 'sm')}</div>
      <div class="sub">${w.min ? `가용 ${fromMin(w.start)}–${fromMin(w.end)} (${fmtDur(w.min)})` : '관광 어려움'}${d.stops.length ? ` · ${first.start_time}–${last.end_time} · ${placeCount(d.stops)}곳 · ${fmtDur(used)} 사용` : ''}${warns.length ? ` · <span class="bad">주의 ${warns.length}</span>` : ''}</div>
      ${places.length ? `<div class="thumbs">${places.map((s) => { const p = state.byId.get(s.place_id); return `<div class="th">${thumb(s.type === 'meal' && !p ? { kind: 'food' } : p)}<div class="nm">${esc(s.label)}</div></div>`; }).join('')}</div>` : `<div class="empty">${w.min ? '아직 비어 있어요 · 눌러서 장소를 담아 보세요' : esc(w.notes.at(-1))}</div>`}
    </a>`;
  }).join('') + extrasCard(trip) + affiliateCard();
  pane.querySelectorAll('[data-open]').forEach((a) => a.onclick = () => { state.day = +a.dataset.open; state.planView = 'day'; state.add = null; state.open = null; viewTrip(trip.id); });
  wireExtras(trip, pane);
}

// 공유 링크 + 오프라인 팩 (AC-SHARE-01, AC-OFF-04) — 일정 요약 하단
function extrasCard(trip) {
  const m = packMeta(trip.id);
  return `<section class="card" aria-labelledby="share-h"><h3 id="share-h">공유 · 오프라인</h3>
    <p class="muted">링크를 받은 사람은 편집 없이 일정 요약만 볼 수 있어요. 오프라인 저장은 이 기기에 일정·가이드·국가 정보를 내려받아요.</p>
    <div class="row wrap"><button class="ghost" data-share style="flex:1">${ic('check')} 공유 링크 복사</button>
      <button class="ghost" data-pack style="flex:1">${ic('down')} ${m ? '오프라인 다시 저장' : '이 여행 오프라인 저장'}</button></div>
    <div class="pack" id="pack"><div class="meta" id="packmeta">${m ? `오프라인 저장됨 · ${fmtBytes(m.bytes)} · 파일 ${m.files}개 · ${new Date(m.saved_at).toLocaleDateString('ko-KR')}` : '아직 저장하지 않았어요.'}</div>
      <div class="pg" id="packpg" hidden><i></i></div>
      ${m ? `<button class="sm danger" data-unpack>팩 삭제 (용량 회수)</button>` : ''}</div>
    <div class="muted" id="sharen" role="status"></div></section>`;
}
// 제휴 카드 (AC-AF-01): 타임라인 컨테이너 밖, 최하단. 가격·최저가 문구 없음, /go/{partner} 경유.
function affiliateCard() {
  return `<div class="affiliate" data-affiliate><div class="af-hd"><span class="af-tag">제휴</span> 숙소 예약</div>
    <p>숙소를 예약할 때 아래 링크를 거치면 저희가 수수료를 받을 수 있어요. 요금은 예약 사이트에서 확인하세요.</p>
    <a class="af-link" href="/go/hotels" target="_blank" rel="sponsored noopener">제휴 숙소 사이트 열기 ${ic('right', 'sm')}</a></div>`;
}
function wireExtras(trip, pane) {
  const n = pane.querySelector('#sharen');
  pane.querySelector('[data-share]').onclick = async () => {
    const url = shareUrl(trip, location.origin + location.pathname);
    try { await navigator.clipboard.writeText(url); n.textContent = '공유 링크를 복사했어요.'; }
    catch { n.textContent = url; }
  };
  const btn = pane.querySelector('[data-pack]');
  if (btn) btn.onclick = async () => {
    btn.disabled = true;
    const pg = pane.querySelector('#packpg'), bar = pg.querySelector('i'), meta = pane.querySelector('#packmeta');
    pg.hidden = false;
    try {
      const m = await savePack(trip, state.places, (pct) => { bar.style.width = pct + '%'; meta.textContent = `저장 중… ${pct}%`; });
      meta.textContent = `오프라인 저장됨 · ${fmtBytes(m.bytes)} · 파일 ${m.files}개 · 장소 ${m.places}곳`;
      toast('오프라인 저장을 마쳤어요');
    } catch (e) { meta.textContent = '저장하지 못했어요: ' + e.message; }
    btn.disabled = false;
    viewTrip(trip.id);
  };
  const un = pane.querySelector('[data-unpack]');
  if (un) un.onclick = async () => { await deletePack(trip.id); toast('오프라인 팩을 지웠어요'); viewTrip(trip.id); };
}

function availBar(day, w) {
  const span = Math.max(1, w.end - w.start), seg = day.stops.map((s) => {
    const a = toMin(s.start_time), b = toMin(s.end_time), l = Math.max(0, (a - w.start) / span * 100), wd = Math.min(100 - l, (b - Math.max(a, w.start)) / span * 100);
    return `<i class="${s.type === 'move' ? 'mv' : s.type === 'meal' ? 'ml' : ''}" style="left:${l.toFixed(2)}%;width:${Math.max(wd, 0.8).toFixed(2)}%"></i>`;
  }).join('');
  return `<div class="bar-track" aria-hidden="true">${seg}</div>`;
}

function planDay(trip, pane, wins, day, w) {
  const stops = day.stops, used = usedMinutes(stops, w), left = w.min - used, kids = trip.kids, over = overMinutes(stops, w);
  const warns = dayWarnings(stops, w, trip.pace, state.byId, kids).filter((m) => !m.startsWith('시간 초과')), P = PACE[trip.pace], max = paceMax(trip.pace, kids);
  const commit = (list, msg) => { day.stops = list; save(); if (msg) toast(msg); viewTrip(trip.id); };
  const real = stops.filter((s) => s.type !== 'move');
  const tag = { arrival: '도착일', departure: '귀국일', both: '당일 왕복' }[w.kind];
  const note = w.notes.filter((n) => /숙소 출발|도착 →/.test(n)).join(' · ');
  pane.innerHTML = `<div class="row backrow"><a href="javascript:void(0)" class="back" data-a="back">${ic('left', 'sm')} 전체 일정</a><span class="muted sp" style="text-align:right">${esc(trip.title)}</span></div>
    <div class="tabs" id="tabs" role="tablist">${trip.plan.map((d) => `<button class="tab ${d.day_no === day.day_no ? 'on' : ''}" role="tab" aria-selected="${d.day_no === day.day_no}" data-day="${d.day_no}">${d.day_no}일차<small>${dlabel(d.date).replace(/\(.\)/, '')}</small></button>`).join('')}</div>
    <div class="card avail">
      <div class="head"><span>${over ? `<b class="over">+${over}분 초과</b>` : `<b>${w.min ? fmtDur(Math.max(0, left)) : '0분'}</b> <span class="muted">남음</span>`}${tag ? ` <span class="muted">· ${tag}</span>` : ''}</span><span class="muted">${w.min ? `가용 ${fmtDur(w.min)} · 사용 ${fmtDur(used)}` : '가용 시간 없음'}</span></div>
      ${w.min ? availBar(day, w) : ''}
      <div class="muted notes">${ic('clock', 'sm')} ${w.min ? `${fromMin(w.start)}–${fromMin(w.end)}${w.meal ? ` (식사 ${w.meal}분 제외)` : ''}${note ? ' · ' + esc(note) : ''}` : esc(w.notes.at(-2) || w.notes.at(-1))}</div>
      ${placeCount(stops) > max ? `<div class="warn">${ic('alert', 'sm')}<span>${max}곳까지 권장 · 지금 ${placeCount(stops)}곳</span></div>` : ''}
      ${over ? `<div class="warn">${ic('alert', 'sm')}<span>${stops.at(-1).end_time}까지 이어져요 · 가용 ${fromMin(w.end)}까지 (자동으로 지우지 않아요)</span></div>` : ''}
      ${warns.filter((m) => !/곳까지 권장/.test(m)).map((m) => `<div class="warn">${ic('alert', 'sm')}<span>${esc(m)}</span></div>`).join('')}
    </div>
    ${w.min === 0 ? zeroDay(trip, w, day) : ''}
    <div class="row daybar" style="margin:8px 0">
      <button data-a="add">${ic('plus')} 장소 추가</button>
      <button class="ghost" data-a="fill" ${w.min ? '' : 'disabled'}>${ic('wand')} 자동 채우기</button>
      ${stops.length ? `<button class="ghost" data-mode="${state.dayMode === 'detail' ? 'compact' : 'detail'}" aria-pressed="${state.dayMode === 'detail'}" aria-label="${state.dayMode === 'detail' ? '압축 보기' : '상세 보기'}">${state.dayMode === 'detail' ? '압축' : '상세'}</button>
        <button class="ghost" data-a="reflow" aria-label="이동 시간 포함해서 다시 계산">${ic('refresh')}</button>` : ''}</div>
    ${stops.length ? (state.dayMode === 'compact' ? compactTl(stops, w) : detailList(trip, stops, w)) : (w.min ? `<div class="card muted" style="text-align:center">비어 있는 날이에요. 장소를 담거나 자동으로 채워 보세요.</div>` : '')}
    ${state.add ? addSheet(trip, w, day) : ''}`;

  const $ = (s) => pane.querySelector(s);
  $('[data-a=back]').onclick = () => { state.planView = 'cards'; viewTrip(trip.id); };
  pane.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => { state.day = +b.dataset.day; state.add = null; state.open = null; viewTrip(trip.id); });
  const tabs = $('#tabs'), on = tabs.querySelector('.tab.on'); // 활성 탭을 가운데로 (일수가 많아 넘칠 때)
  if (on && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = on.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2;
  const mt = pane.querySelector('[data-mode]'); if (mt) mt.onclick = () => { state.dayMode = mt.dataset.mode; viewTrip(trip.id); };
  $('[data-a=add]').onclick = () => { state.add = 'rec'; viewTrip(trip.id); };
  $('[data-a=fill]').onclick = () => {
    const out = fillDay(state.places, state.byId, { stops, win: w, usedIds: usedIdsOf(trip), types: trip.types, kids, pace: trip.pace, base: tripBase(trip, state.places), cityName: cityDef(trip.city_id).name });
    if (out.length === stops.length) return toast('더 넣을 만한 곳이 없어요');
    commit(out, '이 날을 채웠어요');
  };
  const rf = $('[data-a=reflow]'); if (rf) rf.onclick = () => commit(reflowDay(stops, state.byId, kids), '다시 계산했어요');
  wireZero(trip, pane, w, day);
  wireAdd(trip, pane, w, day, commit);
  wireStops(trip, pane, day, real, commit, w);
}

// 가용 0분인 날 (S5): 사유 + 야식/식사 추천 + 다음(또는 전) 날로 미리 담기
function zeroTarget(trip, w, day) { return trip.plan.find((d) => d.day_no === (w.kind === 'departure' ? day.day_no - 1 : day.day_no + 1)); }
function zeroDay(trip, w, day) {
  const fm = firstMeal(state.places, trip, w), tg = zeroTarget(trip, w, day);
  const reason = w.kind === 'arrival' || w.kind === 'both' ? `숙소에 도착해 준비를 마치면 약 ${fromMin(w.start)}이에요` : esc(w.notes.at(-2) || '');
  return `<div class="card zero"><b>이 날은 관광 시간이 없어요</b><div class="muted">${reason}. 아래 야식·식사 정도만 가볍게 어때요?</div>
    ${fm.items.map((x) => `<div class="rec">${thumb(x.place)}<div class="b"><b>${esc(x.place.name_ko)}</b><div class="why">${esc(x.place.area)} · ${x.place.open ? '영업 ' + x.place.open.join('–') : '영업시간 확인'} · ${moveText(tripBase(trip, state.places), x.place, trip.kids)}</div></div>${tg ? `<button class="sm soft" data-zadd="${x.place.id}">${tg.day_no}일차에 담기</button>` : ''}</div>`).join('')}
    ${tg ? `<button class="cta" style="margin-top:16px" data-a="prefill">${tg.day_no}일차로 미리 담기</button>` : ''}</div>`;
}
function wireZero(trip, pane, w, day) {
  const tg = zeroTarget(trip, w, day); if (!tg) return;
  const go = () => { state.day = tg.day_no; state.add = 'rec'; state.open = null; viewTrip(trip.id); };
  const pre = pane.querySelector('[data-a=prefill]'); if (pre) pre.onclick = go;
  pane.querySelectorAll('[data-zadd]').forEach((b) => b.onclick = () => {
    const p = state.byId.get(b.dataset.zadd), tw = dayWindows(trip)[tg.day_no - 1];
    tg.stops = appendWithMove(tg.stops, p, tw, trip, p.kind === 'food' ? 'meal' : 'place'); save(); toast(`${tg.day_no}일차에 담았어요`); state.day = tg.day_no; viewTrip(trip.id);
  });
}

// 도착 직후 첫 식사 + 가까운 곳 (장소 추가 시트의 추천 탭 머리)
function arrivalCard(trip, w, day) {
  const fm = firstMeal(state.places, trip, w), base = tripBase(trip, state.places);
  const near = w.min > 0 ? recommend(state.places, state.byId, { stops: day.stops, win: w, usedIds: usedIdsOf(trip), types: trip.types, kids: trip.kids, pace: trip.pace, base, sort: 'near', limit: 3 }) : [];
  const row = (p, sub) => `<div class="rec">${thumb(p)}<div class="b"><b>${esc(p.name_ko)}</b><div class="why">${esc(sub)}</div></div><button class="sm soft" data-addp="${p.id}" data-type="${p.kind === 'food' ? 'meal' : 'place'}">담기</button></div>`;
  return `<div class="sec-s">${ic('plane', 'sm')} 도착 직후</div><div class="muted">${esc(fm.text)}</div>
    ${fm.items.map((x) => row(x.place, `${x.place.area} · 체류 ${fmtDur(x.place.stay_min)} · ${moveText(base, x.place, trip.kids)}`)).join('')}
    ${near.length ? `<div class="sec-s">${esc(base.label)}에서 가까운 순</div>${near.map((r) => row(r.place, `${recMove(r)} · ${r.reasons.join(' · ')}`)).join('')}` : ''}`;
}

function compactTl(stops, w) {
  return `<div class="tl" id="timeline">${stops.map((s) => {
    if (s.type === 'move') return `<div class="tl-row mv"><span class="t">${s.start_time}</span><span class="dot"></span><span class="n">${esc(s.label)}${s.mode === '이동 추정 불가' || s.label === '이동 추정 불가' ? '' : ' ' + stopMin(s) + '분'}</span></div>`;
    const bad = toMin(s.end_time) > w.end || toMin(s.start_time) < w.start || /영업|휴무/.test(s.note || '');
    return `<button class="tl-row ${stopKind(s)} ${bad ? 'bad' : ''}" data-x="${s.id}" aria-expanded="${state.open === s.id}"><span class="t">${s.start_time}</span><span class="dot"></span><span class="n">${esc(s.label)}</span><span class="stay">${stopMin(s)}분</span>${ic(state.open === s.id ? 'up' : 'down', 'sm chev')}</button>${state.open === s.id ? `<div class="tl-act" data-act-for="${s.id}"></div>` : ''}`;
  }).join('')}</div>`;
}

// 역사 이야기: story 가 있는 장소만 접기/펼치기 섹션을 그린다 (없으면 빈 문자열)
function histSection(p) {
  const items = storyEntries(p);
  if (!items.length) return '';
  return `<details class="hist"><summary>역사 이야기<span class="muted">${items.length}</span></summary>
    ${items.map((it) => `<div class="hist-i">${it.title ? `<b>${esc(it.title)}</b>` : ''}<p>${esc(it.story)}</p></div>`).join('')}</details>`;
}

// 한국 후기·영상 링크 — 장소 JSON 을 처음 펼칠 때 한 번만 가져와 캐시한다.
// (places-index.json 에는 링크가 없어 상세 파일을 지연 로드; 오프라인 팩에 포함된 파일이라 끊겨도 열린다)
function krSection(p, trip) {
  if (!p || p.custom || !p.code) return '';
  const refs = state.kr.get(p.code);
  if (refs === undefined) {
    state.kr.set(p.code, null);
    fetch(`${CITY}places/${encodeURIComponent(p.code)}.json`, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = (j && Array.isArray(j.kr_refs) ? j.kr_refs : []).filter((x) => x && x.url && x.title);
        state.kr.set(p.code, list.length ? list : null);
        if (list.length) viewTrip(trip.id); // 링크가 있으면 한 번 다시 그려서 섹션을 붙인다
      })
      .catch(() => { });
    return '';
  }
  if (!refs || !refs.length) return '';
  return `<div class="krrefs"><b>한국 후기·영상</b>${refs.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><span class="krt ${esc(r.type)}">${r.type === 'youtube' ? '유튜브' : '블로그'}</span><span>${esc(r.title)}</span></a>`).join('')}</div>`;
}

// 상세 보기: 접힌 카드는 한 줄(56px). 펼치면 사진·설명·팁·편집
function detailList(trip, stops, w) {
  return `<div class="dl">${stops.map((s) => {
    if (s.type === 'move') return `<div class="mvrow muted">${ic('move', 'sm')} ${esc(s.label)} ${s.start_time}–${s.end_time}${s.note ? ' · ' + esc(s.note) : ''}</div>`;
    const p = state.byId.get(s.place_id), ph = p && state.photos.get(p.id)?.[0], open = state.open === s.id;
    return `<details class="stop" data-sid="${s.id}" ${open ? 'open' : ''}><summary class="srow"><span class="kind ${stopKind(s)}">${kindTag(s)}</span><b class="n">${esc(s.label)}</b><span class="t">${s.start_time}–${s.end_time}</span></summary>
      <div class="sbody">${s.note ? `<div class="muted">${esc(s.note)}</div>` : ''}
        ${p && !p.custom ? `<p>${esc(p.lead || '')}</p>${ph ? `<img class="photo" loading="lazy" src="${CITY}${ph.file}" alt="${esc(ph.caption)}"><div class="credit">${esc(ph.credit)}</div>` : `<div class="photo-ill ill ill-${esc(p.kind)}">${iconSvg(p.ic || KIND_ICON[p.kind])}<span class="illnote">삽화 · 사진 없음</span></div>`}${p.tip ? `<p>${esc(p.tip)}</p>` : ''}${(p.practical || []).map((x) => `<p>• ${esc(x)}</p>`).join('')}${krSection(p, trip)}${histSection(p)}` : ''}
        ${p ? `<a class="maplink" href="${mapsAdapter.link(p)}" target="_blank" rel="noopener">${ic('pin', 'sm')} 지도에서 보기</a>` : ''}
        ${open ? `<div class="tl-act" data-act-for="${s.id}"></div>` : ''}</div></details>`;
  }).join('')}</div>`;
}

// 선택한 일정 행의 편집 도구 (순서/체류±15/시작/메모/다른 날로 이동/삭제) — 계산은 edit.js
function wireStops(trip, pane, day, real, commit, w) {
  const kids = trip.kids;
  pane.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => { state.open = state.open === b.dataset.x ? null : b.dataset.x; viewTrip(trip.id); });
  pane.querySelectorAll('details.stop').forEach((d) => d.addEventListener('toggle', () => { const id = d.dataset.sid; if (d.open && state.open !== id) { state.open = id; viewTrip(trip.id); } else if (!d.open && state.open === id) state.open = null; }));
  const host = pane.querySelector('[data-act-for]'); if (!host) return;
  const s = real.find((x) => x.id === host.dataset.actFor); if (!s) return;
  const i = real.indexOf(s), id = s.id;
  host.innerHTML = `<div class="row wrap"><label class="inl" for="e_start">시작</label><input id="e_start" type="time" data-f="start" value="${s.start_time}" style="width:auto">
      <button class="sm ghost" data-f="less" aria-label="체류 15분 줄이기">−15분</button><span class="stay-now">${stopMin(s)}분</span><button class="sm ghost" data-f="more" aria-label="체류 15분 늘리기">+15분</button></div>
    <div class="row wrap"><button class="sm ghost" data-f="up" ${i === 0 ? 'disabled' : ''} aria-label="위로">${ic('up', 'sm')}</button><button class="sm ghost" data-f="down" ${i === real.length - 1 ? 'disabled' : ''} aria-label="아래로">${ic('down', 'sm')}</button>
      <input class="sp" data-f="note" aria-label="메모" maxlength="80" placeholder="메모 (예: 예약 필요)" value="${esc(s.note && !/영업|휴무/.test(s.note) ? s.note : '')}"></div>
    <div class="row"><select data-f="move" class="sp" aria-label="다른 날로 이동"><option value="">다른 날로 이동…</option>${trip.plan.filter((d) => d.day_no !== day.day_no).map((d) => `<option value="${d.day_no}">${d.day_no}일차 (${dlabel(d.date)})</option>`).join('')}</select><button class="sm danger" data-f="del">${ic('trash', 'sm')} 삭제</button></div>`;
  const f = (n) => host.querySelector(`[data-f=${n}]`);
  f('start').onchange = () => { if (!f('start').value) return; commit(setStart(day.stops, id, f('start').value, state.byId, kids)); };
  f('less').onclick = () => commit(shiftStay(day.stops, id, -15, state.byId, kids));
  f('more').onclick = () => commit(shiftStay(day.stops, id, 15, state.byId, kids));
  f('up').onclick = () => commit(moveStop(day.stops, id, -1, state.byId, kids));
  f('down').onclick = () => commit(moveStop(day.stops, id, 1, state.byId, kids));
  f('note').onchange = () => { day.stops = setNote(day.stops, id, f('note').value); save(); toast('메모를 저장했어요'); };
  f('del').onclick = () => { if (confirm('이 일정을 삭제할까요?')) { state.open = null; commit(deleteStop(day.stops, id, state.byId, kids)); } };
  f('move').onchange = (e) => {
    const to = trip.plan.find((d) => d.day_no === +e.target.value); if (!to) return;
    const [a, b] = moveToDay(day.stops, to.stops, id, dayWindows(trip)[to.day_no - 1].start, state.byId, kids);
    day.stops = a; to.stops = b; state.open = null; state.day = to.day_no; save(); toast(`${to.day_no}일차로 옮겼어요`); viewTrip(trip.id);
  };
}

// ---------- 장소 추가 시트: 추천 / 검색 / 직접 입력 ----------
function addSheet(trip, w, day) {
  return `<div class="sheet"><div class="sheet-bd" data-a="close"></div><div class="sheet-body" role="dialog" aria-modal="true" aria-label="${day.day_no}일차 장소 추가">
    <div class="sheet-hd"><b>${day.day_no}일차 장소 추가</b><button class="ghost" data-a="close" aria-label="닫기">${ic('x')}</button></div>${addPanel(trip, w, day)}</div></div>`;
}
function addPanel(trip, w, day) {
  const seg = `<div class="seg" style="margin-top:0" role="tablist">${[['rec', '추천'], ['search', '검색'], ['manual', '직접 입력']].map(([k, n]) => `<button role="tab" aria-selected="${state.add === k}" data-add="${k}" class="${state.add === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  if (state.add === 'rec') {
    const base = tripBase(trip, state.places);
    const kinds = [['all', '명소'], ['food', '맛집'], ['shop', '쇼핑']];
    const rs = recommend(state.places, state.byId, { stops: day.stops, win: w, usedIds: usedIdsOf(trip), types: trip.types, kids: trip.kids, pace: trip.pace, kind: state.addKind, base, limit: 6, sort: 'near' });
    const arrival = (w.kind === 'arrival' || w.kind === 'both') && !day.stops.length && w.min > 0;
    return `<div class="addp">${seg}<div class="chips" style="margin-bottom:8px">${kinds.map(([k, n]) => chipBtnPlain(k, n, state.addKind === k)).join('')}</div>
      <div class="muted">남은 ${fmtDur(Math.max(0, w.min - usedMinutes(day.stops, w)))} 안에 끝나는 곳만, 영업 중인 곳을 가까운 순으로 보여줘요. 참고용이에요.</div>
      ${arrival ? arrivalCard(trip, w, day) : ''}
      ${rs.map((r) => `<div class="rec">${thumb(r.place)}<div class="b"><b>${esc(r.place.name_ko)}</b><div class="why">${recMove(r)} · ${esc(r.reasons.join(' · '))}</div></div><button class="sm soft" data-addp="${r.place.id}" data-type="${r.place.kind === 'food' ? 'meal' : 'place'}">담기</button></div>`).join('') || '<div class="muted" style="padding:16px 0">남은 시간에 맞는 추천이 없어요. 검색하거나 직접 입력해 보세요.</div>'}</div>`;
  }
  if (state.add === 'search') {
    return `<div class="addp">${seg}<div class="row"><label class="sr-only" for="q">장소 검색</label><input id="q" placeholder="장소명 · 지역 · 태그 (예: 와이탄, 푸동, 미식)" value="${esc(state.q)}" autocomplete="off"><button id="qb" aria-label="검색">${ic('search')}</button></div>
      <div id="qn" class="muted" role="status"></div><div id="qr" class="muted" style="padding:8px 0">검색어를 입력해 보세요.</div></div>`;
  }
  return `<div class="addp">${seg}<form id="mf" novalidate><p class="muted">DB에 없는 곳도 넣을 수 있어요. 좌표가 없으면 이동 시간은 "추정 불가"로 표시돼요.</p>
    <label class="f" for="m_name">장소 이름</label><input id="m_name" name="name" value="${esc(state.q)}" placeholder="예) 동네 국숫집" autocomplete="off">
    <div class="row"><div class="sp"><label class="f" for="m_stay">체류시간(분)</label><input id="m_stay" type="number" name="stay" min="15" step="5" value="60"></div><div class="sp"><label class="f" for="m_start">시작 시각 (선택)</label><input id="m_start" name="start" type="time"></div></div>
    <label class="f" for="m_note">메모 (선택)</label><input id="m_note" name="note" maxlength="80" placeholder="예) 친구 추천, 현금만 받음" autocomplete="off">
    <div class="err" id="merr" role="alert"></div><button class="cta" style="margin-top:16px" type="submit">${ic('plus')} 이 날에 추가</button></form></div>`;
}
const chipBtnPlain = (k, n, on) => `<button type="button" class="chip ${on ? 'on' : ''}" data-kind="${k}" aria-pressed="${on}">${n}</button>`;

function wireAdd(trip, pane, w, day, commit) {
  pane.querySelectorAll('[data-a=close]').forEach((b) => b.onclick = () => { state.add = null; viewTrip(trip.id); });
  pane.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => { state.add = b.dataset.add; viewTrip(trip.id); });
  pane.querySelectorAll('[data-kind]').forEach((c) => c.onclick = () => { state.addKind = c.dataset.kind; viewTrip(trip.id); });
  const put = (p, type, start = null) => { state.open = null; commit(appendWithMove(day.stops, p, w, trip, type, start), `${p.name_ko} 추가`); };
  const bind = (root) => root.querySelectorAll('[data-addp]').forEach((b) => b.onclick = () => put(state.byId.get(b.dataset.addp), b.dataset.type));
  bind(pane);
  const q = pane.querySelector('#q');
  if (q) {
    const run = async () => {
      state.q = q.value; const out = pane.querySelector('#qr');
      if (!state.q.trim()) { out.textContent = '검색어를 입력해 보세요.'; return; }
      const { places: hits, notice } = await searchAll(state.local, state.extras, state.q, { bias: tripBase(trip, state.places), limit: 8 });
      const used = usedIdsOf(trip);
      pane.querySelector('#qn').textContent = notice || '';
      out.className = '';
      out.innerHTML = (hits.length ? '' : '<div class="muted">찾는 곳이 없어요.</div>') + hits.slice(0, 8).map((p) => `<div class="rec">${thumb(p)}<div class="b"><b>${esc(p.name_ko)}</b><div class="why">${esc(KIND[p.kind])} · ${esc(p.area)} · 체류 ${fmtDur(p.stay_min)}${used.has(p.id) ? ' · 이미 담김' : ''}</div></div><button class="sm soft" data-addp="${p.id}" data-type="${p.kind === 'food' ? 'meal' : 'place'}">담기</button></div>`).join('')
        + `<div class="rec"><div class="b"><b>${hits.length ? '찾는 곳이 없나요?' : '직접 입력으로 추가'}</b><div class="why">'${esc(state.q)}' 을(를) 직접 입력해서 넣을 수 있어요</div></div><button class="sm ghost" data-goman>직접 입력으로 추가</button></div>`;
      bind(out); out.querySelector('[data-goman]').onclick = () => { state.add = 'manual'; viewTrip(trip.id); };
    };
    pane.querySelector('#qb').onclick = run; q.oninput = debounce(run, 300); q.onkeydown = (e) => e.key === 'Enter' && (e.preventDefault(), run(), q.blur());
    if (state.q) run();
  }
  const mf = pane.querySelector('#mf');
  if (mf) mf.onsubmit = (e) => {
    e.preventDefault();
    const name = mf.elements.name.value.trim();
    if (!name) { pane.querySelector('#merr').textContent = '장소 이름을 입력해 주세요.'; return; }
    const ms = new ManualSource(trip.custom_places);
    const p = ms.create({ name, area: '기타', stay_min: mf.elements.stay.value, note: mf.elements.note.value.trim() });
    state.byId.set(p.id, p); state.q = '';
    put(p, 'place', mf.elements.start.value || null);
  };
}

// 하루 끝에 추가하되 이동 블록이 필요하면 reflow 로 맞춤 (start: 사용자가 정한 시작 시각이면 그 시각 고정)
function appendWithMove(stops, p, w, trip, type, start = null) {
  const list = appendPlace(stops.filter((s) => s.type !== 'move'), p, w, type, start);
  return reflowDay(list, state.byId, trip.kids);
}

// ---------- 국가 정보 (S8): 입국·출국 절차 ----------
const daysSince = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? Math.floor((Date.now() - t) / 864e5) : null; };
function procSection(p, kind) {
  const stale = daysSince(p.verified_at);
  const badge = stale == null ? '<span class="pill warn">확인일 미기재</span>' : stale > 365 ? '<span class="pill warn">확인한 지 1년 넘음</span>' : stale > 180 ? '<span class="pill warn">정보가 오래되었어요</span>' : '';
  const src = (p.source_urls || (p.source_url ? [p.source_url] : [])).filter(Boolean);
  return `<section class="card" data-proc="${kind}" aria-labelledby="ph-${kind}">
    <h3 id="ph-${kind}">${kind === 'entry' ? '입국 절차' : '출국 절차'}</h3>
    ${p.title ? `<p class="muted">${esc(p.title)}</p>` : ''}
    <ol class="steps">${(p.steps || []).map((s) => `<li><span>${esc(s.text)}</span><b>${s.minutes ? s.minutes + '분' : ''}</b></li>`).join('')}</ol>
    <div class="muted">${p.total_min || p.est_minutes ? `예상 ${fmtDur(p.total_min || p.est_minutes)}` : ''}${p.arrive_before_min ? ` · 공항 ${p.arrive_before_min}분 전 도착 권장` : ''} ${badge}</div>
    ${src.length ? `<div class="src">출처 ${src.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(new URL(u).host)}</a>`).join(' · ')}</div>` : '<div class="src">출처 미기재</div>'}
    <div class="muted">확인일 ${p.verified_at || '미기재'}</div>
  </section>`;
}
function paneCountry(trip, pane) {
  const cc = trip.country || 'CN', data = state.countries?.[cc];
  if (!data?.proc?.length) { pane.innerHTML = `<div class="card">국가 정보를 불러오지 못했어요. 연결을 확인해 주세요.</div>`; return; }
  const entries = data.proc.filter((p) => p.type === 'entry'), exits = data.proc.filter((p) => p.type === 'exit');
  const e = entries[0] || {}, x = exits[0] || {};
  const others = data.proc.filter((p) => !['entry', 'exit'].includes(p.type));
  pane.innerHTML = `<h2>${esc(data.info?.name_ko || cc)} 입국·출국</h2>
    <p class="muted">${esc(data.info?.currency || '')} · ${esc(data.info?.timezone || '')} · 공식 출처 기준. 출발 전 다시 확인하세요.</p>
    ${procSection(e, 'entry')}${procSection(x, 'exit')}
    ${others.length ? `<section class="card"><h3>알아 두기</h3>${others.map((p) => `<details class="hist"><summary>${esc(p.title)}</summary><p>${esc(p.body_md || '')}</p>${p.source_url ? `<div class="src"><a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">출처</a></div>` : ''}</details>`).join('')}</section>` : ''}
    <section class="card"><h3>회화</h3>${(data.phrases || []).slice(0, 10).map((p) => `<div class="phrase"><b>${esc(p.title || '')}</b><span class="say">${esc(p.body_md || '')}</span></div>`).join('') || '<p class="muted">회화 데이터가 아직 없어요.</p>'}</section>`;
}

// ---------- 표지 ----------
const shortLabel = (l) => { const h = l.split(' · ')[0]; const t = h.length >= 2 ? h : l; return t.length > 14 ? t.slice(0, 13) + '…' : t; };
function coverInput(trip) {
  return { title: trip.title, subtitle: `${trip.start} ~ ${trip.end}`,
    days: trip.plan.map((d) => ({ day_no: d.day_no, color: dayColor(state.theme, d.day_no),
      stops: d.stops.filter((s) => s.type === 'place' || (s.type === 'meal' && s.place_id)).map((s) => {
        const p = state.byId.get(s.place_id); return { code: p?.code, label: shortLabel(state.shortNames[p?.code] || s.label), lat: p?.lat, lng: p?.lng, photo: photoUrl(p) };
      }) })) };
}
function paneCover(trip, pane) {
  const layouts = listCovers();
  pane.innerHTML = `<div class="cover-frame cover-${document.documentElement.dataset.theme || 'travelbook'} enter">${getCover(trip.cover_layout).render(coverInput(trip), state.theme)}</div>
    <label class="f">표지 시안</label><div class="chips" id="lay">${layouts.map((l) => `<span class="chip ${l.id === trip.cover_layout ? 'on' : ''}" data-v="${l.id}">${esc(l.name)}</span>`).join('')}</div>
    <p class="muted">시안은 테마와 별개예요. 테마는 <a href="#/settings">설정</a>에서 바꿔요 (지금: ${esc(state.theme.name)}).</p>`;
  pane.querySelectorAll('#lay .chip').forEach((c) => c.onclick = () => { trip.cover_layout = c.dataset.v; save(); viewTrip(trip.id); });
}

// ---------- Tip ----------
function paneTips(trip, pane) {
  const opts = trip.plan.flatMap((d) => d.stops).filter((s) => s.place_id).map((s) => s.place_id);
  const uniq = [...new Set(opts)];
  pane.innerHTML = `<form id="tf" class="card" novalidate><h3>나만의 Tip 남기기</h3>
    <label class="f" for="tp_place">장소</label><select id="tp_place" name="place"><option value="">여행 전체</option>${uniq.map((i) => `<option value="${i}">${esc(state.byId.get(i).name_ko)}</option>`).join('')}</select>
    <label class="f" for="tp_text">Tip (최대 ${TIP_MAX}자)</label><textarea id="tp_text" name="text" maxlength="${TIP_MAX + 50}" placeholder="예) 야경은 일몰 30분 뒤가 제일 예뻐요"></textarea><div class="counter" id="ct">0/${TIP_MAX}</div>
    <label class="f" for="tp_url">참고 링크 (선택)</label><input id="tp_url" name="url" inputmode="url" placeholder="https://">
    <div class="err" id="terr"></div><button class="cta" type="submit">Tip 저장</button>
    <p class="muted">이 기기에만 저장돼요. 사진·파일 업로드와 공개 게시는 지원하지 않아요.</p></form>
    ${trip.tips.map((t) => `<div class="tip"><div class="muted">${t.place_id ? esc(state.byId.get(t.place_id)?.name_ko || '') : '여행 전체'}</div>${esc(t.text)}${t.url ? `<div><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(new URL(t.url).host)}</a></div>` : ''}
      <button class="sm danger" data-del="${t.id}">삭제</button></div>`).join('')}`;
  const f = document.getElementById('tf');
  f.elements.text.oninput = () => { const n = f.elements.text.value.trim().length; const c = document.getElementById('ct'); c.textContent = `${n}/${TIP_MAX}`; c.style.color = n > TIP_MAX ? 'var(--warn)' : ''; };
  f.onsubmit = (e) => {
    e.preventDefault();
    const r = validateTip({ text: f.elements.text.value, url: f.elements.url.value });
    if (!r.ok) { document.getElementById('terr').textContent = r.errors.join(' '); return; }
    trip.tips.unshift({ id: uid(), place_id: f.elements.place.value || null, ...r.tip, created_at: new Date().toISOString() });
    save(); toast('Tip을 저장했어요'); viewTrip(trip.id);
  };
  pane.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { trip.tips = trip.tips.filter((t) => t.id !== b.dataset.del); save(); viewTrip(trip.id); });
}

boot().catch((e) => { $app.innerHTML = `<div class="warn">불러오지 못했어요: ${esc(e.message)}<br>scripts/serve.mjs 로 실행해 주세요 (README).</div>`; });
