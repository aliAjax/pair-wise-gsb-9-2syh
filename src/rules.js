// 判定规则层：双人初筛 → 争议 → 导师裁决。
// 判定只增不改：修改已确认的判定只能追加一条带修订说明的新记录，旧记录保留可查。

export const REVIEWERS = [
  { id: 'r1', name: '学生甲' },
  { id: 'r2', name: '学生乙' },
];
export const ADVISOR = { id: 'advisor', name: '导师' };

export const STAGES = {
  screening: '初筛中',
  disputed: '争议中',
  fulltext: '可入全文',
  excluded: '已排除',
};
export const VERDICT_LABEL = { include: '纳入', exclude: '排除' };

export const actorName = id =>
  id === ADVISOR.id ? ADVISOR.name : (REVIEWERS.find(r => r.id === id) || {}).name || id;

let seq = 0;
const uid = () => `d-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const entryDecisions = (decisions, entryId) =>
  decisions.filter(d => d.entryId === entryId);

// 某审阅者对某条目的当前有效判定 = 其最新一条 review 记录
export function effectiveReview(decisions, entryId, reviewerId) {
  const mine = entryDecisions(decisions, entryId)
    .filter(d => d.role === 'review' && d.actor === reviewerId);
  return mine[mine.length - 1] || null;
}

// 当前有效裁决 = 最新一条 ruling 记录
export function effectiveRuling(decisions, entryId) {
  const rulings = entryDecisions(decisions, entryId).filter(d => d.role === 'ruling');
  return rulings[rulings.length - 1] || null;
}

// 由判定记录推导条目阶段：
// 有裁决 → 按裁决；两人一致 → 可入全文/已排除；两人相反 → 争议；否则初筛中。
export function deriveStage(decisions, entryId) {
  const ruling = effectiveRuling(decisions, entryId);
  if (ruling) return ruling.verdict === 'include' ? 'fulltext' : 'excluded';
  const a = effectiveReview(decisions, entryId, REVIEWERS[0].id);
  const b = effectiveReview(decisions, entryId, REVIEWERS[1].id);
  if (a && b) {
    if (a.verdict !== b.verdict) return 'disputed';
    return a.verdict === 'include' ? 'fulltext' : 'excluded';
  }
  return 'screening';
}

export const canEnterFullText = (decisions, entryId) =>
  deriveStage(decisions, entryId) === 'fulltext';

// 追加一条判定（review 或 ruling）。返回 {decisions, record} 或 {error}。
// 规则：
//  - 理由必填；
//  - 导师只能裁决争议中的条目（修订自己的裁决除外）；
//  - 导师裁决后，初筛判定锁定；
//  - 同一人已有判定时，新记录视为修订，必须填修订说明，并通过 revises 指向旧记录。
export function addDecision(decisions, { entryId, actor, role, verdict, reason, note }) {
  if (!reason || !reason.trim()) return { error: '必须填写判定理由' };
  const ruling = effectiveRuling(decisions, entryId);
  if (role === 'review' && ruling) return { error: '导师已裁决，初筛判定已锁定' };
  if (role === 'ruling' && !ruling && deriveStage(decisions, entryId) !== 'disputed')
    return { error: '只有争议中的条目才能裁决' };

  const prev = role === 'ruling' ? ruling : effectiveReview(decisions, entryId, actor);
  if (prev && (!note || !note.trim()))
    return { error: '修改已确认的判定，必须填写修订说明' };

  const rec = {
    id: uid(),
    entryId,
    actor,
    role,
    verdict,
    reason: reason.trim(),
    note: prev ? note.trim() : '',
    revises: prev ? prev.id : null,
    at: new Date().toISOString(),
  };
  return { decisions: [...decisions, rec], record: rec };
}
