// 条目资料层：条目与批次的数据结构
import { uid, nowIso } from './util.js';
import { normalizeDoi, doiFromUrl, parseYear } from './dedupe.js';

export function createItem(record) {
  const doi = normalizeDoi(record.doi) || doiFromUrl(record.url);
  return {
    id: uid(),
    title: String(record.title || '').trim(),
    authors: record.authors || '',
    year: parseYear(record.year),
    venue: record.venue || '',
    doi,
    url: record.url || '',
    abstract: record.abstract || '',
    aliases: [],
    sources: [],
    reviews: [],
    adjudication: null,
    revisions: [],
    createdAt: nowIso(),
  };
}

export const citeOf = (it) =>
  `${it.authors || '（作者不详）'} (${it.year || 'n.d.'}). ${it.title}${it.venue ? '. ' + it.venue : ''}.`;

export function createBatch({ name, kind, raw }) {
  return { id: uid(), name, kind: kind || 'database', raw: raw || '', importedAt: nowIso() };
}
