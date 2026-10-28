// 시안 3: 폴라로이드 콜라주. 살짝 기울어진 사진 카드를 테이프로 붙인 스크랩북.
import { registerCover } from './registry.js';
import { rng, num, flatten, wrap, lines, frame, decor, header, legend, svgOpen, emptyMsg, esc } from './util.js';

function render(input, theme) {
  const c = theme.colors, W = 320, CW = 128, CH = 150, nodes = flatten(input), r = rng('po' + input.title + nodes.length), stamps = theme.icons?.stamp || [];
  nodes.forEach((n, i) => {
    const row = Math.floor(i / 2), col = i % 2;
    n.x = 14 + col * 152 + (r() - 0.5) * 16 + (row % 2 ? 8 : 0); n.y = 150 + row * 158 + col * 18 + (r() - 0.5) * 14; n.rot = (r() - 0.5) * 14;
  });
  const H = 150 + Math.ceil(nodes.length / 2) * 158 + 40;
  const o = [svgOpen(W, H, input, '콜라주'), frame(theme, W, H, 'pol'), decor(theme, W, H), header(input, theme, W), legend(input, theme, W, 104)];
  nodes.forEach((n, i) => {
    const cx = n.x + CW / 2, cy = n.y + CH / 2, ls = wrap(n.label, 8), st = stamps[i % Math.max(1, stamps.length)];
    o.push(`<g transform="rotate(${num(n.rot)} ${num(cx)} ${num(cy)})"><rect x="${num(n.x + 3)}" y="${num(n.y + 4)}" width="${CW}" height="${CH}" fill="${c.ink}" opacity=".12"/>` +
      `<rect x="${num(n.x)}" y="${num(n.y)}" width="${CW}" height="${CH}" fill="#fff" stroke="${c.line}" stroke-width="1"/>` +
      `<rect x="${num(n.x + 8)}" y="${num(n.y + 8)}" width="${CW - 16}" height="104" fill="${n.color}"/>` +
      (n.photo ? `<image href="${esc(n.photo)}" x="${num(n.x + 8)}" y="${num(n.y + 8)}" width="${CW - 16}" height="104" preserveAspectRatio="xMidYMid slice"/>`
        : st ? `<g transform="translate(${num(cx - 20)},${num(n.y + 28)}) scale(1.7)" color="${c.ink}" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35">${st.svg_path}</g>` : '') +
      `<circle cx="${num(n.x + 22)}" cy="${num(n.y + 22)}" r="11" fill="${c.paper}" stroke="${c.ink}" stroke-width="1.5"/><text x="${num(n.x + 22)}" y="${num(n.y + 26)}" text-anchor="middle" font-size="12" font-weight="700" fill="${c.ink}">${n.n}</text>` +
      lines(ls, cx, n.y + 130 - (ls.length > 1 ? 6 : 0), 12.5, `text-anchor="middle" fill="${c.ink}" class="t-title"`, 1.1) +
      `<rect x="${num(cx - 20)}" y="${num(n.y - 7)}" width="40" height="14" fill="${theme.cover?.tape || c.accent}" opacity=".7" transform="rotate(${num(-n.rot * 0.8 + 3)} ${num(cx)} ${num(n.y)})"/></g>`);
  });
  if (!nodes.length) o.push(emptyMsg(W, H, c));
  return o.join('') + '</svg>';
}
registerCover({ id: 'polaroid', name: '폴라로이드 콜라주', render });
