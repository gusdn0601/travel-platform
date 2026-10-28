// 장소의 '역사 이야기' 수집 — 화면은 story 가 있을 때만 섹션을 그린다.
// 데이터에는 최상위 story(문자열/배열)가 없고, 코스 포인트(course.points[].story)에 26편이 들어 있다.
// 두 형태를 모두 받아 [{ title, story }] 로 평탄화한다.
export function storyEntries(place) {
  if (!place) return [];
  const out = [];
  const push = (title, story) => {
    const s = typeof story === 'string' ? story.trim() : '';
    if (s) out.push({ title: title || '', story: s });
  };
  const top = place.story;
  if (Array.isArray(top)) top.forEach((s, i) => push(top.length > 1 ? `이야기 ${i + 1}` : '이야기', typeof s === 'string' ? s : s?.story || s?.text));
  else if (typeof top === 'string') push('이야기', top);
  if (top && typeof top === 'object' && !Array.isArray(top)) push(top.title || '이야기', top.story || top.text);
  for (const pt of place.course?.points || []) push(pt?.name || pt?.cn || '', pt?.story);
  return out;
}
