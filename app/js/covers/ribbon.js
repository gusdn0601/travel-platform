// 시안 2: 타임라인 리본. 굽이치는 리본 한 줄 위에 장소 태그가 좌우로 어긋나게 달린다.
import { registerCover } from './registry.js';
import { rng, num, tw, flatten, wrap, lines, marker, frame, decor, header, legend, svgOpen, emptyMsg } from './util.js';

function render(input, theme) {
  const c = theme.colors, rm = theme.routeMap || {}, W = 320, DY = 78, Y0 = 170, nodes = flatten(input), r = rng('rb' + input.title + nodes.length);
  nodes.forEach((n, i) => { n.y = Y0 + i * DY + (r() - 0.5) * 16; n.x = 160 + Math.sin(i * 1.25 + 0.4) * 34; n.side = i % 2 ? 1 : -1; });
  const H = Y0 + Math.max(0, nodes.length - 1) * DY + 80;
  const o = [svgOpen(W, H, input, '타임라인'), frame(theme, W, H, 'rib'), decor(theme, W, H), header(input, theme, W), legend(input, theme, W, 104)];
  if (nodes.length) {
    let d = `M${num(nodes[0].x)},${num(Y0 - 40)}`;
    nodes.forEach((n, i) => { const p = i ? nodes[i - 1] : { x: nodes[0].x, y: Y0 - 40 }; d += ` C${num(p.x)},${num((p.y + n.y) / 2)} ${num(n.x)},${num((p.y + n.y) / 2)} ${num(n.x)},${num(n.y)}`; });
    d += ` L${num(nodes.at(-1).x)},${num(H - 28)}`;
    o.push(`<path d="${d}" fill="none" stroke="${rm.stroke}" stroke-width="12" stroke-linecap="round" opacity=".28"/><path d="${d}" fill="none" stroke="${rm.stroke}" stroke-width="2.5" stroke-dasharray="1 7" stroke-linecap="round"/>`);
  }
  nodes.forEach((n) => {
    const ls = wrap(n.label, 8), w = Math.max(...ls.map((l) => tw(l, 12))) + 22, h = ls.length * 15 + 12, gap = 26 + r() * 14;
    const bx = Math.max(10, Math.min(W - 10 - w, n.side > 0 ? n.x + gap : n.x - gap - w)), by = n.y - h / 2, rot = (r() - 0.5) * 5;
    o.push(`<g transform="rotate(${num(rot)} ${num(bx + w / 2)} ${num(n.y)})"><path d="M${num(n.side > 0 ? bx : bx + w)},${num(n.y)} L${num(n.x)},${num(n.y)}" stroke="${c.ink}" stroke-width="1.2"/>` +
      `<rect x="${num(bx)}" y="${num(by)}" width="${num(w)}" height="${h}" rx="${theme.cover?.chipRadius ?? 8}" fill="${n.color}" stroke="${c.ink}" stroke-width="1.5"/>` +
      lines(ls, bx + w / 2, by + 17, 12, `text-anchor="middle" fill="${c.ink}"`, 1.25) + '</g>');
    o.push(marker(rm.nodeShape, n.x, n.y, 12, c.paper, c.ink) + `<text x="${num(n.x)}" y="${num(n.y + 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="${c.ink}">${n.n}</text>`);
  });
  if (!nodes.length) o.push(emptyMsg(W, H, c));
  return o.join('') + '</svg>';
}
registerCover({ id: 'ribbon', name: '타임라인 리본', render });
