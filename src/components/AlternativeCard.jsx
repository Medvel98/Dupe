import SavingsBadge from './SavingsBadge.jsx'

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
)

function fmt(n) {
  if (!n) return '—'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function AlternativeCard({ alt, index }) {
  return (
    <div className="alt-card" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="top">
        <div>
          <h3>{alt.name}</h3>
          {alt.store && <div className="store">{alt.store}</div>}
        </div>
        <SavingsBadge pct={alt.savingsPct} />
      </div>

      {alt.why && <p className="why">{alt.why}</p>}

      <div className="alt-foot">
        <div className="alt-price"><span className="cur">{alt.currency}</span>{fmt(alt.price)}</div>
        {alt.url ? (
          <a className="alt-link" href={alt.url} target="_blank" rel="noopener noreferrer">
            Shop <ArrowIcon />
          </a>
        ) : (
          <span className="alt-link" style={{ opacity: 0.5 }}>No link</span>
        )}
      </div>
    </div>
  )
}
