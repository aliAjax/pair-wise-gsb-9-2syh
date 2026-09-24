import React, { useState } from 'react';
import { actorName, VERDICT_LABEL } from '../rules';

const fmt = at => (at || '').slice(0, 16).replace('T', ' ');

// 判定记录：全部判定的只增不改流水，含被修订的旧判定，可按条目/理由检索。
export default function LogView({ db }) {
  const [q, setQ] = useState('');
  const titleOf = id => (db.entries.find(e => e.id === id) || {}).title || '（未知条目）';
  const superseded = new Set(db.decisions.filter(d => d.revises).map(d => d.revises));
  const rows = [...db.decisions].reverse().filter(d =>
    !q || `${titleOf(d.entryId)}${d.reason}${d.note}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <header>
        <div>
          <span className="crumb">SCREENING / AUDIT LOG</span>
          <h1>判定记录</h1>
        </div>
        <p className="head-hint">判定只增不改：修订生成新记录，旧判定保留可查</p>
      </header>
      <div className="import-wrap">
        <div className="toolbar-lite">
          <div className="search">
            ⌕<input placeholder="按条目标题或理由搜索…" value={q} onChange={e => setQ(e.target.value)} />
            {q && <button onClick={() => setQ('')}>×</button>}
          </div>
        </div>
        {!rows.length && <div className="no-result">还没有判定记录</div>}
        {rows.length > 0 && (
          <table className="log-table">
            <thead>
              <tr><th>时间</th><th>条目</th><th>判定人</th><th>结论</th><th>理由 / 修订说明</th></tr>
            </thead>
            <tbody>
              {rows.map(d => (
                <tr key={d.id} className={superseded.has(d.id) ? 'old-row' : ''}>
                  <td className="mono">{fmt(d.at)}</td>
                  <td>{titleOf(d.entryId)}</td>
                  <td>{actorName(d.actor)}{d.role === 'ruling' ? ' · 裁决' : ''}</td>
                  <td>
                    <span className={'v ' + d.verdict}>{VERDICT_LABEL[d.verdict]}</span>
                    {d.revises && <span className="tag-rev">修订</span>}
                    {superseded.has(d.id) && <span className="tag-old">已被修订</span>}
                  </td>
                  <td>
                    {d.reason}
                    {d.note && <div className="rev-note">修订说明：{d.note}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
