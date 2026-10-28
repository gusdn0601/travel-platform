// 시안 6: 목록형. 차례(目次)처럼 일차별 제목 띠 + 점선 리더로 이어진 장소 목록.
import { registerCover } from './registry.js';
import { esc, tw, frame, decor, header, svgOpen, emptyMsg, marker } from './util.js';

function render(input, theme) {
  const c = theme.colors, rm = theme.routeMap || {}, W = 320, LH = 30;
  let y = 134, n = 0; const rows = [];
  input.days.forEach((d) => {
    rows.push(`<g transform="translate(24,${y - 18})"><rect width="${W - 48}" height="26" rx="${theme.cover?.chipRadius ?? 13}" fill="${d.color}" stroke="${c.ink}" stroke-width="1.4"/><text x="14" y="18" font-size="14" fill="${c.ink}" class="t-title">${d.day_no}일차</text><text x="${W - 62}" y="17" text-anchor="end" font-size="10" fill="${c.ink}" opacity=".65">${d.stops.length}곳</text></g>`);
    y += 28;
    d.stops.forEach((s) => {
      n++;
      rows.push(marker(rm.nodeShape, 40, y - 4, 9, d.color, c.ink, 1.5) + `<text x="40" y="${y - 0.5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${c.ink}">${n}</text>` +
        `<text x="58" y="${y}" font-size="14" fill="${c.ink}">${esc(s.label)}</text><line x1="${Math.round(58 + tw(s.label, 14) + 8)}" y1="${y - 3}" x2="${W - 40}" y2="${y - 3}" stroke="${c.ink}" stroke-width="1.2" stroke-dasharray="1 5" stroke-linecap="round" opacity=".5"/>` +
        `<text x="${W - 24}" y="${y}" text-anchor="end" font-size="11" fill="${c.warn}" opacity=".85">${String(n).padStart(2, '0')}</text>`);
      y += LH;
    });
    y += 14;
  });
  const H = Math.max(y + 16, 300);
  const o = [svgOpen(W, H, input, '목차'), frame(theme, W, H, 'ls'), decor(theme, W, H), header(input, theme, W, 54), `<line x1="24" y1="104" x2="${W - 24}" y2="104" stroke="${c.ink}" stroke-width="1.5"/><line x1="24" y1="108" x2="${W - 24}" y2="108" stroke="${c.ink}" stroke-width=".7"/>`, ...rows];
  if (!n) o.push(emptyMsg(W, H, c));
  return o.join('') + '</svg>';
}
registerCover({ id: 'list', name: '목록형', render });
