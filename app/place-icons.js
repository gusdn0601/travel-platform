// 장소 삽화 아이콘 — 사진이 없는 장소에 표시하는 손저작 SVG 모음.
// 원칙: 외부 자산·폰트·아이콘 라이브러리 없음(라이선스 부담 없음), 24×24 그리드, 선 중심,
//       색은 currentColor(테마 토큰 상속). 사진처럼 보이지 않게 '삽화' 라벨을 함께 둔다.
// 사용: build-site.mjs 가 장소별 아이콘 id(ic)를 파생하고, 둘러보기·일정 앱이 iconSvg() 로 그린다.

// 작은 채움 요소(눈·열매·보바 등) — 선 스타일 아이콘 안의 포인트
const dot = (cx, cy, r = 0.9) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;

/* ---------- 아이콘 본문(24×24) ---------- */
export const ICONS = {
  /* ---- 음식 ---- */
  ramen: { label: '라멘', body:
    '<path d="M3.2 11h17.6c-.4 4.3-4.2 7.4-8.8 7.4S3.6 15.3 3.2 11Z"/>' +
    '<path d="M8.6 21h6.8"/>' +
    '<path d="M6.8 11c.6-1.6 2.1-1.6 2.7 0s2.1 1.6 2.7 0 2.1-1.6 2.7 0"/>' +
    '<path d="M15.2 3.2 11.6 8M18.2 4.2 14.2 9"/>' },
  noodles: { label: '국수', body:
    '<path d="M3.2 11h17.6c-.4 4.3-4.2 7.4-8.8 7.4S3.6 15.3 3.2 11Z"/>' +
    '<path d="M8.6 21h6.8"/>' +
    '<path d="M7.5 8v3M10.5 8v3M13.5 8v3M16.5 8v3"/>' +
    '<path d="M14.5 2.8 10.5 8M17.5 3.8 13.5 9"/>' },
  dumpling: { label: '만두', body:
    '<path d="M4 12.8c0-3.8 3.6-6.3 8-6.3s8 2.5 8 6.3c0 3.5-3.6 5.4-8 5.4s-8-1.9-8-5.4Z"/>' +
    '<path d="M8.2 9.2V7.8M12 8.1V6.7M15.8 9.2V7.8"/>' +
    '<path d="M2.5 18.2h19"/>' +
    '<path d="M8.5 3.2c0-1 1-1 1-2M13.5 3.2c0-1 1-1 1-2"/>' },
  hotpot: { label: '훠궈', body:
    '<path d="M4 11h16v4.2a4.8 4.8 0 0 1-4.8 4.8H8.8A4.8 4.8 0 0 1 4 15.2V11Z"/>' +
    '<path d="M2 12.5h2M20 12.5h2M12 11v9"/>' +
    '<path d="M7.5 8c0-1.4 1-1.4 1-2.8M12 8c0-1.4 1-1.4 1-2.8M16.5 8c0-1.4 1-1.4 1-2.8"/>' },
  cafe: { label: '카페', body:
    '<path d="M4 8.5h11v5a4.5 4.5 0 0 1-4.5 4.5H8.5A4.5 4.5 0 0 1 4 13.5v-5Z"/>' +
    '<path d="M15 10h1.6a2.4 2.4 0 0 1 0 4.8H15"/>' +
    '<path d="M3 21h14"/>' +
    '<path d="M7.5 4.5c0-1 1-1 1-2M11 4.5c0-1 1-1 1-2"/>' },
  tea: { label: '차·말차', body:
    '<path d="M3.5 10h17c0 4.4-3.8 8-8.5 8s-8.5-3.6-8.5-8Z"/>' +
    '<path d="M7 21h10"/>' +
    '<path d="M12 3v6M8.8 6.2 12 9l3.2-2.8"/>' },
  dessert: { label: '디저트', body:
    '<path d="M4 12h16v8H4z"/>' +
    '<path d="M4 15c2 0 2 1.6 4 1.6s2-1.6 4-1.6 2 1.6 4 1.6 2-1.6 4-1.6"/>' +
    '<path d="M12 9V4.5"/>' +
    '<path d="M12 4.5c-1.2-.2-1.2-1.8 0-2.5 1.2.7 1.2 2.3 0 2.5Z"/>' +
    '<path d="M2.5 20h19"/>' },
  wagashi: { label: '화과자', body:
    '<path d="M12 21.5V3.5"/>' +
    '<circle cx="12" cy="6" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/>' +
    '<path d="M12 3.5c1.4-1.4 2.8-1 3.4-1"/>' },
  milktea: { label: '밀크티', body:
    '<path d="M6.8 7.5h10.4l-1.2 12.2a1.6 1.6 0 0 1-1.6 1.4H8.6a1.6 1.6 0 0 1-1.6-1.4L6.8 7.5Z"/>' +
    '<path d="M6 7.5h12"/><path d="M13.5 3 12 7.5"/>' +
    dot(10, 16) + dot(13, 17.5) + dot(11.5, 19) },
  sushi: { label: '초밥', body:
    '<path d="M4 15h16v1.8a3.2 3.2 0 0 1-3.2 3.2H7.2A3.2 3.2 0 0 1 4 16.8V15Z"/>' +
    '<path d="M5 15c0-3.2 2.2-5.2 5.2-5.2h3.6C16.8 9.8 19 11.8 19 15"/>' +
    '<path d="M9 12.5h6M8 14h8"/>' },
  tempura: { label: '덴푸라', body:
    '<path d="M3 20h18"/>' +
    '<path d="M7 20l2.8-11M12 20l1.2-12M16.6 20l2-9.5"/>' +
    '<path d="M6 9.5c-1.5-1-1-3 .8-3.2M10 8c-1.2-1.5-.2-3.2 1.5-3M14.5 8.5c-.8-1.8.8-3.4 2.4-2.8"/>' },
  yakiniku: { label: '고기구이', body:
    '<path d="M4 12h16v4.5A3.5 3.5 0 0 1 16.5 20h-9A3.5 3.5 0 0 1 4 16.5V12Z"/>' +
    '<path d="M8 12v8M12 12v8M16 12v8"/>' +
    '<path d="M6.5 9.5c2-2.5 4-2.5 5.5-1s3.5 1.5 5.5-1"/>' +
    '<path d="M8 5c0-1 1-1 1-2M14 5c0-1 1-1 1-2"/>' },
  korean: { label: '한식', body:
    '<path d="M3.5 11h17c0 4.4-3.8 8-8.5 8s-8.5-3.6-8.5-8Z"/>' +
    '<path d="M8.5 11c0-2 1.5-3.2 3.5-3.2s3.5 1.2 3.5 3.2"/>' +
    '<path d="M7 21h10"/>' +
    '<circle cx="6.5" cy="7.5" r="1.2"/><circle cx="12" cy="5.5" r="1.2"/><circle cx="17.5" cy="7.5" r="1.2"/>' },
  chicken: { label: '닭요리', body:
    '<path d="M13.8 4.6a4.2 4.2 0 0 1 5.6 5.6c-.8 1.4-2 2-3.4 2.1L8.8 19.5a3.1 3.1 0 0 1-4.4-4.4l7.2-7.2c.1-1.3.8-2.6 2.2-3.3Z"/>' +
    '<path d="M8.8 15.2l-2.2-2.2"/>' },
  seafood: { label: '해산물', body:
    '<path d="M2.5 12c3-4.2 8-5.2 11.8-2.4 1.5 1.1 2.8 2 5.2 2.2-1.2 2-2.7 3-5.2 3.4C10.5 16.6 5.5 15.6 2.5 12Z"/>' +
    dot(7.5, 11.5) +
    '<path d="M14.3 9.8c1.8 1.3 1.8 3.1 0 4.4"/>' },
  takoyaki: { label: '타코야키', body:
    '<circle cx="8" cy="14" r="3"/><circle cx="13" cy="10.5" r="3"/><circle cx="17.5" cy="14" r="3"/>' +
    '<path d="M17.5 5.5 13.5 9M4 20h16"/>' },
  okonomiyaki: { label: '오코노미야키', body:
    '<circle cx="12" cy="12" r="7.2"/>' +
    '<path d="M6.5 10.5c1.5-1 2.5 1 4 0s2.5 1 4 0 2.5 1 3.5 0"/>' +
    '<path d="M6.5 14c1.5-1 2.5 1 4 0s2.5 1 4 0 2.5 1 3.5 0"/>' },
  tonkatsu: { label: '돈카츠', body:
    '<path d="M5 8.5h8.5a4.2 4.2 0 0 1 0 8.4H5V8.5Z"/>' +
    '<path d="M9 8.5v8.4M12.5 8.5v8.4"/>' +
    '<path d="M3 20h18"/>' },
  curry: { label: '카레', body:
    '<path d="M3 18.5h18"/>' +
    '<path d="M7 18.5a5 5 0 0 1 10 0"/>' +
    '<path d="M4.5 18.5c0-2.6 1.8-4.2 4-4.5M19.5 18.5c0-2.6-1.8-4.2-4-4.5"/>' },
  streetfood: { label: '길거리 간식', body:
    '<path d="M12.5 21 6.5 4"/>' +
    '<rect x="7.4" y="7.2" width="4" height="4" rx=".7"/>' +
    '<rect x="9.2" y="11.6" width="4" height="4" rx=".7"/>' +
    '<rect x="11" y="16" width="4" height="4" rx=".7"/>' },
  stall: { label: '시장·노점', body:
    '<path d="M4 9.5 6 4h12l2 5.5M4 9.5h16"/>' +
    '<path d="M5.5 9.5V21M18.5 9.5V21M2.5 21h19"/>' +
    '<path d="M8 9.5V21M16 9.5V21M3.5 14.5h17"/>' +
    '<path d="M7.5 4v5.5M12 4v5.5M16.5 4v5.5"/>' },
  bar: { label: '바·칵테일', body:
    '<path d="M4 4.5h16l-8 9-8-9Z"/>' +
    '<path d="M12 13.5V21M8 21h8"/>' +
    '<circle cx="17.5" cy="4.5" r="1.4"/>' +
    '<path d="M14.8 5.2 18 3"/>' },
  sake: { label: '사케', body:
    '<path d="M9 3h6v2.6l1.5 2.8V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V8.4L9 5.6V3Z"/>' +
    '<path d="M7.5 12h9M9 8.4h6"/>' +
    '<path d="M17 15h4v3.5h-4zM18 22h2"/>' },
  western: { label: '양식', body:
    '<path d="M6 3v6a2 2 0 0 0 4 0V3M8 9v12"/>' +
    '<path d="M18.5 3c-2.4 2.6-2.8 5.8-1.2 8.2V21M15.5 21h6"/>' },
  bento: { label: '가이세키·도시락', body:
    '<rect x="3" y="8" width="18" height="11" rx="1.5"/>' +
    '<path d="M3 13h18M12 8v11"/>' +
    '<circle cx="7.5" cy="10.5" r="1.2"/><circle cx="16.5" cy="15.5" r="1.2"/>' },
  tofu: { label: '두부', body:
    '<path d="M5 8h14v10H5z"/>' +
    '<path d="M5 12h14M9.5 8v10"/>' +
    '<path d="M7 21h10"/>' +
    dot(16, 15) },
  ricepot: { label: '솥밥', body:
    '<path d="M5 10h14v5.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 5 15.5V10Z"/>' +
    '<path d="M3.5 10h17M10 7h4M12 5v2"/>' +
    '<path d="M7.5 13.5c1.5-1 2.5 1 4 0s2.5 1 4 0"/>' },
  bowl: { label: '음식', body:
    '<path d="M3.2 11h17.6c-.4 4.3-4.2 7.4-8.8 7.4S3.6 15.3 3.2 11Z"/>' +
    '<path d="M8.6 21h6.8"/>' +
    '<path d="M8.5 7.5c0-1.2 1-1.2 1-2.4M12 7.5c0-1.2 1-1.2 1-2.4M15.5 7.5c0-1.2 1-1.2 1-2.4"/>' },
  wok: { label: '중식·본토식', body:
    '<path d="M3.5 10.5h17c-.4 4.8-3.9 8.2-8.5 8.2s-8.1-3.4-8.5-8.2Z"/>' +
    '<path d="M2 10.5h1.5M20.5 10.5H22"/>' +
    '<path d="M7.5 7.5c0-1.3 1.1-1.3 1.1-2.6M12 7.5c0-1.3 1.1-1.3 1.1-2.6M16.5 7.5c0-1.3 1.1-1.3 1.1-2.6"/>' +
    '<path d="M7 21h10"/>' },

  /* ---- 쇼핑 ---- */
  drugstore: { label: '약국·드럭스토어', body:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/>' },
  convenience: { label: '편의점', body:
    '<path d="M4 9.5h16V21H4z"/><path d="M3 9.5 5 4.5h14l2 5"/>' +
    '<path d="M8.5 4.5v5M12 4.5v5M15.5 4.5v5"/>' +
    '<path d="M14.5 21v-5.5H18V21"/>' },
  supermarket: { label: '슈퍼·마트', body:
    '<path d="M3 4.5h2.2l2.3 11h10.8"/>' +
    '<path d="M6.5 8.5H21l-1.8 5.2a2 2 0 0 1-1.9 1.3H9"/>' +
    '<circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17.5" cy="19.5" r="1.5"/>' },
  department: { label: '백화점', body:
    '<path d="M4 21V8l8-4.5L20 8v13M2.5 21h19"/>' +
    '<path d="M8 11h2v2H8zM14 11h2v2h-2zM8 15h2v2H8zM14 15h2v2h-2z"/>' +
    '<path d="M11 21v-3.5h2V21"/>' },
  mall: { label: '쇼핑몰', body:
    '<path d="M4.5 9.5h7V21h-7zM8 9.5a2.2 2.2 0 0 1 4.4 0"/>' +
    '<path d="M13.5 13h6v8h-6zM16.5 13a2 2 0 0 1 4 0"/>' },
  market: { label: '시장·상점가', body:
    '<path d="M4 9.5 6 4h12l2 5.5M4 9.5h16"/>' +
    '<path d="M5.5 9.5V21M18.5 9.5V21M2.5 21h19"/>' +
    '<path d="M7.5 4v5.5M12 4v5.5M16.5 4v5.5"/>' +
    '<path d="M8 14h3v3H8zM13 14h3v3h-3z"/>' },
  bookstore: { label: '서점', body:
    '<path d="M12 6.5C9.8 4.5 6.8 4.2 4 5.2v13.3c2.8-1 5.8-.7 8 1.3 2.2-2 5.2-2.3 8-1.3V5.2c-2.8-1-5.8-.7-8 1.3Z"/>' +
    '<path d="M12 6.5v13.3"/>' },
  electronics: { label: '전자·가전', body:
    '<rect x="7" y="3" width="10" height="18" rx="2"/>' +
    '<path d="M10.5 18h3M10 6h4"/>' },
  cosmetics: { label: '화장품', body:
    '<path d="M9.5 10h5v11h-5z"/>' +
    '<path d="M9.5 10V5.5L14.5 3v7"/>' +
    '<path d="M9.5 13.5h5"/>' },
  fashion: { label: '의류·패션', body:
    '<path d="M9 4 4.5 6.5 6 10.5l2-1V21h8V9.5l2 1 1.5-4L15 4l-1.5 1.5h-3L9 4Z"/>' },
  souvenir: { label: '기념품·공예', body:
    '<path d="M4 11h16v9.5H4zM3 7.5h18V11H3zM12 7.5V21"/>' +
    '<path d="M12 7.5C10.5 7.5 8 7 8 5.5S10 3.5 12 7.5ZM12 7.5c1.5 0 4-.5 4-2s-2-2-4 2Z"/>' },
  stationery: { label: '문구', body:
    '<path d="M4 20l1-4L16.5 4.5a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L8 19l-4 1Z"/>' +
    '<path d="M15 6l3 3M6 16l2 2"/>' },
  knife: { label: '칼·주방', body:
    '<path d="M3 16.5 15.5 4 20 8.5 7.5 21 3 16.5Z"/>' +
    '<path d="M14.8 4.7 19.3 9.2"/>' },
  figure: { label: '피규어·굿즈', body:
    '<circle cx="12" cy="7" r="2.6"/>' +
    '<path d="M12 9.6V15M8.5 21v-2.5a3.5 3.5 0 0 1 7 0V21"/>' +
    '<path d="M9.8 5.2 10.5 3.2M14.2 5.2 13.5 3.2"/>' +
    '<path d="M7 21h10"/>' },
  massage: { label: '마사지·스파', body:
    '<ellipse cx="12" cy="17" rx="7" ry="2.6"/><ellipse cx="12" cy="13" rx="4.5" ry="2"/><ellipse cx="12" cy="9.5" rx="2.6" ry="1.4"/>' +
    '<path d="M7 5c0-1.2 1-1.2 1-2.4M12 4.5c0-1.2 1-1.2 1-2.4M17 5c0-1.2 1-1.2 1-2.4"/>' },
  bag: { label: '쇼핑', body:
    '<path d="M6 8h12l-1.2 13H7.2L6 8Z"/>' +
    '<path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>' +
    '<path d="M6.5 12h11"/>' },

  /* ---- 교통 ---- */
  airport: { label: '공항·비행기', body:
    '<path d="M10.5 3.2c0-1 .8-1.7 1.5-1.7s1.5.7 1.5 1.7V9l7.5 4.3v2.2l-7.5-1.7v4.4l2.3 1.8v1.8L12 20.5l-3.8 1.3v-1.8l2.3-1.8v-4.4L3 15.5v-2.2L10.5 9V3.2Z"/>' },
  train: { label: '기차·역', body:
    '<rect x="5" y="3" width="14" height="14" rx="2.5"/>' +
    '<path d="M7 6.5h10v4.5H7z"/>' +
    '<circle cx="8.8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="15.2" cy="14" r="1" fill="currentColor" stroke="none"/>' +
    '<path d="M8 17l-2 4M16 17l2 4M4 21h16"/>' },
  subway: { label: '지하철', body:
    '<circle cx="12" cy="12" r="9"/><path d="M7.5 16V8l4.5 4.5L16.5 8v8"/>' },
  bus: { label: '버스', body:
    '<rect x="4" y="4.5" width="16" height="12" rx="2"/>' +
    '<path d="M6 7.5h12v5H6zM4 12.5h16"/>' +
    '<circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="18" r="1.6"/>' +
    '<path d="M6 19.5V21M18 19.5V21"/>' },
  ferry: { label: '항구·페리', body:
    '<path d="M4 15h16l-2 5H6l-2-5Z"/>' +
    '<path d="M12 15V4.5M12 5l6 6.5h-6"/>' +
    '<path d="M3 22c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2"/>' },
  taxi: { label: '택시', body:
    '<path d="M4 16v2.5h16V16l-2-5-2-3H8l-2 3-2 5Z"/>' +
    '<path d="M6.5 16h11M8 8V6h8v2"/>' +
    '<circle cx="7.5" cy="18.5" r="1.6"/><circle cx="16.5" cy="18.5" r="1.6"/>' },
  bike: { label: '자전거', body:
    '<circle cx="6.5" cy="16.5" r="3.5"/><circle cx="17.5" cy="16.5" r="3.5"/>' +
    '<path d="M6.5 16.5 10 8h4l3.5 8.5M9 8h5M13.5 8l4 8.5M9.5 11.5h4"/>' },
  card: { label: '교통카드', body:
    '<rect x="3" y="6" width="18" height="12" rx="2"/>' +
    '<path d="M3 10h18"/>' +
    '<rect x="6" y="13" width="4" height="2.5" rx=".5"/>' },
  tunnel: { label: '터널', body:
    '<path d="M4 21V12a8 8 0 0 1 16 0v9"/>' +
    '<path d="M8 21v-9a4 4 0 0 1 8 0v9"/>' +
    '<path d="M2 21h20M12 16v5"/>' },
  transit: { label: '교통', body:
    '<path d="M12 21V3"/>' +
    '<path d="M12 4h7l2 3-2 3h-7zM12 12H5l-2 3 2 3h7z"/>' },

  /* ---- 관광 ---- */
  park: { label: '공원', body:
    '<path d="M12 21v-7"/>' +
    '<path d="M12 4a5 5 0 0 1 4.5 7.2A4 4 0 0 1 15 18H9a4 4 0 0 1-1.5-6.8A5 5 0 0 1 12 4Z"/>' +
    '<path d="M4 21h16"/>' },
  temple: { label: '사찰', body:
    '<path d="M3 21h18M6 21v-4h12v4"/>' +
    '<path d="M4 17l8-4.5 8 4.5"/>' +
    '<path d="M7 12.5 12 9l5 3.5"/>' +
    '<path d="M12 9V5.5M11 5.5h2"/>' },
  shrine: { label: '신사', body:
    '<path d="M3 4.5c3 1.2 15 1.2 18 0"/>' +
    '<path d="M5 9h14M6 5v16M18 5v16M10 9v5M14 9v5"/>' },
  castle: { label: '성·성터', body:
    '<path d="M3 21h18M5 21v-9l7-4 7 4v9"/>' +
    '<path d="M3 12 12 7l9 5"/>' +
    '<path d="M8 21v-4h3v4M14 21v-4h3v4"/>' +
    '<path d="M12 7V3M10.5 3h3"/>' },
  museum: { label: '박물관·미술관', body:
    '<path d="M3 9.5 12 4l9 5.5"/>' +
    '<path d="M5 9.5v8M9.5 9.5v8M14.5 9.5v8M19 9.5v8"/>' +
    '<path d="M3 18h18M2 21h20"/>' },
  theater: { label: '극장·공연', body:
    '<path d="M3 4h18M5 4v16M19 4v16"/>' +
    '<path d="M5 4c3 4 3 12 0 16M19 4c-3 4-3 12 0 16"/>' +
    '<path d="M9 20.5h6"/>' },
  ruins: { label: '유적', body:
    '<path d="M3 20.5h18"/>' +
    '<path d="M6 20.5V9h3v11.5M6 12.5h3"/>' +
    '<path d="M12 20.5V6h3v14.5M12 10h3"/>' +
    '<path d="M17.5 20.5v-6h2.5v6"/>' +
    '<path d="M4.5 9 7.5 6.5 10.5 9"/>' },
  monument: { label: '기념비·시비', body:
    '<path d="M9 20 10.5 4h3L15 20Z"/>' +
    '<path d="M7.5 20.5h9"/>' +
    '<path d="M10.4 9.5h3.2M10.2 14h3.6"/>' },
  aquarium: { label: '수족관·동물원', body:
    '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
    '<path d="M7 13c2-2.6 5-3 7.5-1.3 1 .7 1.8 1.2 3.2 1.3-.8 1.2-1.7 1.8-3.2 2.1-2.5 1.7-5.5 1.3-7.5-1.3Z"/>' +
    dot(9.5, 12.2, 0.6) +
    '<path d="M17.5 7.5h.1M15.5 9h.1"/>' },
  tower: { label: '타워·전망대', body:
    '<path d="M12 2v3"/>' +
    '<path d="M8 21l4-16 4 16"/>' +
    '<path d="M9.5 13h5M8.8 17h6.4M6.5 21h11"/>' },
  bridge: { label: '다리', body:
    '<path d="M2 17h20M4 17V8M20 17V8"/>' +
    '<path d="M4 11c4.5-5.5 11.5-5.5 16 0"/>' +
    '<path d="M8 17v-4M12 17v-5.5M16 17v-4"/>' },
  beach: { label: '해변', body:
    '<circle cx="17.5" cy="6.5" r="2.5"/>' +
    '<path d="M2 16c2 0 2-1.3 4-1.3s2 1.3 4 1.3 2-1.3 4-1.3 2 1.3 4 1.3 2-1.3 4-1.3"/>' +
    '<path d="M2 20c2 0 2-1.3 4-1.3s2 1.3 4 1.3 2-1.3 4-1.3 2 1.3 4 1.3 2-1.3 4-1.3"/>' },
  mountain: { label: '산', body:
    '<path d="M2 20l7.5-13 4.2 7 2.3-3.5L22 20H2Z"/>' +
    '<path d="M8 10.5 9.5 13l1.5-1.5"/>' },
  street: { label: '거리·골목', body:
    '<path d="M3 21V9h5v12M16 21V4h5v17M8 21h8"/>' +
    '<path d="M5 12h1M18 7h1M18 12h1M18 17h1"/>' +
    '<path d="M10 21v-4h4v4"/>' },
  onsen: { label: '온천', body:
    '<path d="M3 21h18"/>' +
    '<path d="M4 17h16v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5V17Z"/>' +
    '<path d="M7.5 8c0-1.5 1.2-1.5 1.2-3M12 8c0-1.5 1.2-1.5 1.2-3M16.5 8c0-1.5 1.2-1.5 1.2-3M7 13h10"/>' },
  view: { label: '전망·야경', body:
    '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/>' +
    '<circle cx="12" cy="12" r="2.8"/>' },
  themepark: { label: '테마파크', body:
    '<circle cx="12" cy="10.5" r="6.5"/><circle cx="12" cy="10.5" r="1.5"/>' +
    '<path d="M12 4v13M5.5 10.5h13M7.4 5.9l9.2 9.2M16.6 5.9 7.4 15.1"/>' +
    '<path d="M8 21l4-5 4 5M4 21h16"/>' },
  experience: { label: '체험·공방', body:
    '<path d="M12 3a9 9 0 1 0 0 18c1.7 0 2.3-1 1.7-2.3-.7-1.5.3-2.9 2-2.9H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/>' +
    dot(8.2, 9.2) + dot(12, 7.2) + dot(15.8, 9.2) + dot(8.2, 13.4) },
  bed: { label: '숙박', body:
    '<path d="M3 19V8M3 15h18v4M21 15v-2.5A3.5 3.5 0 0 0 17.5 9H12v6"/>' +
    '<circle cx="7.5" cy="12" r="1.4"/>' +
    '<path d="M3 19h18"/>' },
  sight: { label: '관광지', body:
    '<path d="M12 21s7-6.2 7-11.2a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z"/>' +
    '<circle cx="12" cy="9.8" r="2.5"/>' },
};

/* ---------- 종류 기본값 ---------- */
export const KIND_ICON = { food: 'bowl', shop: 'bag', transit: 'transit', sight: 'sight' };

/* ---------- 음식 카테고리(build-site FOOD_CATEGORIES id) → 아이콘 ---------- */
export const FOOD_ICON = {
  xiaolongbao: 'dumpling', tangbao: 'dumpling', shengjian: 'dumpling', dimsum: 'dumpling', gyoza: 'dumpling',
  hotpot: 'hotpot', malatang: 'hotpot', motsunabe: 'hotpot', sukiyaki: 'hotpot',
  duck: 'yakiniku', yakiniku: 'yakiniku', guobaorou: 'tonkatsu', lamb: 'streetfood',
  noodles: 'noodles', ramen: 'ramen', tsukemen: 'ramen', udon: 'noodles', soba: 'noodles', somen: 'noodles',
  sushi: 'sushi', unagi: 'seafood', seafood: 'seafood', crayfish: 'seafood', mentaiko: 'seafood',
  okonomiyaki: 'okonomiyaki', takoyaki: 'takoyaki', tonkatsu: 'tonkatsu', tempura: 'tempura',
  yatai: 'stall', market: 'stall', streetfood: 'streetfood',
  cafe: 'cafe', dessert: 'dessert', matcha: 'tea', wagashi: 'wagashi', milktea: 'milktea',
  korean: 'korean', chicken: 'chicken', curry: 'curry',
  tofu: 'tofu', kaiseki: 'bento', kamameshi: 'ricepot', sake: 'sake', bar: 'bar', western: 'western',
};

// 같은 장소에 여러 카테고리가 잡힐 때 아이콘은 '대표 메뉴'가 먼저 오도록 우선순위를 둔다.
export const FOOD_PRIORITY = [
  'xiaolongbao', 'tangbao', 'shengjian', 'dimsum', 'gyoza', 'hotpot', 'duck',
  'takoyaki', 'okonomiyaki', 'tonkatsu', 'ramen', 'tsukemen', 'udon', 'soba', 'somen',
  'sushi', 'unagi', 'seafood', 'tempura', 'yakiniku', 'sukiyaki', 'motsunabe', 'curry',
  'kaiseki', 'kamameshi', 'tofu', 'cafe', 'matcha', 'milktea', 'dessert', 'wagashi',
  'sake', 'bar', 'western', 'korean', 'chicken', 'streetfood', 'yatai', 'market',
  'malatang', 'crayfish', 'lamb', 'guobaorou', 'noodles', 'mentaiko',
];

// 카테고리 판정이 비었을 때(예: 데이터에 fc 없음) 이름 글자로 고르는 축약 규칙.
const FOOD_TEXT_RULES = [
  ['ramen', ['라멘', '라면', '라ーメン']],
  ['dumpling', ['만두', '교자', '딤섬', '샤오룽', '소룡', '하가우', '슈마이', '창펀', '餃子', '小籠', '小笼', '包子']],
  ['hotpot', ['훠궈', '火鍋', '火锅', '나베', '샤브', '모츠']],
  ['noodles', ['국수', '우동', '소바', '소면', '쯔케멘', '츠케멘', 'うどん', 'そば', '蕎麦', '면']],
  ['sushi', ['초밥', '스시', '즈시', '寿司', '사시미', '刺身', '활어']],
  ['tempura', ['덴푸라', '天ぷら', '튀김', '天丼']],
  ['tonkatsu', ['돈카츠', '돈까스', '카츠', 'とんかつ']],
  ['yakiniku', ['야키니쿠', '구이', '焼肉']],
  ['cafe', ['카페', '커피', '珈琲', 'コーヒー', '喫茶']],
  ['tea', ['말차', '녹차', '차야', '찻집', '抹茶', '日本茶']],
  ['dessert', ['디저트', '케이크', '빙수', '아이스크림', '스위츠', '스위트', '파르페', '푸딩', '도넛', '타르트']],
  ['wagashi', ['화과자', '和菓子', '모치', '모찌', '당고', '大福', '餅']],
  ['milktea', ['밀크티', '버블티', 'タピオカ', '奶茶']],
  ['curry', ['카레', 'カレー', '咖喱']],
  ['korean', ['한식', '고깃집', '삼겹살', '김치', '떡볶이']],
  ['chicken', ['치킨', '닭', '唐揚げ', 'からあげ', '미즈타키', '수타키']],
  ['seafood', ['해산물', '장어', 'うなぎ', '海鮮', '海鲜', '명란', '明太子', '사시미', '刺身']],
  ['stall', ['시장', '市場', '노점', '포장마차', '야타이', '屋台', '골목', '먹자']],
  ['bar', ['칵테일', 'cocktail', '와인바', '루프탑바', '酒吧']],
  ['sake', ['사케', '日本酒', '酒蔵', '양조장']],
  ['western', ['양식', '파스타', '스테이크', '洋食', '오므라이스', '오무라이스', '비스트로', '프렌치', '이탈리안']],
  ['tofu', ['두부', '湯葉', '유바', '유도후']],
  ['bento', ['가이세키', '회석', '懐石', '会席', '도시락', '료테이']],
  ['ricepot', ['솥밥', '釜飯', '카마메시']],
];

/* ---------- 쇼핑/교통/관광 하위분류 규칙 (위에서부터 먼저 맞는 것) ---------- */
const RULES = {
  shop: [
    ['massage', ['마사지', '스파', '按摩', '발마사지', '전신마사지']],
    ['drugstore', ['약국', '드럭', '왓슨스', '마쓰모토', '돈키호테', '薬']],
    ['convenience', ['편의점', '세븐일레븐', '패밀리마트', '로손', 'GS25', 'CU 편의']],
    ['department', ['백화점', 'デパート', '이세탄', '미쓰코시', '하큐']],
    ['bookstore', ['서점', '書店', '책방', '북스']],
    ['electronics', ['전자', '가전', '샤오미', '애플', '카메라', '일렉트로']],
    ['cosmetics', ['화장품', '코스메', '세포라', '올리브영', '면세점']],
    ['stationery', ['문구', '필기', '무인양품']],
    // 쇼핑몰은 패션·잡화보다 먼저 본다(난바 CITY·루쿠아·파르코 같은 복합몰).
    ['mall', ['몰', '광장', '플라자', '아울렛', '쇼핑센터', '상업광장', '지하상가', '지하가', '파르코', '루쿠아', '캐널시티', '시티', '관람차', '루프가든']],
    ['market', ['시장', '市場', '재래시장', '상점가', '스지', '도매']],
    ['fashion', ['의류', '패션', '유니클로', '옷']],
    ['souvenir', ['기념품', '공예', '실크', '소품', '전통', '마사시치', '고완']],
    ['supermarket', ['슈퍼', '한인마트', '슈퍼마트', '코스트코', '까르푸', '식품관', '장보기', '신선식품']],
  ],
  transit: [
    ['airport', ['공항', 'airport']],
    ['subway', ['지하철', '메트로', '地铁', '지하철역']],
    ['ferry', ['페리', '여객선', '항 국제터미널', '항구', '선착장']],
    // '역'은 '전역·지역·번역' 같은 낱말에 걸리지 않도록 역명 꼴일 때만 인정한다.
    ['train', ['고속철', '신칸센', '기차', '철도', 'JR', '駅', /(?:[가-힣]{2,}|[A-Za-z0-9)]|）)역(?=\s|$|\()/]],
    ['bus', ['버스', 'bus']],
    ['taxi', ['택시', '디디', '차량', '픽업']],
    ['bike', ['자전거', '바이크']],
    ['card', ['교통카드', '카드']],
    ['tunnel', ['터널']],
  ],
  sight: [
    ['themepark', ['유니버설', '테마파크', '디즈니', '놀이공원', '어트랙션', '유원지', '촬영소', '동화마을']],
    ['aquarium', ['수족관', '동물원', '아쿠아리움', '수족']],
    ['museum', ['박물관', '미술관', '과학관', '문화관', '기념관', '전시', '자료관', '후루사토관', '쇼소인']],
    ['castle', ['성터', '성곽', '城', '고쿠라성', '가라쓰 성', '오사카성', '후쿠오카성', '모모야마 성', '나고야성']],
    ['tower', ['타워', '전망대', '스카이라인', '고층']],
    ['bridge', ['다리', '브리지', '대교', '교량']],
    // 관광 종류라도 열차·전차 자체가 목적이면 교통 아이콘을 그대로 쓴다(사가노 열차·란덴).
    ['train', ['열차', '전차', '트램']],
    ['shrine', ['신사', '神社', '궁', '宮', '대사', '신궁']],
    ['temple', ['사찰', '절', '寺', '정토', '불상', '법화당', '산젠인']],
    ['onsen', ['온천', '温泉', '노천']],
    ['street', ['거리', '골목', '마치', '상점가', '쇼핑가', '먹자', '레트로', '번화가', '도리', '길']],
    ['beach', ['해변', '해수욕', '해안', '바다', '바닷가', '섬']],
    ['park', ['공원', '정원', '가든', '후지엔', '플로럴', '식물원', '숲']],
    ['view', ['야경', '전망', '일몰', '노을', '뷰', '호수']],
    ['mountain', ['로프웨이', '케이블카', '마운틴', '등산', '산악', '계곡', '폭포', '봉우리', '고원']],
  ],
};

const normText = (s) => String(s || '').toLowerCase();
const hit = (kws, t) => kws.some((k) => (k instanceof RegExp ? k.test(t) : t.includes(k.toLowerCase())));

/** 장소(종류·음식 카테고리·검색 텍스트)로 삽화 아이콘 id를 고른다. 항상 유효한 id를 돌려준다. */
export function iconFor(kind, fc = [], text = '') {
  const t = normText(text);
  if (kind === 'food') {
    const set = new Set(fc || []);
    for (const id of FOOD_PRIORITY) if (set.has(id) && FOOD_ICON[id]) return FOOD_ICON[id];
    for (const [icon, kws] of FOOD_TEXT_RULES) if (hit(kws, t)) return icon;
    return KIND_ICON.food;
  }
  const rules = RULES[kind] || [];
  for (const [icon, kws] of rules) if (hit(kws, t)) return icon;
  return KIND_ICON[kind] || 'sight';
}

/**
 * 장소 레코드로 아이콘 id를 고른다. 이름·태그로 판정이 안 돼 종류 기본값(범용)으로
 * 떨어지는 장소만 데이터의 art_key 를 존중한다(수집가가 큐레이션한 값).
 * art_key 는 예전 삽화 낱말(basket·street·boat 등)도 섞여 있어, 실제 아이콘이 있는
 * 값(ICONS 키)일 때만 쓴다 — 그 외에는 이름 기반 판정을 그대로 따른다.
 */
export function iconForPlace(place = {}, fc = [], text = '') {
  const kind = place.kind;
  const derived = iconFor(kind, fc, text);
  const key = place.art_key;
  if (derived === KIND_ICON[kind] && key && ICONS[key]) return key;
  return derived;
}

/** 아이콘 id → { label }. 알 수 없는 id는 종류 기본 아이콘으로. */
export function iconMeta(id) { return ICONS[id] || ICONS.sight; }

/** 인라인 SVG 문자열. aria-label 에 반드시 '삽화'를 넣어 사진과 구분한다. */
export function iconSvg(id, { cls = 'pic', label = '' } = {}) {
  const icon = iconMeta(id);
  const name = label || icon.label;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${name} 삽화">${icon.body}</svg>`;
}

export const ICON_IDS = Object.keys(ICONS);
