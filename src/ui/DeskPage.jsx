import ItemList from './ItemList.jsx';
import ItemDetail from './ItemDetail.jsx';
import { stageOf, reviewOf, conclusionOf, REVIEWERS } from '../lib/rules.js';

export default function DeskPage({
  items, selectedId, onSelect, query, setQuery, chip, setChip,
  onReview, onAdjudicate, onRevise, onNotice,
}) {
  const filters = [
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待初筛' },
    { id: 'disputed', label: '争议区' },
    { id: 'fulltext', label: '可进全文' },
    { id: 'excluded', label: '已排除' },
    { id: 'revised', label: '已修订' },
    { id: 'mine-a', label: '待审阅者甲' },
    { id: 'mine-b', label: '待审阅者乙' },
  ];

  const matches = (it) => {
    const stage = stageOf(it);
    if (chip !== 'all') {
      if (chip === 'mine-a' || chip === 'mine-b') {
        const p = chip === 'mine-a' ? REVIEWERS[0] : REVIEWERS[1];
        if (reviewOf(it, p)) return false;
      } else if (chip === 'fulltext' || chip === 'excluded') {
        // 已修订条目按最新结论同时计入对应视图
        if (!(stage === chip || (stage === 'revised' && conclusionOf(it) === chip))) {
          return false;
        }
      } else if (stage !== chip) {
        return false;
      }
    }
    if (query) {
      const hay = [it.title, it.authors, it.venue, it.doi, it.abstract, ...it.aliases]
        .join(' ').toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  };

  const visible = items.filter(matches);
  const cur = items.find((x) => x.id === selectedId) || null;

  return (
    <div className="body">
      <div className="list-col">
        <div className="toolbar">
          <div className="search">⌕
            <input
              placeholder="搜索标题、作者、DOI、别名…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && <button onClick={() => setQuery('')}>×</button>}
          </div>
        </div>
        <div className="chip-row">
          {filters.map((f) => (
            <button key={f.id} className={chip === f.id ? 'on' : ''} onClick={() => setChip(f.id)}>
              {f.label}
              {f.id === 'disputed' && (
                <em>{items.filter((x) => stageOf(x) === 'disputed').length || ''}</em>
              )}
            </button>
          ))}
        </div>
        <ItemList items={visible} selectedId={selectedId} onSelect={onSelect} />
      </div>
      <ItemDetail
        key={cur?.id || 'empty'}
        item={cur}
        onReview={onReview}
        onAdjudicate={onAdjudicate}
        onRevise={onRevise}
        onNotice={onNotice}
      />
    </div>
  );
}
