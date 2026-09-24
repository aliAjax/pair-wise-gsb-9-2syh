import React, { useMemo, useState } from 'react';
import { deriveStage, effectiveReview, STAGES, REVIEWERS } from '../rules';
import EntryDetail from '../components/EntryDetail';

// 筛选台（only 为空）或争议区（only='disputed'）：左列表 + 右详情。
export default function Screening({ db, actor, selected, onSelect, onDecide, only }) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('全部');

  const staged = useMemo(
    () => db.entries.map(e => ({ ...e, stage: deriveStage(db.decisions, e.id) })),
    [db]
  );
  const filtered = staged.filter(e =>
    (!only || e.stage === only) &&
    (stage === '全部' || STAGES[e.stage] === stage) &&
    `${e.title}${e.authors}${e.abstract}`.toLowerCase().includes(query.toLowerCase())
  );
  const cur = filtered.find(e => e.id === selected) || filtered[0] || null;

  return (
    <>
      <header>
        <div>
          <span className="crumb">{only ? 'SCREENING / DISPUTES' : 'SCREENING / QUEUE'}</span>
          <h1>{only ? '争议区' : '筛选台'}</h1>
        </div>
        {only && <p className="head-hint">意见相反的条目在此等待导师裁决，裁决前不得进入全文阶段</p>}
      </header>
      <div className="toolbar">
        <div className="search">
          ⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')}>×</button>}
        </div>
        {!only && (
          <div className="tag-filter">
            {['全部', ...Object.values(STAGES)].map(s => (
              <button key={s} className={stage === s ? 'on' : ''} onClick={() => setStage(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>
      <div className="body">
        <section className="paper-list">
          {filtered.map(e => (
            <button
              key={e.id}
              className={'paper ' + (cur && cur.id === e.id ? 'selected' : '')}
              onClick={() => onSelect(e.id)}
            >
              <div className="paper-year">{e.year || '—'}</div>
              <div className="paper-copy">
                <h3>{e.title}</h3>
                <p>{e.authors}</p>
                <div className="dots">
                  {REVIEWERS.map(r => {
                    const d = effectiveReview(db.decisions, e.id, r.id);
                    return (
                      <span
                        key={r.id}
                        className={'dot ' + (d ? d.verdict : '')}
                        title={`${r.name}：${d ? (d.verdict === 'include' ? '纳入' : '排除') : '未判定'}`}
                      >
                        {d ? (d.verdict === 'include' ? '✓' : '✗') : '–'}
                      </span>
                    );
                  })}
                  {e.sources.length > 1 && <span className="merged">{e.sources.length} 来源已合并</span>}
                </div>
              </div>
              <small className={'stage ' + e.stage}>{STAGES[e.stage]}</small>
            </button>
          ))}
          {!filtered.length && <div className="no-result">{only ? '当前没有争议条目' : '没有匹配的条目'}</div>}
        </section>
        <section className="detail">
          {cur
            ? <EntryDetail key={cur.id} entry={cur} decisions={db.decisions} actor={actor} onDecide={onDecide} />
            : <div className="no-result">暂无条目</div>}
        </section>
      </div>
    </>
  );
}
