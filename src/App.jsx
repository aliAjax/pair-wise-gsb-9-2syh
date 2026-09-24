import React, { useEffect, useMemo, useState } from 'react';
import { loadDb, saveDb } from './store';
import { importBatch } from './model';
import { addDecision, deriveStage, REVIEWERS, ADVISOR } from './rules';
import Screening from './views/Screening';
import ImportView from './views/Import';
import LogView from './views/Log';

const ACTORS = [...REVIEWERS, ADVISOR];

export default function App() {
  const [db, setDb] = useState(loadDb);
  const [view, setView] = useState('screening');
  const [actor, setActor] = useState(REVIEWERS[0].id);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => saveDb(db), [db]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const disputedCount = useMemo(
    () => db.entries.filter(e => deriveStage(db.decisions, e.id) === 'disputed').length,
    [db]
  );

  const doImport = (name, records) => {
    const { entries, report } = importBatch(db.entries, records, name);
    setDb(d => ({ ...d, entries, batches: [...d.batches, report] }));
    return report;
  };

  const decide = (entryId, payload) => {
    const res = addDecision(db.decisions, {
      entryId,
      actor,
      role: actor === ADVISOR.id ? 'ruling' : 'review',
      ...payload,
    });
    if (res.error) { setNotice(res.error); return false; }
    setDb(d => ({ ...d, decisions: res.decisions }));
    setNotice('判定已记录，历史判定保留可查');
    return true;
  };

  const nav = [
    { id: 'screening', icon: '▤', label: '筛选台', count: db.entries.length },
    { id: 'disputes', icon: '⚑', label: '争议区', count: disputedCount },
    { id: 'import', icon: '⇪', label: '导入批次' },
    { id: 'log', icon: '≣', label: '判定记录', count: db.decisions.length },
  ];

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> SCREENING</div>
        <div className="library-head">
          <span>文献初筛台 · 双人评审</span>
          <strong>{db.entries.length}<small> 条目</small></strong>
        </div>
        <nav>
          {nav.map(n => (
            <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}>
              {n.icon} <span>{n.label}</span>
              {n.count != null && <b>{n.count}</b>}
            </button>
          ))}
        </nav>
        <div className="role-switch">
          <small>当前身份</small>
          {ACTORS.map(a => (
            <button key={a.id} className={actor === a.id ? 'on' : ''} onClick={() => setActor(a.id)}>
              {a.id === ADVISOR.id ? '★' : '☺'} {a.name}
            </button>
          ))}
        </div>
        <div className="side-foot"><small>本地数据库 · 判定只增不改</small></div>
      </aside>
      <main>
        {view === 'screening' &&
          <Screening db={db} actor={actor} selected={selected} onSelect={setSelected} onDecide={decide} />}
        {view === 'disputes' &&
          <Screening db={db} actor={actor} selected={selected} onSelect={setSelected} onDecide={decide} only="disputed" />}
        {view === 'import' && <ImportView batches={db.batches} onImport={doImport} />}
        {view === 'log' && <LogView db={db} />}
      </main>
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
