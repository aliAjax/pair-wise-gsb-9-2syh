import { useState } from 'react';
import { citeOf } from '../lib/model.js';
import { fmtTime } from '../lib/util.js';
import {
  PEOPLE, REVIEWERS, DECISION, DECISION_LABEL,
  reviewOf, stageOf, conclusionOf, canReview, canAdjudicate, canRevise, decisionFeed,
} from '../lib/rules.js';
import { StageBadge } from './helpers.jsx';

function ReviewCard({ item, person, locked, onSubmit }) {
  const existing = reviewOf(item, person);
  const [decision, setDecision] = useState(existing?.decision || DECISION.INCLUDE);
  const [reason, setReason] = useState(existing?.reason || '');
  return (
    <div className="review-card">
      <div className="review-head">
        <strong>{PEOPLE[person]}</strong>
        {existing && <span className={'mini ' + (existing.decision === 'include' ? 'mini-in' : 'mini-out')}>
          {DECISION_LABEL[existing.decision]} · {fmtTime(existing.at)}
        </span>}
        {!existing && <span className="mini mini-wait">待审</span>}
      </div>
      {locked ? (
        existing
          ? <p className="review-reason">{existing.reason}</p>
          : <p className="muted">尚未初判，导师已裁决，记录保持空白。</p>
      ) : (
        <>
          <div className="seg">
            <button
              className={decision === DECISION.INCLUDE ? 'seg-on in' : ''}
              onClick={() => setDecision(DECISION.INCLUDE)}
            >
              ✓ 纳入
            </button>
            <button
              className={decision === DECISION.EXCLUDE ? 'seg-on out' : ''}
              onClick={() => setDecision(DECISION.EXCLUDE)}
            >
              × 排除
            </button>
          </div>
          <textarea
            rows={2}
            placeholder="填写初判理由（必填）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="primary small"
            disabled={!reason.trim()}
            onClick={() => onSubmit(person, decision, reason.trim())}
          >
            {existing ? '更新我的初判' : '提交初判'}
          </button>
          {!reason.trim() && <small className="hint">理由必填，留空不能提交</small>}
        </>
      )}
    </div>
  );
}

export default function ItemDetail({ item, onReview, onAdjudicate, onRevise, onNotice }) {
  const [decision, setDecision] = useState(DECISION.INCLUDE);
  const [reason, setReason] = useState('');
  const [revDecision, setRevDecision] = useState(DECISION.INCLUDE);
  const [revNote, setRevNote] = useState('');

  if (!item) {
    return <section className="detail"><div className="no-result">从左侧选择一个条目查看</div></section>;
  }

  const stage = stageOf(item);
  const latest = conclusionOf(item);
  const locked = !canReview(item);
  const adj = item.adjudication;
  const feed = decisionFeed(item);

  const copyCite = () => {
    navigator.clipboard?.writeText(citeOf(item));
    onNotice('引用文本已复制');
  };

  return (
    <section className="detail">
      <div className="detail-top">
        <StageBadge item={item} />
        <button onClick={copyCite}>▣ 复制引用</button>
      </div>

      {stage === 'disputed' && (
        <div className="banner warn">
          <strong>⚖ 争议中：</strong>两名审阅者意见相反，等待导师裁决；裁决前不进入全文阶段。
        </div>
      )}
      {stage === 'fulltext' && (
        <div className="banner ok">
          <strong>✓ 两人一致纳入</strong>，可进入全文阶段。
          {(item.revisions || []).length > 0 && <> 最新修订见下方修订说明。</>}
        </div>
      )}
      {stage === 'excluded' && (
        <div className="banner no">
          <strong>× 两人一致排除</strong>，不进入全文阶段；结论已确认，改动只能另留修订说明。
        </div>
      )}
      {stage === 'revised' && (
        <div className="banner revised">
          <strong>📌 已经导师裁决/修订：</strong>
          当前结论为{latest === 'include' ? '「纳入」，可进入全文阶段' : '「排除」，不进入全文阶段'}；
          旧判断仍可在下方时间线查阅。
        </div>
      )}

      <h2>{item.title}</h2>
      <p className="authors">{item.authors || '作者不详'}</p>

      <div className="detail-section">
        <h4>出版信息 <span>PUBLICATION</span></h4>
        <div className="pub-grid">
          <div><small>年份</small><strong>{item.year || '—'}</strong></div>
          <div><small>出版物</small><strong>{item.venue || '—'}</strong></div>
        </div>
        <div className="pub-grid">
          <div>
            <small>DOI</small>
            <strong>
              {item.doi
                ? <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">{item.doi}</a>
                : '—'}
            </strong>
          </div>
          <div>
            <small>网页链接</small>
            <strong>
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer">打开链接 ↗</a> : '—'}
            </strong>
          </div>
        </div>
      </div>

      {item.abstract && (
        <div className="detail-section">
          <h4>摘要 <span>ABSTRACT</span></h4>
          <p>{item.abstract}</p>
        </div>
      )}

      <div className="detail-section">
        <h4>来源与别名 <span>PROVENANCE · {item.sources.length} 个来源</span></h4>
        <ul className="feed">
          {item.sources.map((s) => (
            <li key={s.id}>
              <span className="mini">{s.kind === 'database' ? '数据库' : '手工'}</span>
              <div>
                <strong>{s.batchName}</strong>
                <p>
                  {s.kind === 'database' ? '数据库导出' : '手工录入'}
                  {s.ref ? ` · 记录号 ${s.ref}` : ''}
                  {s.raw.doi && s.raw.doi.toLowerCase() !== item.doi.toLowerCase() && (
                    <em> · 来源 DOI：{s.raw.doi}</em>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {item.aliases.length > 0 && (
          <div className="alias-box">
            <small>合并保留的别名 / 对不上的链接</small>
            {item.aliases.map((a) => <span key={a}>{a}</span>)}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h4>两人初筛 <span>REVIEW</span></h4>
        <div className="review-grid">
          {REVIEWERS.map((p) => (
            <ReviewCard key={p} item={item} person={p} locked={locked} onSubmit={onReview} />
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h4>导师裁决 <span>ADJUDICATION</span></h4>
        {adj ? (
          <div className={'review-card verdict ' + (adj.decision === 'include' ? 'in' : 'out')}>
            <div className="review-head">
              <strong>{PEOPLE.advisor}裁决：{DECISION_LABEL[adj.decision]}</strong>
              <span className="mini">{fmtTime(adj.at)}</span>
            </div>
            <p className="review-reason">{adj.reason}</p>
          </div>
        ) : canAdjudicate(item) ? (
          <div className="review-card verdict">
            <p className="muted">两人意见相反，请导师裁决。裁决理由必填。</p>
            <div className="seg">
              <button className={decision === DECISION.INCLUDE ? 'seg-on in' : ''} onClick={() => setDecision(DECISION.INCLUDE)}>✓ 纳入（进全文）</button>
              <button className={decision === DECISION.EXCLUDE ? 'seg-on out' : ''} onClick={() => setDecision(DECISION.EXCLUDE)}>× 排除</button>
            </div>
            <textarea rows={2} placeholder="裁决理由（必填）" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button
              className="primary small"
              disabled={!reason.trim()}
              onClick={() => { onAdjudicate(item.id, decision, reason.trim()); setReason(''); }}
            >
              提交裁决
            </button>
          </div>
        ) : (
          <p className="muted">两名审阅者都提交且意见相反时，才需要导师裁决。</p>
        )}
      </div>

      <div className="detail-section">
        <h4>修订说明 <span>REVISION · 旧判断不覆盖</span></h4>
        {canRevise(item) && (
          <div className="revision-form">
            <div className="seg">
              <button className={revDecision === DECISION.INCLUDE ? 'seg-on in' : ''} onClick={() => setRevDecision(DECISION.INCLUDE)}>改判为纳入</button>
              <button className={revDecision === DECISION.EXCLUDE ? 'seg-on out' : ''} onClick={() => setRevDecision(DECISION.EXCLUDE)}>改判为排除</button>
            </div>
            <textarea rows={2} placeholder="说明为什么修订原结论（必填）" value={revNote} onChange={(e) => setRevNote(e.target.value)} />
            <button
              className="outline small"
              disabled={!revNote.trim()}
              onClick={() => { onRevise(item.id, revDecision, revNote.trim()); setRevNote(''); }}
            >
              追加修订说明
            </button>
            <small className="hint">结论确认后不能直接改判；此操作只新增一条修订，原初判与裁决原样保留。</small>
          </div>
        )}
        {!canRevise(item) && <p className="muted">两人初判未齐，暂不需要修订。</p>}
        <ul className="feed">
          {feed.map((f) => (
            <li key={f.id} className={'feed-' + f.kind}>
              <span className="mini">
                {{ review: '初判', adjudication: '裁决', revision: '修订' }[f.kind]}
              </span>
              <div>
                <strong>{PEOPLE[f.person]} · {DECISION_LABEL[f.decision]}</strong>
                <p>{f.reason || f.note}</p>
                <small>{fmtTime(f.at)}{f.kind === 'revision' && f.prior ? `　（此前结论：${DECISION_LABEL[f.prior]}）` : ''}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
