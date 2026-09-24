// 条目资料层：条目长什么样、重复如何识别与合并、批次文本如何解析。
// 只处理数据，不碰界面与存储。

let seq = 0;
const uid = p => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

// DOI 规范化：去掉 doi.org 前缀、doi: 前缀与末尾斜杠，统一小写，
// 这样"网页链接和 DOI 对不上"时仍能认出同一个 DOI。
export const normalizeDoi = doi =>
  (doi || '').trim().toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .replace(/\/+$/, '');

// 标题规范化：小写、标点与空白折叠，用于"标题 + 年份"判重。
export const normalizeTitle = t =>
  (t || '').toLowerCase().replace(/[^0-9a-z一-鿿]+/g, ' ').trim();

const tyKey = (title, year) => `${normalizeTitle(title)}|${year || ''}`;

export function newEntry(rec, source) {
  return {
    id: uid('e'),
    title: (rec.title || '未命名条目').trim(),
    authors: rec.authors || '',
    year: rec.year ? +rec.year : null,
    venue: rec.venue || '',
    doi: normalizeDoi(rec.doi),
    url: (rec.url || '').trim(),
    abstract: rec.abstract || '',
    tags: rec.tags || [],
    aliases: [],   // {kind:'title'|'doi'|'url', value, from} 合并时留下的别名
    sources: source ? [source] : [], // {batch, at} 每次并入都追加一个来源
    createdAt: new Date().toISOString(),
  };
}

// 把一条新记录并入已有条目：补齐缺失字段，不一致的标题/DOI/链接记为别名，追加来源。
export function mergeEntry(base, rec, source) {
  const m = { ...base, aliases: [...base.aliases], sources: [...base.sources, source] };
  if (!m.authors && rec.authors) m.authors = rec.authors;
  if (!m.venue && rec.venue) m.venue = rec.venue;
  if (!m.abstract && rec.abstract) m.abstract = rec.abstract;
  if (!m.year && rec.year) m.year = +rec.year;
  if (!m.url && rec.url) m.url = rec.url.trim();
  const doi = normalizeDoi(rec.doi);
  if (!m.doi && doi) m.doi = doi;

  const norm = (kind, v) =>
    kind === 'title' ? normalizeTitle(v) : kind === 'doi' ? normalizeDoi(v) : (v || '').trim().toLowerCase();
  const alias = (kind, value) => {
    if (!value || !value.trim()) return;
    const canon = kind === 'title' ? m.title : kind === 'doi' ? m.doi : m.url;
    if (norm(kind, value) === norm(kind, canon || '')) return;
    if (m.aliases.some(a => a.kind === kind && norm(kind, a.value) === norm(kind, value))) return;
    m.aliases.push({ kind, value: kind === 'doi' ? normalizeDoi(value) : value.trim(), from: source.batch });
  };
  alias('title', rec.title);
  alias('doi', rec.doi);
  alias('url', rec.url);

  m.tags = [...new Set([...m.tags, ...(rec.tags || [])])];
  return m;
}

// 导入一个批次：按 DOI（规范化后）或 标题+年份 判重，命中则合并，否则新建。
// 返回新条目数组与导入报告（新增/合并明细）。
export function importBatch(entries, records, batchName) {
  const at = new Date().toISOString();
  const out = entries.map(e => ({ ...e }));
  const byId = new Map(out.map(e => [e.id, e]));
  const doiIx = new Map();
  const tyIx = new Map();
  const index = e => {
    if (e.doi) doiIx.set(e.doi, e.id);
    tyIx.set(tyKey(e.title, e.year), e.id);
    for (const a of e.aliases) {
      if (a.kind === 'doi') doiIx.set(a.value, e.id);
      if (a.kind === 'title') tyIx.set(tyKey(a.value, e.year), e.id);
    }
  };
  out.forEach(index);

  const report = { name: batchName, at, total: records.length, added: 0, merged: 0, merges: [] };
  for (const rec of records) {
    const doi = normalizeDoi(rec.doi);
    const hit = (doi && doiIx.get(doi)) || tyIx.get(tyKey(rec.title, rec.year));
    if (hit) {
      const cur = byId.get(hit);
      const merged = mergeEntry(cur, rec, { batch: batchName, at });
      out[out.findIndex(e => e.id === hit)] = merged;
      byId.set(hit, merged);
      index(merged);
      report.merged++;
      report.merges.push({ from: rec.title || '(无标题)', into: cur.title });
    } else {
      const e = newEntry(rec, { batch: batchName, at });
      out.push(e);
      byId.set(e.id, e);
      index(e);
      report.added++;
    }
  }
  return { entries: out, report };
}

// 解析批次文本：JSON 数组，或每行一条 "标题 | 作者 | 年份 | DOI | 链接 | 出版物"。
export function parseBatch(text) {
  const t = (text || '').trim();
  if (!t) return { records: [], errors: ['内容为空'] };
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (!Array.isArray(arr)) throw new Error('not array');
      const records = arr
        .filter(r => r && r.title)
        .map(r => ({
          title: r.title, authors: r.authors, year: r.year ? +r.year : null,
          doi: r.doi, url: r.url, venue: r.venue, abstract: r.abstract,
        }));
      return { records, errors: records.length ? [] : ['JSON 中没有带标题的记录'] };
    } catch {
      return { records: [], errors: ['JSON 解析失败，请检查格式'] };
    }
  }
  const records = [];
  const errors = [];
  t.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const [title, authors, year, doi, url, venue] = line.split('|').map(s => (s || '').trim());
    if (!title) { errors.push(`第 ${i + 1} 行缺少标题，已跳过`); return; }
    records.push({ title, authors, year: +year || null, doi, url, venue });
  });
  return { records, errors };
}
