import { StageBadge, ReviewDots } from './helpers.jsx';

export default function ItemList({ items, selectedId, onSelect }) {
  return (
    <section className="paper-list">
      {!items.length && <div className="no-result">当前筛选下没有条目</div>}
      {items.map((it) => (
        <button
          key={it.id}
          className={'paper' + (it.id === selectedId ? ' selected' : '')}
          onClick={() => onSelect(it.id)}
        >
          <div className="paper-year">{it.year || '—'}</div>
          <div className="paper-copy">
            <h3>{it.title}</h3>
            <p>{it.authors || '作者不详'}</p>
            <div className="paper-meta">
              <ReviewDots item={it} />
              {it.aliases.length > 0 && <span className="alias-count">别名 {it.aliases.length}</span>}
              <span className="src-count">来源 {it.sources.length}</span>
            </div>
          </div>
          <StageBadge item={it} />
        </button>
      ))}
    </section>
  );
}
