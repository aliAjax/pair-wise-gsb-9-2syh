// 本地保存层：localStorage 读写与初始种子数据。
import { newEntry } from './model';

const KEY = 'screening-db-v1';
const SEED_AT = '2026-09-20T09:00:00.000Z';

const SEED = [
  {
    title: 'The Extended Mind', authors: 'Clark, A. & Chalmers, D.', year: 1998,
    venue: 'Analysis', doi: '10.1093/analys/58.1.7', url: 'https://doi.org/10.1093/analys/58.1.7',
    tags: ['具身认知', '经典'],
    abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
  },
  {
    title: 'Situated Learning', authors: 'Lave, J. & Wenger, E.', year: 1991,
    venue: 'Cambridge University Press', url: 'https://www.cambridge.org/core/books/situated-learning/',
    tags: ['学习科学', '社会'],
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
  },
  {
    title: 'Designing with Data', authors: 'Miller, S.', year: 2022,
    venue: 'MIT Press', tags: ['设计研究', '方法'],
    abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
  },
  {
    title: 'Cognitive Load During Problem Solving', authors: 'Sweller, J.', year: 1988,
    venue: 'Cognitive Science', doi: '10.1207/s15516709cog1202_4',
    url: 'https://doi.org/10.1207/s15516709cog1202_4', tags: ['认知负荷'],
    abstract: '问题求解活动本身会带来额外认知负荷，教学设计应减少与图式建构无关的负荷。',
  },
  {
    title: 'Make It Stick', authors: 'Brown, P. C., Roediger, H. L. & McDaniel, M. A.', year: 2014,
    venue: 'Harvard University Press', tags: ['学习科学', '记忆'],
    abstract: '基于认知科学的实证研究，阐述间隔练习、检索练习等高效学习策略。',
  },
];

function seed() {
  const entries = SEED.map(r => newEntry(r, { batch: '初始文献库', at: SEED_AT }));
  return {
    entries,
    decisions: [],
    batches: [{ name: '初始文献库', at: SEED_AT, total: entries.length, added: entries.length, merged: 0, merges: [] }],
  };
}

export function loadDb() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY));
    if (db && Array.isArray(db.entries) && Array.isArray(db.decisions) && Array.isArray(db.batches))
      return db;
  } catch { /* 数据损坏时回退到种子 */ }
  return seed();
}

export function saveDb(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* 存储满时静默失败 */ }
}
