// 页面共用的展示小工具
import { STAGE_LABEL, DECISION_LABEL, reviewOf, REVIEWERS, conclusionOf, stageOf } from '../lib/rules.js';
import { fmtTime } from '../lib/util.js';

export const stageClass = (stage) => 'st-' + stage;

export function StageBadge({ item }) {
  const stage = stageOf(item);
  const conclusion = conclusionOf(item);
  const suffix = conclusion ? ` · ${DECISION_LABEL[conclusion]}` : '';
  return <span className={'stage-badge ' + stageClass(stage)}>{STAGE_LABEL[stage]}{suffix}</span>;
}

// 两名审阅者的头像点：✓ 纳入 / × 排除 / · 未审
export function ReviewDots({ item }) {
  return (
    <span className="dots" title={REVIEWERS.map((p) => {
      const r = reviewOf(item, p);
      return `${p === 'reviewer-a' ? '审阅者甲' : '审阅者乙'}：${r ? DECISION_LABEL[r.decision] : '未审'}`;
    }).join('　')}>
      {REVIEWERS.map((p) => {
        const r = reviewOf(item, p);
        const cls = !r ? 'dot none' : r.decision === 'include' ? 'dot in' : 'dot out';
        const mark = !r ? '·' : r.decision === 'include' ? '✓' : '×';
        return <i key={p} className={cls}>{mark}</i>;
      })}
    </span>
  );
}

export { fmtTime };
