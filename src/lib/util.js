// 通用小工具：ID、时间
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const nowIso = () => new Date().toISOString();

export const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
