import React, { useState } from 'react';
import { parseBatch } from '../model';

// 示例批次：演示 DOI 命中合并、标题+年份命中合并、批内重复、别名保留。
const SAMPLE = `The Extended Mind | Clark, A. & Chalmers, D. | 1998 | 10.1093/analys/58.1.7 | https://philpapers.org/rec/CLATEM | Analysis
Situated Learning | Lave, J. & Wenger, E. | 1991 | | https://doi.org/10.1017/CBO9780511815355 | Cambridge University Press
Grit: Perseverance and Passion for Long-Term Goals | Duckworth, A. L. et al. | 2007 | 10.1037/0022-3514.92.6.1087 | https://doi.org/10.1037/0022-3514.92.6.1087 | JPSP
Grit: passion and perseverance for long-term goals (suppl.) | Duckworth, A. L. et al. | 2007 | 10.1037/0022-3514.92.6.1087 | |
Attention Is All You Need | Vaswani, A. et al. | 2017 | | https://arxiv.org/abs/1706.03762 | NeurIPS
Attention Is All You Need | Vaswani, A. et al. | 2017 | | https://arxiv.org/abs/1706.03762 | NeurIPS`;

const fmt = at => (at || '').slice(0, 16).replace('T', ' ');

export default function ImportView({ batches, onImport }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState([]);
  const [report, setReport] = useState(null);

  const run = () => {
    const { records, errors } = parseBatch(text);
    setErrors(errors);
    if (!records.length) return;
    const batchName = name.trim() || `导入批次 ${new Date().toLocaleString('zh-CN')}`;
    setReport(onImport(batchName, records));
    setText('');
    setName('');
  };

  return (
    <>
      <header>
        <div>
          <span className="crumb">SCREENING / IMPORT</span>
          <h1>导入批次</h1>
        </div>
        <p className="head-hint">按 DOI 或 标题+年份 合并重复项，来源与别名全部保留</p>
      </header>
      <div className="import-wrap">
        <div className="detail-section">
          <h4>粘贴数据库导出 <span>PASTE BATCH</span></h4>
          <p className="hint">
            每行一条：<code>标题 | 作者 | 年份 | DOI | 链接 | 出版物</code>，或直接粘贴 JSON 数组。
            DOI 会规范化（去掉 doi.org 前缀）后比对；对不上的网页链接与 DOI 会作为别名保留，不会丢失。
          </p>
          <label className="fld">批次名称
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：WoS 导出 2026-09-24" />
          </label>
          <textarea
            rows="8"
            placeholder={'The Extended Mind | Clark, A. & Chalmers, D. | 1998 | 10.1093/analys/58.1.7 | https://… | Analysis'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {errors.map((er, i) => <div className="err" key={i}>{er}</div>)}
          <div className="row-btns">
            <button className="outline" onClick={() => { setText(SAMPLE); setName('PubMed 导出 09-24'); }}>填入示例批次</button>
            <button className="primary" onClick={run}>解析并导入</button>
          </div>
        </div>

        {report && (
          <div className="report">
            <b>批次「{report.name}」导入完成</b>
            <p>共 {report.total} 条 · 新增 {report.added} · 合并重复 {report.merged}</p>
            {report.merges.length > 0 && (
              <ul>{report.merges.map((m, i) => <li key={i}>「{m.from}」并入「{m.into}」</li>)}</ul>
            )}
          </div>
        )}

        <div className="detail-section">
          <h4>历史批次 <span>BATCHES</span></h4>
          <table className="log-table">
            <thead><tr><th>批次</th><th>时间</th><th>总数</th><th>新增</th><th>合并</th></tr></thead>
            <tbody>
              {[...batches].reverse().map((b, i) => (
                <tr key={i}>
                  <td>{b.name}</td>
                  <td>{fmt(b.at)}</td>
                  <td>{b.total}</td>
                  <td>{b.added}</td>
                  <td>{b.merged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
