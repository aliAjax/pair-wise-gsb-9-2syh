// 导入解析层：支持数据库常见 CSV / TSV 与 JSON 导出，不增加依赖
// 表头按常见列名模糊映射；解析结果交给去重层合并

const FIELD_ALIASES = {
  title: ['title', 'article title', 'document title', '题名', '标题', '文献标题'],
  authors: ['authors', 'author', 'author names', 'author full names', '作者'],
  year: ['year', 'publication year', 'date', '出版年', '年份'],
  venue: ['venue', 'source', 'source title', 'journal', 'publication title', 'book title', '出版物', '来源出版物', '期刊'],
  doi: ['doi', 'digital object identifier'],
  url: ['url', 'link', 'article url', '链接', '网页链接', '全文链接'],
  abstract: ['abstract', 'summary', '摘要'],
  ref: ['uid', 'key', 'accession number', '记录号', '入藏号'],
};

const headerKey = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');

function buildHeaderMap(header) {
  const map = {};
  header.forEach((cell, i) => {
    const key = headerKey(cell);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => headerKey(a) === key)) {
        map[i] = field;
        break;
      }
    }
  });
  return map;
}

// 支持引号包裹、引号转义的单行切分
function splitLine(line, delim) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseDelimited(text) {
  const sniff = text.split(/\r?\n/, 1)[0];
  const delim = (sniff.match(/\t/g) || []).length >= (sniff.match(/,/g) || []).length ? '\t' : ',';
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { records: [], error: '未检测到数据行（至少需要表头和一条记录）' };

  const header = splitLine(lines[0], delim);
  const colMap = buildHeaderMap(header);
  if (!Object.values(colMap).includes('title')) {
    return { records: [], error: '表头中找不到标题列（title / 题名）' };
  }
  const records = [];
  for (const line of lines.slice(1)) {
    const cells = splitLine(line, delim);
    const rec = { kind: 'database' };
    cells.forEach((value, i) => {
      const field = colMap[i];
      if (field && (!rec[field] || field === 'title')) rec[field] = value;
    });
    if (rec.title) records.push(rec);
  }
  return { records, error: records.length ? '' : '没有可导入的有效记录' };
}

export function parseImport(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return { records: [], error: '内容为空' };

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.records)
          ? data.records
          : Array.isArray(data.items)
            ? data.items
            : null;
      if (!arr) return { records: [], error: 'JSON 需要是记录数组，或含 records / items 数组' };
      const records = arr
        .map((o) => ({
          kind: 'database',
          title: o.title || o['article title'] || '',
          authors: o.authors || o.author || '',
          year: o.year || o.date || '',
          venue: o.venue || o.source || o.journal || '',
          doi: o.doi || '',
          url: o.url || o.link || '',
          abstract: o.abstract || '',
          ref: o.uid || o.key || o.ref || '',
        }))
        .filter((r) => r.title);
      return { records, error: records.length ? '' : 'JSON 中没有含标题的记录' };
    } catch (e) {
      return { records: [], error: 'JSON 解析失败：' + e.message };
    }
  }
  return parseDelimited(trimmed);
}
