import { stageOf } from '../lib/rules.js';
import { fmtTime } from '../lib/util.js';

export default function BatchesPage({ batches, items, onImport }) {
  const statsOf = (batch) => {
    const own = items.filter((it) => it.sources.some((s) => s.batchId === batch.id));
    return {
      total: own.length,
      pending: own.filter((x) => stageOf(x) === 'pending').length,
      disputed: own.filter((x) => stageOf(x) === 'disputed').length,
      fulltext: own.filter((x) => stageOf(x) === 'fulltext').length,
    };
  };

  return (
    <div className="page-pad">
      <div className="batch-intro">
        <p>
          每个导入批次独立留档。批次中的记录按 <b>DOI</b>，或在 DOI 缺失时按
          <b> 标题 + 年份 </b>与现有条目合并；各数据库来源及对不上的标题、链接都作为别名保留。
        </p>
        <button className="primary" onClick={onImport}>＋ 导入新批次</button>
      </div>
      <div className="batch-grid">
        {batches.map((b) => {
          const s = statsOf(b);
          return (
            <div key={b.id} className="batch-card">
              <div className="batch-head">
                <strong>{b.name}</strong>
                <span className={'mini ' + (b.kind === 'database' ? 'mini-wait' : 'mini-in')}>
                  {b.kind === 'database' ? '数据库导出' : '手工录入'}
                </span>
              </div>
              <small>导入于 {fmtTime(b.importedAt)}</small>
              <div className="batch-stats">
                <span><b>{s.total}</b> 去重后条目</span>
                <span><b>{s.pending}</b> 待审</span>
                <span><b>{s.disputed}</b> 争议</span>
                <span><b>{s.fulltext}</b> 全文</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
