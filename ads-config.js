// 광고 슬롯 설정 — 웹(PWA) 단계는 광고 0건(flows.md §8.1, AC-AD-01/AC-HOME-04).
// 앱 단계에서만 enabled=true 로 바꾸고 슬롯 위치(AD-02: 도시·가이드 목록 하단)를 켠다.
// 꺼져 있으면 광고 DOM 자체를 만들지 않는다(높이 0·레이아웃 시프트 0).
export const ads = {
  enabled: false,
  slot: 'AD-02',
  label: '광고',
};
