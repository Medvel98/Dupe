export default function Scanner({ image, analyzing, onAnalyze, onRetake }) {
  return (
    <div className="hero">
      <div className="scanner">
        <img src={image} alt="captured product" />
        {analyzing && (
          <>
            <div className="scrim" />
            <div className="scanline" />
            <div className="analyzing-label"><span className="pulse-dot" /> Scanning for dupes…</div>
          </>
        )}
      </div>

      {!analyzing && (
        <div className="captured-actions">
          <button className="btn btn-ghost" onClick={onRetake}>Retake</button>
          <button className="btn btn-accent" onClick={onAnalyze}>Find dupes →</button>
        </div>
      )}
    </div>
  )
}
