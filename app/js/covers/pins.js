// 시안 5: 지도핀 스캐터. 종이 지도 위에 핀이 불규칙하게 꽂히고 점선 경로가 이어진다.
import { registerCover } from './registry.js';
import { rng, num, tw, esc, flatten, wrap, frame, decor, header, legend, svgOpen, emptyMsg } from './util.js';

function render(input, theme) {
  const c = theme.colors, rm = theme.routeMap || {}, W = 320, nodes = flatten(input), r = rng('pn' + input.title + nodes.length);
  const ROWS = Math.max(1, Math.ceil(nodes.length / 2)), CH = 122, Y0 = 175, H = Y0 + ROWS * CH + 40;
  // 좌/우 지그재그 + 열마다 세로 오프셋: 흔들림은 칸 안에서만 → 불규칙해 보이지만 라벨이 겹치지 않는다.
  nodes.forEach((n, i) => {
    const row = Math.floor(i / 2), col = i % 2;
    n.x = (col ? 238 : 72) + (r() - 0.5) * 44; n.y = Y0 + row * CH + 34 + (col ? 56 : 0) + (r() - 0.5) * 24; n.side = col ? -1 : 1;
  });
  const o = [svgOpen(W, H, input, '지도'), frame(theme, W, H, 'pin'), decor(theme, W, H), header(input, theme, W), legend(input, theme, W, 104)];
  o.push(`<g fill="none" stroke="${c.line}" stroke-width="1.4" opacity=".8"><path d="M-10,${Y0 + 30} C80,${Y0 - 10} 140,${Y0 + 90} 330,${Y0 + 40}"/><path d="M-10,${H - 70} C90,${H - 130} 190,${H - 20} 330,${H - 90}"/><path d="M${W * 0.62},${Y0 - 20} C${W * 0.5},${H * 0.4} ${W * 0.8},${H * 0.6} ${W * 0.55},${H - 10}" stroke-dasharray="2 5"/></g>`);
  if (nodes.length > 1) o.push(`<path d="M${nodes.map((n) => `${num(n.x)},${num(n.y)}`).join(' L')}" fill="none" stroke="${rm.stroke}" stroke-width="2" stroke-dasharray="${rm.dash || '5 5'}" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`);
  nodes.forEach((n) => {
    const ls = wrap(n.label, 8), w = Math.max(...ls.map((l) => tw(l, 11))) + 14, h = ls.length * 13 + 8, lx = n.side > 0 ? n.x + 17 : n.x - 17 - w;
    o.push(`<g><ellipse cx="${num(n.x)}" cy="${num(n.y + 1)}" rx="9" ry="3" fill="${c.ink}" opacity=".2"/>` +
      `<path d="M${num(n.x)},${num(n.y)} C${num(n.x - 5)},${num(n.y - 12)} ${num(n.x - 14)},${num(n.y - 16)} ${num(n.x - 14)},${num(n.y - 27)} a14,14 0 1 1 28,0 C${num(n.x + 14)},${num(n.y - 16)} ${num(n.x + 5)},${num(n.y - 12)} ${num(n.x)},${num(n.y)}Z" fill="${n.color}" stroke="${c.ink}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<text x="${num(n.x)}" y="${num(n.y - 23)}" text-anchor="middle" font-size="12" font-weight="700" fill="${c.ink}">${n.n}</text>` +
      `<rect x="${num(lx)}" y="${num(n.y - 24)}" width="${num(w)}" height="${h}" rx="4" fill="${c.paper}" stroke="${c.ink}" stroke-width="1" opacity=".95"/>` +
      `<text font-size="11" fill="${c.ink}">` + ls.map((l, k) => `<tspan x="${num(lx + 7)}" y="${num(n.y - 24 + 14 + k * 13)}">${esc(l)}</tspan>`).join('') + `</text></g>`);
  });
  if (!nodes.length) o.push(emptyMsg(W, H, c));
  return o.join('') + '</svg>';
}
registerCover({ id: 'pins', name: '지도핀', render });
