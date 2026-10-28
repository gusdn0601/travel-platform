// 작은 공용 유틸
export const debounce = (fn, ms) => { let h; const d = (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(h); return d; };
