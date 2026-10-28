// 지도 어댑터: 1단계는 외부 링크만 (Google Maps API/키 없음). 2단계에서 Places 어댑터로 교체.
export const mapsAdapter = {
  link(place) {
    const q = place.lat != null ? `${place.lat},${place.lng}` : (place.name_local || place.name_ko);
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  },
  async searchPlaces() { throw new Error('개인 여행지 검색은 2단계에서 제공돼요.'); },
};
