// 표지/노선도 시안 플러그인 레지스트리 (2.4). 시안 추가 = covers/<id>.js 작성 + covers/index.js 에 import 한 줄.
// 규격: { id, name, render(input, theme) -> SVG 문자열 }
//   input = { title, subtitle, days:[{ day_no, color, stops:[{ code, label, lat, lng }] }] }  (장소 stop 만, 이동 제외)
//   theme = data/themes/*.json 객체 (colors / routeMap 스타일만 사용, 모양은 시안이 결정)
const covers = new Map();
export const registerCover = (c) => covers.set(c.id, c);
export const getCover = (id) => covers.get(id) || covers.values().next().value;
export const listCovers = () => [...covers.values()].map(({ id, name }) => ({ id, name }));
