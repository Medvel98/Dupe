function fmt(n, currency) {
  if (!n) return '—'
  return `${currency || ''} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function shopUrl(alt) {
  const q = encodeURIComponent(`buy ${alt.name}${alt.store ? ' ' + alt.store : ''}`)
  return `https://www.google.com/search?q=${q}`
}

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
)

export default function ComparisonTable({ product, alternatives }) {
  const rows = [
    {
      name: product.name,
      price: fmt(product.estPrice, product.currency),
      rawPrice: product.estPrice,
      savingsPct: 0,
      why: product.note || 'Original product',
      store: '',
      isOriginal: true,
    },
    ...alternatives.map(a => ({
      name: a.name,
      price: fmt(a.price, a.currency),
      rawPrice: a.price,
      savingsPct: a.savingsPct,
      why: a.why,
      store: a.store,
      isOriginal: false,
      shopHref: shopUrl(a),
    })),
  ]

  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--r)', border: '2px solid var(--ink)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--f-body)', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <th style={th()}>Product</th>
            <th style={th('right')}>Price</th>
            <th style={th('center')}>Save</th>
            <th style={th()}>Why</th>
            <th style={th('center')}>Shop</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                background: row.isOriginal ? 'rgba(255,107,74,0.08)' : i % 2 === 0 ? 'var(--card)' : 'var(--paper)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <td style={td()}>
                <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{row.name}</div>
                {row.store && <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>{row.store}</div>}
              </td>
              <td style={td('right')}>
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: 16, color: row.isOriginal ? 'var(--coral-deep)' : 'var(--ink)' }}>
                  {row.price}
                </span>
              </td>
              <td style={td('center')}>
                {row.isOriginal ? (
                  <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>original</span>
                ) : (
                  <span style={{
                    background: 'var(--acid)', border: '1.5px solid var(--ink)',
                    borderRadius: 100, padding: '3px 8px',
                    fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}>
                    -{row.savingsPct}%
                  </span>
                )}
              </td>
              <td style={{ ...td(), color: 'var(--ink-soft)', maxWidth: 160 }}>{row.why}</td>
              <td style={td('center')}>
                {row.isOriginal ? null : (
                  <a
                    href={row.shopHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontWeight: 700, fontSize: 12, textDecoration: 'none', color: 'var(--ink)',
                      border: '1.5px solid var(--ink)', borderRadius: 100, padding: '5px 10px',
                    }}
                  >
                    Buy <ArrowIcon />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function th(align = 'left') {
  return { padding: '10px 14px', textAlign: align, fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }
}
function td(align = 'left') {
  return { padding: '12px 14px', textAlign: align, verticalAlign: 'top' }
}
