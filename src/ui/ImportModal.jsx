import { useState } from 'react';

export default function ImportModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!raw.trim()) {
      setError('请先粘贴数据库导出内容');
      return;
    }
    const result = onSubmit({ name: name.trim() || `批次 ${new Date().toLocaleString('zh-CN')}`, raw });
    if (result?.error) setError(result.error);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">IMPORT BATCH</span>
        <h2>导入检索批次</h2>
        <label>批次名称
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：PubMed 导出（2026-09-20）" />
        </label>
        <label>导出内容（CSV / TSV，或 JSON 数组）
          <textarea
            rows={10}
            className="mono"
            placeholder={'title,authors,year,venue,doi,url\nThe Extended Mind,"Clark, A.; Chalmers, D.",1998,Analysis,...'}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(''); }}
          />
        </label>
        <div className="import-help">
          识别列名：title/标题、authors/作者、year/年份、venue/source/来源出版物、doi、url/链接、abstract/摘要。
          重复记录自动并入已有条目，不会产生新条目。
        </div>
        {error && <div className="banner warn tight">{error}</div>}
        <button className="primary full" onClick={submit}>解析并合并导入</button>
      </div>
    </div>
  );
}
