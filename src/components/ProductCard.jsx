function fmt(n) {
  if (!n) return '—'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function ProductCard({ product }) {
  return (
    <div className="product-card">
      <span className="corner-tag">Your pick</span>
      <span className="lbl">Identified product</span>
      <h2>{product.name}</h2>
      {product.category && <div className="cat">{product.category}</div>}
      {product.estPrice > 0 && (
        <div className="price-row">
          <span className="price"><span className="strike">{product.currency} {fmt(product.estPrice)}</span></span>
        </div>
      )}
      {product.note && <div className="note">{product.note}</div>}
    </div>
  )
}
