// 테마 JSON -> CSS 변수. 색·폰트·모서리는 모두 data/themes/*.json 에서 온다 (코드에 하드코딩 금지).
const BASE = '../data/themes/';
export async function listThemes() { return (await fetch(BASE + 'index.json')).json(); }
// 파일 → 디자인 v2 테마 키 (themes.css 의 [data-theme] 와 1:1)
export const THEME_KEY = { 'default-yellow.json': 'travelbook', 'resort.json': 'resort', 'ocean.json': 'ocean', 'kyoto.json': 'wafu' };
export async function loadTheme(file = 'default-yellow.json') {
  const theme = await (await fetch(BASE + file)).json();
  document.documentElement.dataset.theme = THEME_KEY[file] || 'travelbook';
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.colors || {})) r.setProperty('--' + k, v);
  for (const [k, v] of Object.entries(theme.dayColors || {})) r.setProperty('--' + k, v);
  if (theme.font) { // 폰트는 app/fonts 로컬 번들(style.css @font-face) — 외부 CDN 없음
    r.setProperty('--font-title', `'${theme.font.display || theme.font.title}', ${theme.font.fallback}`);
    r.setProperty('--font-body', `'${theme.font.body}', ${theme.font.fallback}`);
    r.setProperty('--display-weight', theme.font.displayWeight || 800);
  }
  r.setProperty('--r', (theme.ui?.radius ?? 14) + 'px');
  r.setProperty('--rb', (theme.ui?.btnRadius ?? 999) + 'px');
  return theme;
}
export const dayColor = (theme, dayNo) => {
  const keys = Object.keys(theme.dayColors || {});
  return keys.length ? theme.dayColors[keys[(dayNo - 1) % keys.length]] : '#F4D738';
};
