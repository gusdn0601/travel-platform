// 시안 1: 노드형 (3열 뱀 모양 + 손으로 그린 듯한 흔들림). 점·선 노선도.
import { registerCover } from './registry.js';
import { rng, num, flatten, wrap, lines, marker, frame, decor, header, legend, svgOpen, emptyMsg } from './util.js';

function render(input, theme) {
  const rm = theme.routeMap || {}, c = theme.colors, W = 320, COLS = 3, DX = 100, DY = 104, X0 = 60, Y0 = 170;
  const R = rm.nodeRadius || 14, nodes = flatten(input), r = rng(input.title + nodes.length);
  nodes.forEach((n, i) => {
    const row = Math.floor(i / COLS), col = i % COLS, sc = row % 2 ? COLS - 1 - col : col, j = rm.jitter ? 1 : 0;
    n.x = X0 + sc * DX + (r() - 0.5) * 18 * j; n.y = Y0 + row * DY + (r() - 0.5) * 22 * j;
  });
  const H = Y0 + (Math.max(1, Math.ceil(nodes.length / COLS)) - 1) * DY + 70;
  const o = [svgOpen(W, H, input, '노선도'), frame(theme, W, H, 'node'), decor(theme, W, H), header(input, theme, W), legend(input, theme, W, 104)];
  let path = '';
  nodes.forEach((n, i) => {
    if (!i) { path = `M${num(n.x)},${num(n.y)}`; return; }
    const p = nodes[i - 1];
    path += ` Q${num((p.x + n.x) / 2 + (r() - 0.5) * 30)},${num((p.y + n.y) / 2 + (r() - 0.5) * 30)} ${num(n.x)},${num(n.y)}`;
  });
  if (nodes.length > 1) o.push(`<path d="${path}" fill="none" stroke="${rm.stroke}" stroke-width="${rm.strokeWidth || 3}" stroke-dasharray="${rm.dash || '6 5'}" stroke-linecap="round"/>`);
  nodes.forEach((n) => {
    const ls = wrap(n.label, 6), sz = Math.max(...ls.map((l) => l.length)) > 6 ? 10 : 11;
    o.push(marker(rm.nodeShape, n.x, n.y, R, n.color, c.ink) +
      `<text x="${num(n.x)}" y="${num(n.y + 4)}" text-anchor="middle" font-size="12" font-weight="700" fill="${c.ink}">${n.n}</text>` +
      lines(ls, n.x, n.y + R + 15, sz, `text-anchor="middle" fill="${c.ink}" stroke="${c.paper}" stroke-width="3" paint-order="stroke"`));
  });
  if (!nodes.length) o.push(emptyMsg(W, H, c));
  return o.join('') + '</svg>';
}
registerCover({ id: 'node', name: '노드형', render });
