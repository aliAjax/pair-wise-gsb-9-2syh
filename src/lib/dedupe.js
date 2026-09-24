// 条目资料层：DOI / 标题 / 年份归一化与批次去重合并
// 合并时保留每个来源及别名（数据库之间标题、链接、DOI 对不上的情况都留痕）

export function normalizeDoi(raw = '') {
  let s = String(raw).trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  s = s.replace(/^doi:/i, '');
  return s.replace(/\s+/g, '').replace(/[.。;；,，]+$/, '');
}

const DOI_IN_URL = /doi\.org\/(10\.\d{1,9}\/[^\s?#]+)/i;
export function doiFromUrl(url = '') {
  const m = String(url).match(DOI_IN_URL);
  return m ? normalizeDoi(m[1]) : '';
}

export const effectiveDoi = (r) => normalizeDoi(r.doi) || doiFromUrl(r.url);

export function normalizeTitle(t = '') {
  return String(t)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .trim();
}

export const parseYear = (v) => {
  const m = String(v ?? '').match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
};

// 同一篇：DOI 一致；DOI 都缺失时标题一致且年份相同
export function sameRecord(a, b) {
  const da = effectiveDoi(a);
  const db = effectiveDoi(b);
  if (da && db) return da === db;
  const ta = normalizeTitle(a.title);
  const tb = normalizeTitle(b.title);
  if (ta && ta === tb) {
    const ya = parseYear(a.year);
    const yb = parseYear(b.year);
    return ya !== null && yb !== null && ya === yb;
  }
  return false;
}

const addUnique = (list, value) => {
  const v = String(value ?? '').trim();
  if (v && !list.some((x) => x.toLowerCase() === v.toLowerCase())) list.push(v);
  return list;
};

export function makeSource(record, batchId, batchName) {
  return {
    id: `${batchId}:${record.kind}:${record.ref || record.title.slice(0, 40)}`,
    batchId,
    batchName,
    kind: record.kind, // database / manual
    ref: record.ref || '',
    raw: { ...record },
  };
}

// 把一条导入记录并入已存在条目，返回新条目；别名、来源只增不删
export function mergeRecord(item, record, source) {
  const aliases = [...(item.aliases || [])];

  const doi = normalizeDoi(record.doi) || doiFromUrl(record.url);
  const titleKey = normalizeTitle(record.title);
  if (titleKey && normalizeTitle(item.title) !== titleKey) addUnique(aliases, record.title);
  if (doi && normalizeDoi(item.doi) !== doi) addUnique(aliases, `DOI: ${doi}`);
  if (record.url) {
    const urlDoi = doiFromUrl(record.url);
    // 链接与 DOI 对不上时，链接本身作为别名保留
    if (!urlDoi || (item.doi && urlDoi !== normalizeDoi(item.doi)) || doi !== urlDoi) {
      addUnique(aliases, record.url);
    }
  }

  const sources = item.sources.some((s) => s.id === source.id)
    ? item.sources
    : [...item.sources, source];

  const filled = { ...item, sources, aliases };
  const fill = (field, value) => {
    if ((filled[field] === '' || filled[field] == null) && value) filled[field] = value;
  };
  fill('title', record.title.trim());
  fill('authors', record.authors);
  fill('venue', record.venue);
  fill('abstract', record.abstract);
  if (!filled.year) filled.year = parseYear(record.year);
  if (!filled.doi) filled.doi = doi;
  if (!filled.url) filled.url = record.url || '';
  return filled;
}
