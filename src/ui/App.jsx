import { useEffect, useMemo, useState } from 'react';
import { loadState, saveState, seedState } from '../lib/storage.js';
import { parseImport } from '../lib/importer.js';
import { sameRecord, makeSource, mergeRecord } from '../lib/dedupe.js';
import { createItem, createBatch, citeOf } from '../lib/model.js';
import {
  stageOf, conclusionOf, canReview, canAdjudicate, canRevise,
  recordReview, recordAdjudication, recordRevision,
} from '../lib/rules.js';
import DeskPage from './DeskPage.jsx';
import BatchesPage from './BatchesPage.jsx';
import ImportModal from './ImportModal.jsx';

export default function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => saveState(state), [state]);

  const { items, batches } = state;
  const effectiveSelected = selectedId && items.some((x) => x.id === selectedId)
    ? selectedId
    : items[0]?.id || null;

  const count = (id) => {
    if (id === 'all') return items.length;
    if (id === 'batches') return batches.length;
    return items.filter((x) => stageOf(x) === id).length;
  };

  const toast = (msg) => {
    setNotice(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setNotice(''), 2600);
  };

  const patchItem = (id, fn) =>
    setState((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? fn(it) : it)) }));

  const handleReview = (person, decision, reason) => {
    if (!canReview(items.find((x) => x.id === effectiveSelected))) {
      toast('导师已裁决，初判锁定');
      return;
    }
    patchItem(effectiveSelected, (it) => recordReview(it, person, decision, reason));
    const stage = stageOf(recordReview(items.find((x) => x.id === effectiveSelected), person, decision, reason));
    toast(stage === 'disputed' ? '意见相反，条目进入争议区，等待导师裁决' : '初判已记录');
  };

  const handleAdjudicate = (id, decision, reason) => {
    const it = items.find((x) => x.id === id);
    if (!canAdjudicate(it)) {
      toast('当前状态不能裁决');
      return;
    }
    patchItem(id, (x) => recordAdjudication(x, decision, reason));
    toast(decision === 'include' ? '裁决：纳入，可进入全文阶段' : '裁决：排除');
  };

  const handleRevise = (id, decision, note) => {
    const it = items.find((x) => x.id === id);
    if (!canRevise(it)) {
      toast('结论尚未确认，不能留修订');
      return;
    }
    patchItem(id, (x) => recordRevision(x, decision, note));
    toast('修订说明已追加，旧判断保留可查');
  };

  const handleImport = ({ name, raw }) => {
    const { records, error } = parseImport(raw);
    if (error) return { error };

    const batch = createBatch({ name, kind: 'database', raw });
    let added = 0;
    let merged = 0;
    let firstNewId = null;

    const nextItems = [...items];
    records.forEach((record) => {
      const source = makeSource(record, batch.id, name);
      const idx = nextItems.findIndex((it) => sameRecord(it, record));
      if (idx >= 0) {
        nextItems[idx] = mergeRecord(nextItems[idx], record, source);
        merged += 1;
      } else {
        const item = createItem(record);
        item.sources = [source];
        if (!firstNewId) firstNewId = item.id;
        nextItems.push(item);
        added += 1;
      }
    });

    setState((s) => ({ batches: [batch, ...s.batches], items: nextItems }));
    setShowImport(false);
    setView('all');
    if (firstNewId) setSelectedId(firstNewId);
    toast(`导入完成：${records.length} 条，新增 ${added} 条，合并去重 ${merged} 条`);
    return null;
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `screening-desk-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('本地数据已导出为 JSON 备份');
  };

  const exportCites = () => {
    const lines = items
      .filter((x) => conclusionOf(x) === 'include')
      .map(citeOf);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'references.txt';
    a.click();
    toast('已导出纳入条目的引用列表');
  };

  const resetDemo = () => {
    if (window.confirm('重置为演示数据？当前本地保存的全部内容会被清除。')) {
      const s = seedState();
      setState(s);
      setSelectedId(null);
      toast('已重置为演示数据');
    }
  };

  const nav = [
    { id: 'all', icon: '▤', label: '全部条目' },
    { id: 'pending', icon: '◔', label: '待初筛' },
    { id: 'disputed', icon: '⚖', label: '争议区' },
    { id: 'fulltext', icon: '✓', label: '可进全文' },
    { id: 'excluded', icon: '×', label: '已排除' },
    { id: 'revised', icon: '📌', label: '已修订' },
    { id: 'batches', icon: '▥', label: '导入批次' },
  ];

  const titles = useMemo(() => ({
    all: '初筛台', pending: '待初筛', disputed: '争议区 · 待导师裁决',
    fulltext: '可进入全文阶段', excluded: '已排除', revised: '修订记录',
    batches: '导入批次',
  }), []);

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> SCREENING</div>
        <div className="library-head">
          <span>文献初筛台</span>
          <strong>{items.length}<small> 个条目</small></strong>
        </div>
        <nav>
          {nav.map((n) => (
            <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}>
              {n.icon} <span>{n.label}</span>
              <b>{count(n.id)}</b>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button onClick={exportBackup}>↓ 导出 JSON 备份</button>
          <button onClick={resetDemo}>↺ 重置演示数据</button>
          <small>本地保存 · 不依赖服务器</small>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span className="crumb">RESEARCH / SCREENING DESK</span>
            <h1>{titles[view]}</h1>
          </div>
          <div className="actions">
            <button className="outline" onClick={exportCites}>↓ 导出纳入引用</button>
            <button className="primary" onClick={() => setShowImport(true)}>＋ 导入批次</button>
          </div>
        </header>

        {view === 'batches' ? (
          <BatchesPage batches={batches} items={items} onImport={() => setShowImport(true)} />
        ) : (
          <DeskPage
            items={items}
            selectedId={effectiveSelected}
            onSelect={setSelectedId}
            query={query}
            setQuery={setQuery}
            chip={view}
            setChip={setView}
            onReview={handleReview}
            onAdjudicate={handleAdjudicate}
            onRevise={handleRevise}
            onNotice={toast}
          />
        )}
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onSubmit={handleImport} />}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
