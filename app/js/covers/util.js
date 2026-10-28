// 시안 공통 도구. 시안은 모양만 결정하고 색·장식·마커 모양은 모두 theme JSON 에서 읽는다.
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 결정적 난수(같은 입력 → 같은 그림). seed 는 제목+장소수 등 고정값.
export function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
export const num = (v) => (+v).toFixed(1);
// 글자 폭 추정(한글/전각 = 1em, 그 외 .56em)
export const tw = (s, size) => [...String(s)].reduce((a, ch) => a + (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.56), 0) * size;
export function flatten(input) {
  const out = [];
  input.days.forEach((d) => d.stops.forEach((s) => out.push({ ...s, color: d.color, day_no: d.day_no, n: out.length + 1 })));
  return out;
}
// 라벨을 최대 2줄로: 공백 기준 → 없으면 글자 수로 끊기. 2줄을 넘는 경우만 말줄임.
export function wrap(label, max = 6) {
  const s = String(label || '').trim();
  if (s.length <= max) return [s];
  const words = s.split(/\s+/);
  if (words.length > 1) {
    let best = null;
    for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); const m = Math.max(a.length, b.length); if (!best || m < best.m) best = { a, b, m }; }
    if (best.m <= max + 2) return [best.a, best.b];
  }
  const a = s.slice(0, Math.ceil(s.length / 2) > max ? max : Math.ceil(s.length / 2));
  let b = s.slice(a.length);
  if (b.length > max) b = b.slice(0, max - 1) + '…';
  return [a, b];
}
export function lines(ls, x, y, size, attrs = '', lh = 1.15) {
  return `<text x="${num(x)}" y="${num(y)}" font-size="${size}" ${attrs}>` + ls.map((l, i) => `<tspan x="${num(x)}" dy="${i ? size * lh : 0}">${esc(l)}</tspan>`).join('') + '</text>';
}
export function marker(shape, x, y, r, fill, stroke, sw = 2) {
  const a = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`;
  if (shape === 'square') return `<rect x="${num(x - r)}" y="${num(y - r)}" width="${r * 2}" height="${r * 2}" rx="${r * 0.22}" ${a}/>`;
  if (shape === 'diamond') return `<path d="M${num(x)},${num(y - r * 1.2)} L${num(x + r * 1.2)},${num(y)} L${num(x)},${num(y + r * 1.2)} L${num(x - r * 1.2)},${num(y)}Z" ${a}/>`;
  if (shape === 'scallop') {
    const pts = []; for (let k = 0; k < 16; k++) { const rr = k % 2 ? r * 0.86 : r * 1.12, t = (k / 16) * Math.PI * 2; pts.push(`${num(x + Math.cos(t) * rr)},${num(y + Math.sin(t) * rr)}`); }
    return `<polygon points="${pts.join(' ')}" ${a}/>`;
  }
  return `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" ${a}/>`;
}
// 배경(종이+패턴) + 테마 장식. decor 항목: { svg(24x24 선화), at:[x비율,y비율], size, rot, opacity, color }
export function frame(theme, W, H, id) {
  const c = theme.colors || {}, f = theme.cover?.frame || {}, o = [];
  const pat = theme.cover?.pattern;
  if (pat) o.push(`<defs><pattern id="pt-${id}" width="${pat.w}" height="${pat.h}" patternUnits="userSpaceOnUse" color="${c.line}">${pat.svg}</pattern></defs>`);
  o.push(`<rect width="${W}" height="${H}" rx="${f.radius ?? 14}" fill="${c.paper}" stroke="${c.line}" stroke-width="${f.width ?? 2}"/>`);
  if (pat) o.push(`<rect width="${W}" height="${H}" rx="${f.radius ?? 14}" fill="url(#pt-${id})" opacity="${pat.opacity ?? 0.5}" color="${c.line}"/>`);
  if (f.inner) o.push(`<rect x="${f.inner}" y="${f.inner}" width="${W - f.inner * 2}" height="${H - f.inner * 2}" rx="${Math.max(0, (f.radius ?? 14) - 4)}" fill="none" stroke="${c.line}" stroke-width="1"/>`);
  return o.join('');
}
export function decor(theme, W, H, only) {
  return (theme.cover?.decor || []).filter((d) => !only || d.zone === only).map((d) => {
    const x = d.at[0] * W, y = d.at[1] * H, k = d.size / 24;
    return `<g transform="translate(${num(x)},${num(y)}) rotate(${d.rot || 0}) scale(${k}) translate(-12,-12)" color="${d.color || theme.colors.accent}" fill="none" stroke="currentColor" stroke-width="${(theme.icons?.strokeWidth || 1.6) / Math.max(k, 0.6)}" stroke-linecap="round" stroke-linejoin="round" opacity="${d.opacity ?? 0.5}">${d.svg}</g>`;
  }).join('');
}
export function header(input, theme, W, y = 52, align = 'middle') {
  const c = theme.colors, x = align === 'middle' ? W / 2 : 24;
  const stamp = (theme.icons?.stamp || [])[0];
  let o = `<text x="${x}" y="${y}" text-anchor="${align}" font-size="${theme.cover?.titleSize || 28}" fill="${c.ink}" class="t-title">${esc(input.title)}</text>` +
    `<text x="${x}" y="${y + 24}" text-anchor="${align}" font-size="12" fill="${c.ink}" opacity=".7">${esc(input.subtitle || '')}</text>`;
  if (theme.cover?.stamp && stamp) o += `<g transform="translate(${W - 62},14) rotate(12) scale(1.9)" color="${c.warn}" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".5"><circle cx="12" cy="12" r="11"/>${stamp.svg_path}</g>`;
  return o;
}
export function legend(input, theme, W, y) {
  const c = theme.colors; let x = 20, o = '';
  input.days.forEach((d) => { o += `<g transform="translate(${x},${y})"><rect width="50" height="18" rx="${theme.cover?.chipRadius ?? 9}" fill="${d.color}" stroke="${c.ink}" stroke-width="1"/><text x="25" y="13" text-anchor="middle" font-size="10" fill="${c.ink}">${d.day_no}일차</text></g>`; x += 56; });
  return o;
}
export const svgOpen = (W, H, input, name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${num(H)}" role="img" aria-label="${esc(input.title)} ${name}" class="cover-svg">`;
export const emptyMsg = (W, H, c) => `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="13" fill="${c.ink}" opacity=".6">장소를 추가하면 표지가 그려져요</text>`;
