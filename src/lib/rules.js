// 判定规则层：两名审阅者初筛、导师裁决、修订留痕
import { uid, nowIso } from './util.js';

export const REVIEWERS = ['reviewer-a', 'reviewer-b'];
export const ADVISOR = 'advisor';
export const PEOPLE = {
  'reviewer-a': '审阅者甲',
  'reviewer-b': '审阅者乙',
  advisor: '导师',
};

export const DECISION = { INCLUDE: 'include', EXCLUDE: 'exclude' };
export const DECISION_LABEL = { include: '纳入', exclude: '排除' };

// 阶段：待审 / 争议中（裁决前不得进入全文） / 已排除 / 全文 / 已修订
export const STAGE = {
  PENDING: 'pending',
  DISPUTED: 'disputed',
  EXCLUDED: 'excluded',
  FULLTEXT: 'fulltext',
  REVISED: 'revised',
};
export const STAGE_LABEL = {
  pending: '待初筛',
  disputed: '争议中',
  excluded: '已排除',
  fulltext: '可进全文',
  revised: '已修订',
};

export const reviewOf = (item, person) => item.reviews.find((r) => r.person === person);
export const allDecided = (item) => REVIEWERS.every((p) => reviewOf(item, p));

// 当前阶段（不写入数据，由判定规则实时推导）
export function stageOf(item) {
  if (item.revisions?.length || item.adjudication) return STAGE.REVISED;
  const revs = REVIEWERS.map((p) => reviewOf(item, p)).filter(Boolean);
  if (revs.length === 2 && revs[0].decision !== revs[1].decision) return STAGE.DISPUTED;
  if (revs.length === 2) {
    return revs[0].decision === DECISION.INCLUDE ? STAGE.FULLTEXT : STAGE.EXCLUDED;
  }
  return STAGE.PENDING;
}

// 条目最终结论：有修订以最新修订为准；否则用裁决；再否则用两人一致意见
export function conclusionOf(item) {
  if (item.revisions?.length) return item.revisions[item.revisions.length - 1].decision;
  if (item.adjudication) return item.adjudication.decision;
  if (allDecided(item)) {
    const a = reviewOf(item, REVIEWERS[0]);
    return a.decision === reviewOf(item, REVIEWERS[1]).decision ? a.decision : null;
  }
  return null;
}

// 审阅者能否给出/修改初判：两人都提交前可改自己的；一旦齐活即冻结，
// 一致即确认、相反则只能走导师裁决
export const canReview = (item) => item.reviews.length < REVIEWERS.length;
// 导师能否裁决：两人意见相反
export const canAdjudicate = (item) =>
  !item.adjudication &&
  allDecided(item) &&
  reviewOf(item, REVIEWERS[0]).decision !== reviewOf(item, REVIEWERS[1]).decision;
// 导师能否留修订说明：结论已确认（两人一致或已裁决）；争议中不行
export const canRevise = (item) => conclusionOf(item) !== null;

export function recordReview(item, person, decision, reason) {
  const at = nowIso();
  const existing = reviewOf(item, person);
  const reviews = existing
    ? item.reviews.map((r) => (r.person === person ? { ...r, decision, reason, at } : r))
    : [...item.reviews, { id: uid(), person, decision, reason, at }];
  return { ...item, reviews };
}

export function recordAdjudication(item, decision, reason) {
  if (item.adjudication) return item;
  return {
    ...item,
    adjudication: { id: uid(), person: ADVISOR, decision, reason, at: nowIso() },
  };
}

// 已确认条目不直接改判断，只追加一条修订说明；旧判断全部保留可查
export function recordRevision(item, decision, note) {
  const prior = conclusionOf(item);
  return {
    ...item,
    revisions: [
      ...(item.revisions || []),
      { id: uid(), person: ADVISOR, decision, note, prior, at: nowIso() },
    ],
  };
}

// 按时间倒序汇总所有判定动作（初判 / 裁决 / 修订），供时间线展示
export function decisionFeed(item) {
  const feed = [
    ...item.reviews.map((r) => ({ kind: 'review', ...r })),
    ...(item.adjudication ? [{ kind: 'adjudication', ...item.adjudication }] : []),
    ...(item.revisions || []).map((r) => ({ kind: 'revision', ...r })),
  ];
  return feed.sort((a, b) => (a.at < b.at ? 1 : -1));
}
