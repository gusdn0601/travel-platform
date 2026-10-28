// Tip 메모 + 외부 링크 검증 (로컬 저장 전용, 업로드 없음)
export const TIP_MAX = 200;
export function validateTip({ text = '', url = '' } = {}) {
  const errors = [];
  const t = String(text).trim();
  if (!t) errors.push('Tip 내용을 입력해 주세요.');
  if (t.length > TIP_MAX) errors.push(`Tip 은 ${TIP_MAX}자까지예요. (현재 ${t.length}자)`);
  let link = null;
  const u = String(url).trim();
  if (u) {
    try {
      const x = new URL(u);
      if (!['http:', 'https:'].includes(x.protocol)) errors.push('링크는 http(s) 주소만 가능해요.');
      else if (x.username || x.password) errors.push('아이디/비밀번호가 포함된 링크는 쓸 수 없어요.');
      else if (u.length > 300) errors.push('링크가 너무 길어요(300자 이내).');
      else link = x.href;
    } catch { errors.push('올바른 링크 주소가 아니에요.'); }
  }
  return { ok: !errors.length, errors, tip: { text: t, url: link } };
}
