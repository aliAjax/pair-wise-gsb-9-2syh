import assert from 'node:assert';
import { normalizeDoi, sameRecord, makeSource, mergeRecord, doiFromUrl } from '../src/lib/dedupe.js';
import { parseImport } from '../src/lib/importer.js';
import { createItem } from '../src/lib/model.js';
import {
  stageOf, conclusionOf, canReview, canAdjudicate, canRevise,
  recordReview, recordAdjudication, recordRevision,
} from '../src/lib/rules.js';

// --- DOI / 链接归一化 ---
assert.equal(normalizeDoi('https://doi.org/10.1/A.1'), '10.1/a.1');
assert.equal(normalizeDoi('doi: 10.2/b'), '10.2/b');
assert.equal(doiFromUrl('http://dx.doi.org/10.3/c%20x'), '10.3/c%20x');

// --- 同篇判定：DOI 一致；无 DOI 时标题+年份 ---
assert.ok(sameRecord({ title: 'The Extended Mind', year: 1998 }, { title: ' the extended MIND ', year: '1998年' }));
assert.ok(!sameRecord({ title: 'The Extended Mind', year: 1998 }, { title: 'The Extended Mind', year: 1999 }));
assert.ok(sameRecord({ doi: '10.1/a', title: 'X', year: 2000 }, { title: '完全不同的题名', year: 2010, url: 'https://doi.org/10.1/A' }));

// --- 合并：保留来源、别名、对不上的链接 ---
let item = createItem({ title: 'The Extended Mind', authors: 'Clark', year: 1998, doi: '10.1/a', url: 'https://doi.org/10.1/a' });
item.sources = [makeSource({ kind: 'database', ref: 'wos1' }, 'b1', 'WoS')];
item = mergeRecord(item,
  { kind: 'database', title: '延展心智', authors: '克拉克', year: 1998, url: 'http://jstor.org/stable/3328150' },
  makeSource({ kind: 'database', ref: 'cnki1' }, 'b2', '知网'));
assert.equal(item.sources.length, 2);
assert.ok(item.aliases.includes('延展心智'));
assert.ok(item.aliases.includes('http://jstor.org/stable/3328150'));
// 首条字段不被覆盖
assert.equal(item.title, 'The Extended Mind');

// 同来源重复导入不重复挂载
item = mergeRecord(item,
  { kind: 'database', title: '延展心智', year: 1998, url: 'http://jstor.org/stable/3328150' },
  makeSource({ kind: 'database', ref: 'cnki1' }, 'b2', '知网'));
assert.equal(item.sources.length, 2);

// --- 解析 CSV / TSV ---
const csv = 'Title,Authors,Publication Year,DOI\n"Hello, World",Doe J,2020,10.1/x';
const r1 = parseImport(csv);
assert.equal(r1.error, '');
assert.equal(r1.records[0].title, 'Hello, World');
assert.equal(r1.records[0].year, '2020');
assert.equal(r1.records[0].doi, '10.1/x');

const tsv = parseImport('题名\t作者\t年份\n学习的本质\t张三\t2021');
assert.equal(tsv.records[0].title, '学习的本质');
assert.equal(tsv.records[0].authors, '张三');

const j = parseImport('[{"article title":"T","author":"A","date":2019}]');
assert.equal(j.records[0].title, 'T');
assert.equal(j.records[0].year, 2019);
assert.ok(parseImport('').error);
assert.ok(parseImport('a,b,c\n1,2,3').error.includes('标题'));

// --- 判定流转 ---
let it = createItem({ title: 'Flow: A Test', year: 2020 });
assert.equal(stageOf(it), 'pending');
assert.equal(conclusionOf(it), null);
assert.equal(canAdjudicate(it), false);

it = recordReview(it, 'reviewer-a', 'include', '相关');
assert.equal(stageOf(it), 'pending');
assert.equal(canReview(it), true); // 第二人未交，第一人仍可改

it = recordReview(it, 'reviewer-b', 'exclude', '不相关');
assert.equal(stageOf(it), 'disputed');
assert.equal(conclusionOf(it), null);
assert.equal(canReview(it), false); // 两人齐了，初判冻结
assert.equal(canAdjudicate(it), true);
assert.equal(canRevise(it), false); // 争议未裁决，不能修订

it = recordAdjudication(it, 'include', '方法契合，纳入');
assert.equal(stageOf(it), 'revised');
assert.equal(conclusionOf(it), 'include');
assert.equal(canAdjudicate(it), false);
// 裁决不能重复提交（旧裁决保留）
const frozen = recordAdjudication(it, 'exclude', '再来一次');
assert.equal(frozen.adjudication.decision, 'include');

// 已确认条目改判只能追加修订，旧判断仍在
it = recordRevision(it, 'exclude', '发现与干预无关，改判');
assert.equal(conclusionOf(it), 'exclude');
assert.equal(it.reviews.length, 2);
assert.equal(it.adjudication.decision, 'include'); // 旧裁决原样保留
assert.equal(it.revisions.length, 1);
assert.equal(it.revisions[0].prior, 'include');

// 一致排除的路径
let ex = createItem({ title: 'Old News', year: 1980 });
ex = recordReview(ex, 'reviewer-a', 'exclude', '过时');
ex = recordReview(ex, 'reviewer-b', 'exclude', '主题不符');
assert.equal(stageOf(ex), 'excluded');
assert.equal(conclusionOf(ex), 'exclude');
assert.equal(canAdjudicate(ex), false);
assert.equal(canRevise(ex), true);

console.log('ALL LOGIC TESTS PASSED');
