import React, { useState } from 'react';
import {
  REVIEWERS, ADVISOR, STAGES, VERDICT_LABEL, actorName,
  effectiveReview, effectiveRuling, entryDecisions,
} from '../rules';

const fmt = at => (at || '').slice(0, 16).replace('T', ' ');
const ALIAS_KIND = { title: '标题别名', doi: 'DOI 别名', url: '链接别名' };

// 判定/修订表单：审阅者与导师共用。prev 存在时即为修订，必须填修订说明。
function DecisionForm({ prev, onSubmit }) {
  const [verdict, setVerdict] = useState(prev ? prev.verdict : 'include');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const submit = () => {
    if (onSubmit({ verdict, reason, note })) { setReason(''); setNote(''); }
  };
  return (
    <div className="decide-form">
      <div className="verdict-btns">
        <button className={'inc ' + (verdict === 'include' ? 'on' : '')} onClick={() => setVerdict('include')}>✓ 纳入</button>
        <button className={'exc ' + (verdict === 'exclude' ? 'on' : '')} onClick={() => setVerdict('exclude')}>✕ 排除</button>
      </div>
      <textarea rows="2" placeholder="判定理由（必填）" value={reason} onChange={e => setReason(e.target.value)} />
      {prev && (
        <input
          placeholder="修订说明（必填）：为什么修改之前的判定"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      )}
      <button className="primary full" onClick={submit}>
        {prev ? '提交修订（旧判定保留可查）' : '提交判定'}
      </button>
    </div>
  );
}

export default function EntryDetail({ entry, decisions, actor, onDecide }) {
  const isAdvisor = actor === ADVISOR.id;
  const reviews = REVIEWERS.map(r => ({ r, d: effectiveReview(decisions, entry.id, r.id) }));
  const ruling = effectiveRuling(decisions, entry.id);
  const mine = isAdvisor ? null : effectiveReview(decisions, entry.id, actor);
  const history = entryDecisions(decisions, entry.id);
  const superseded = new Set(history.filter(d => d.revises).map(d => d.revises));
  const canRule = isAdvisor && (entry.stage === 'disputed' || ruling);

  return (
    <>
      {entry.stage === 'disputed' &&
        <div className="banner dispute">⚑ 两名审阅者意见相反，已进入争议区。导师裁决前，本条目不得进入全文阶段。</div>}
      {entry.stage === 'fulltext' &&
        <div className="banner ok">✓ {ruling ? '导师裁决纳入' : '两名审阅者一致纳入'}，可进入全文阶段。</div>}
      {entry.stage === 'excluded' &&
        <div className="banner muted">✕ {ruling ? '导师裁决排除' : '两名审阅者一致排除'}。</div>}
      {entry.stage === 'screening' &&
        <div className="banner muted">初筛进行中：{reviews.filter(x => x.d).length}/2 名审阅者已判定。</div>}

      <div className="detail-top">
        <span className={'stage ' + entry.stage}>{STAGES[entry.stage]}</span>
        <span className="crumb">{entry.id}</span>
      </div>
      <h2>{entry.title}</h2>
      <p className="authors">{entry.authors || '作者未知'}</p>

      <div className="detail-section">
        <h4>出版信息 <span>PUBLICATION</span></h4>
        <div className="pub-grid">
          <div><small>出版物</small><strong>{entry.venue || '—'}</strong></div>
          <div><small>年份</small><strong>{entry.year || '—'}</strong></div>
          <div>
            <small>DOI</small>
            <strong>{entry.doi
              ? <a href={'https://doi.org/' + entry.doi} target="_blank" rel="noreferrer">{entry.doi}</a>
              : '—'}</strong>
          </div>
          <div>
            <small>链接</small>
            <strong>{entry.url
              ? <a href={entry.url} target="_blank" rel="noreferrer">打开来源页 ↗</a>
              : '—'}</strong>
          </div>
        </div>
      </div>

      {entry.abstract && (
        <div className="detail-section">
          <h4>摘要 <span>ABSTRACT</span></h4>
          <p>{entry.abstract}</p>
        </div>
      )}

      <div className="detail-section">
        <h4>来源与别名 <span>PROVENANCE</span></h4>
        <div className="src-list">
          {entry.sources.map((s, i) => (
            <div className="src-row" key={i}>
              <span className="src-batch">{s.batch}</span>
              <small>{fmt(s.at)}</small>
            </div>
          ))}
        </div>
        {entry.aliases.length
          ? <div className="alias-chips">
              {entry.aliases.map((a, i) => <span key={i}>{ALIAS_KIND[a.kind]} · {a.value}</span>)}
            </div>
          : <p className="hint">无别名：各来源批次的标识一致。</p>}
      </div>

      <div className="detail-section">
        <h4>双人初筛 <span>DUAL REVIEW</span></h4>
        <div className="review-grid">
          {reviews.map(({ r, d }) => (
            <div className="review-card" key={r.id}>
              <h5>
                {r.name}
                {d && <b className={'v ' + d.verdict}>{VERDICT_LABEL[d.verdict]}</b>}
                {d && d.revises && <span className="tag-rev">已修订</span>}
              </h5>
              {d ? <p>{d.reason}</p> : <p className="hint">尚未判定</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h4>导师裁决 <span>ADJUDICATION</span></h4>
        {ruling
          ? <div className="review-card">
              <h5>
                导师 <b className={'v ' + ruling.verdict}>{VERDICT_LABEL[ruling.verdict]}</b>
                {ruling.revises && <span className="tag-rev">已修订</span>}
              </h5>
              <p>{ruling.reason}</p>
              <small className="hint">{fmt(ruling.at)}</small>
            </div>
          : <p className="hint">{entry.stage === 'disputed' ? '等待导师裁决。' : '双人未出现分歧，无需裁决。'}</p>}
        {canRule && (
          <DecisionForm
            key={'rule-' + (ruling ? ruling.id : 'new')}
            prev={ruling}
            onSubmit={p => onDecide(entry.id, p)}
          />
        )}
      </div>

      {!isAdvisor && (
        <div className="detail-section">
          <h4>{mine ? '修订我的判定' : '我的判定'} <span>{mine ? 'REVISION' : 'MY REVIEW'}</span></h4>
          {ruling
            ? <p className="hint">导师已裁决，初筛判定锁定；旧判定仍可在下方历史中查询。</p>
            : <DecisionForm
                key={'rev-' + (mine ? mine.id : 'new')}
                prev={mine}
                onSubmit={p => onDecide(entry.id, p)}
              />}
        </div>
      )}

      <div className="detail-section">
        <h4>判定历史 <span>AUDIT LOG · 只增不改</span></h4>
        {!history.length && <p className="hint">还没有任何判定。</p>}
        <div className="timeline">
          {history.map(d => (
            <div className={'tl-item' + (superseded.has(d.id) ? ' old' : '')} key={d.id}>
              <div className="tl-head">
                <b>{actorName(d.actor)}{d.role === 'ruling' ? ' · 裁决' : ''}</b>
                <span className={'v ' + d.verdict}>{VERDICT_LABEL[d.verdict]}</span>
                {d.revises && <span className="tag-rev">修订</span>}
                {superseded.has(d.id) && <span className="tag-old">已被修订</span>}
                <small>{fmt(d.at)}</small>
              </div>
              <p>{d.reason}</p>
              {d.note && <p className="rev-note">修订说明：{d.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
