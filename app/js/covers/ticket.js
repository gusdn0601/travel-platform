// 시안 4: 엽서/티켓. 일차마다 한 장씩 절취선 있는 티켓, 장소는 번호 칩으로 흐른다.
import { registerCover } from './registry.js';
import { rng, num, tw, esc, frame, decor, header, svgOpen, emptyMsg } from './util.js';

function render(input, theme) {
  const c = theme.colors, W = 320, r = rng('tk' + input.title), SW = 62, TX = 18, TW = W - 36;
  let y = 120; const tix = [];
  input.days.forEach((d) => {
    let x = SW + 14, ly = 0; const chips = [];
    d.stops.forEach((s) => {
      const cw = tw(s.label, 12) + 30; if (x + cw > TW - 10 && x > SW + 14) { x = SW + 14; ly += 30; }
      chips.push({ s, x, y: ly, w: cw }); x += cw + 7;
    });
    const h = Math.max(74, 18 + ly + 24 + 18);
    tix.push({ d, chips, y, h, rot: (r() - 0.5) * 3.2 }); y += h + 18;
  });
  const H = Math.max(y + 20, 300);
  const o = [svgOpen(W, H, input, '티켓'), frame(theme, W, H, 'tk'), decor(theme, W, H), header(input, theme, W, 50)];
  o.push(`<text x="${W / 2}" y="104" text-anchor="middle" font-size="10" letter-spacing="3" fill="${c.ink}" opacity=".55">BOARDING PASS · ${input.days.length} DAYS</text>`);
  let cnt = 0;
  tix.forEach((t) => {
    const rad = theme.cover?.chipRadius ?? 8;
    o.push(`<g transform="translate(${TX},${num(t.y)}) rotate(${num(t.rot)} ${TW / 2} ${num(t.h / 2)})">` +
      `<rect width="${TW}" height="${t.h}" rx="${rad}" fill="#fff" stroke="${c.ink}" stroke-width="1.6"/>` +
      `<path d="M${rad},0 H${SW} V${t.h} H${rad} a${rad},${rad} 0 0 1 -${rad},-${rad} V${rad} a${rad},${rad} 0 0 1 ${rad},-${rad}Z" fill="${t.d.color}" stroke="${c.ink}" stroke-width="1.6"/>` +
      `<circle cx="${SW}" cy="0" r="6" fill="${c.paper}" stroke="${c.ink}" stroke-width="1.6"/><circle cx="${SW}" cy="${num(t.h)}" r="6" fill="${c.paper}" stroke="${c.ink}" stroke-width="1.6"/>` +
      `<line x1="${SW}" y1="8" x2="${SW}" y2="${num(t.h - 8)}" stroke="${c.ink}" stroke-width="1.2" stroke-dasharray="3 4"/>` +
      `<text x="${SW / 2}" y="${num(t.h / 2 - 6)}" text-anchor="middle" font-size="10" letter-spacing="1" fill="${c.ink}" opacity=".7">DAY</text>` +
      `<text x="${SW / 2}" y="${num(t.h / 2 + 20)}" text-anchor="middle" font-size="30" fill="${c.ink}" class="t-title">${t.d.day_no}</text>` +
      t.chips.map((ch) => { cnt++; return `<g transform="translate(${num(ch.x)},${num(18 + ch.y)})"><rect width="${num(ch.w)}" height="24" rx="${Math.min(rad, 12)}" fill="${c.paper}" stroke="${c.ink}" stroke-width="1.1"/><text x="9" y="16" font-size="10" font-weight="700" fill="${c.warn}">${cnt}</text><text x="${cnt > 9 ? 25 : 20}" y="16.5" font-size="12" fill="${c.ink}">${esc(ch.s.label)}</text></g>`; }).join('') +
      `</g>`);
  });
  if (!cnt) o.push(emptyMsg(W, H, c));
  return o.join('') + '</svg>';
}
registerCover({ id: 'ticket', name: '엽서·티켓', render });
