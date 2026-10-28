// 시안 등록 진입점 — 새 시안은 파일 추가 후 여기에 import 한 줄만 더하면 된다.
import './node.js';
import './ribbon.js';
import './polaroid.js';
import './ticket.js';
import './pins.js';
import './list.js';
export { getCover, listCovers, registerCover } from './registry.js';
