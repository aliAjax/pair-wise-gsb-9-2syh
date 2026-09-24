// 本地保存层：localStorage 持久化 + 旧版文献库一次性迁移，无后端、无新依赖
import { DECISION } from './rules.js';
import { makeSource } from './dedupe.js';

const KEY = 'screening-desk-v1';
const LEGACY_KEY = 'research-library';

const wos = {
  id: 'seed-wos',
  name: 'Web of Science 导出（2026-09-15）',
  kind: 'database',
  importedAt: '2026-09-15T09:12:00.000Z',
};
const cnki = {
  id: 'seed-cnki',
  name: '知网检索导出（2026-09-16）',
  kind: 'database',
  importedAt: '2026-09-16T03:40:00.000Z',
};

function src(batch, ref, raw) {
  return makeSource({ kind: 'database', ref, ...raw }, batch.id, batch.name);
}

export function seedState() {
  const items = [
    {
      id: 'seed-1',
      title: 'The Extended Mind',
      authors: 'Clark, A. & Chalmers, D.',
      year: 1998,
      venue: 'Analysis, 58(1)',
      doi: '10.1093/analys/58.1.7',
      url: 'https://doi.org/10.1093/analys/58.1.7',
      abstract: '当外部环境稳定地承担认知功能时，心智边界可以超越头脑与皮肤。',
      aliases: ['延展心智', 'http://www.jstor.org/stable/3328150'],
      sources: [
        src(wos, 'WOS:000076211300004', {
          title: 'The Extended Mind',
          authors: 'Clark A; Chalmers D',
          year: 1998,
          doi: '10.1093/analys/58.1.7',
          url: 'https://doi.org/10.1093/analys/58.1.7',
        }),
        src(cnki, 'CNKI:1758932', {
          title: '延展心智',
          authors: '克拉克; 查尔莫斯',
          year: 1998,
          url: 'http://www.jstor.org/stable/3328150',
        }),
      ],
      reviews: [
        { id: 'r1a', person: 'reviewer-a', decision: DECISION.INCLUDE, reason: '理论框架核心文献，与研究问题直接相关。', at: '2026-09-17T01:05:00.000Z' },
        { id: 'r1b', person: 'reviewer-b', decision: DECISION.INCLUDE, reason: '高被引经典，引言部分必须引用。', at: '2026-09-17T02:20:00.000Z' },
      ],
      adjudication: null,
      revisions: [],
      createdAt: '2026-09-15T09:15:00.000Z',
    },
    {
      id: 'seed-2',
      title: 'Situated Learning: Legitimate Peripheral Participation',
      authors: 'Lave, J. & Wenger, E.',
      year: 1991,
      venue: 'Cambridge University Press',
      doi: '10.1017/cbo9780511815355',
      url: 'https://doi.org/10.1017/CBO9780511815355',
      abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
      aliases: ['情境学习：合法的边缘性参与'],
      sources: [
        src(cnki, 'CNKI:884210', {
          title: '情境学习：合法的边缘性参与',
          authors: '莱夫; 温格',
          year: 1991,
        }),
      ],
      reviews: [
        { id: 'r2a', person: 'reviewer-a', decision: DECISION.INCLUDE, reason: '讨论学习情境化，符合"真实情境"方向。', at: '2026-09-17T06:30:00.000Z' },
        { id: 'r2b', person: 'reviewer-b', decision: DECISION.EXCLUDE, reason: '为教育人类学著作，与本次技术干预主题关联弱。', at: '2026-09-18T00:10:00.000Z' },
      ],
      adjudication: null,
      revisions: [],
      createdAt: '2026-09-16T03:50:00.000Z',
    },
    {
      id: 'seed-3',
      title: 'Designing with Data',
      authors: 'Miller, S.',
      year: 2022,
      venue: 'MIT Press',
      doi: '',
      url: 'https://mitpress.mit.edu/978026204613/designing-with-data/',
      abstract: '把定性洞察转化为可行动设计决策的数据研究方法。',
      aliases: [],
      sources: [
        src(wos, 'WOS:000391827400019', {
          title: 'Designing with Data',
          authors: 'Miller S',
          year: 2022,
          url: 'https://mitpress.mit.edu/978026204613/designing-with-data/',
        }),
      ],
      reviews: [],
      adjudication: null,
      revisions: [],
      createdAt: '2026-09-15T09:20:00.000Z',
    },
  ];

  return {
    batches: [wos, cnki],
    items,
  };
}

// 旧版 research-library 条目转成初筛台待审条目，旧的阅读状态不带入判定
function migrateLegacy() {
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (!Array.isArray(old) || !old.length) return null;
    const batch = {
      id: 'legacy-import',
      name: '原研究库迁移',
      kind: 'database',
      importedAt: new Date().toISOString(),
    };
    const items = old.map((o, i) => ({
      id: 'legacy-' + (o.id ?? i),
      title: o.title || '（无标题）',
      authors: o.authors || '',
      year: Number(o.year) || null,
      venue: o.venue || '',
      doi: '',
      url: '',
      abstract: o.abstract || '',
      aliases: [],
      sources: [
        makeSource(
          { kind: 'database', ref: 'legacy-' + i, title: o.title, authors: o.authors, year: o.year, venue: o.venue },
          batch.id,
          batch.name,
        ),
      ],
      reviews: [],
      adjudication: null,
      revisions: [],
      createdAt: new Date().toISOString(),
    }));
    return { batches: [batch], items };
  } catch {
    return null;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 数据损坏时退回初始数据 */
  }
  const migrated = migrateLegacy();
  return migrated || seedState();
}

export const saveState = (state) => localStorage.setItem(KEY, JSON.stringify(state));
