export default function SavingsBadge({ pct }) {
  return (
    <div className="save-badge">
      <span className="pct">{pct > 0 ? `-${pct}%` : '—'}</span>
      <span className="lbl">save</span>
    </div>
  )
}
