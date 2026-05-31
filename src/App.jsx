import { useState } from 'react'
import Capture from './components/Capture.jsx'
import Scanner from './components/Scanner.jsx'
import BarcodeScanner from './components/BarcodeScanner.jsx'
import ProductCard from './components/ProductCard.jsx'
import AlternativeCard from './components/AlternativeCard.jsx'
import ComparisonTable from './components/ComparisonTable.jsx'
import { analyzeImage, analyzeProductName } from './lib/api.js'

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const BarcodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
    <line x1="7" y1="8" x2="7" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/>
    <line x1="13" y1="8" x2="13" y2="16"/><line x1="17" y1="8" x2="17" y2="16"/>
  </svg>
)

export default function App() {
  // idle | barcode | captured | analyzing | results | error
  const [stage, setStage] = useState('idle')
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('cards') // cards | table

  function reset() {
    setStage('idle')
    setImage(null)
    setResult(null)
    setError('')
    setViewMode('cards')
  }

  function handleImage(dataUrl) {
    setImage(dataUrl)
    setStage('captured')
  }

  async function analyze() {
    setStage('analyzing')
    setError('')
    try {
      const data = await analyzeImage(image)
      setResult(data)
      setStage('results')
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setStage('error')
    }
  }

  async function analyzeBarcode(productName) {
    setStage('analyzing')
    setError('')
    try {
      const data = await analyzeProductName(productName)
      setResult(data)
      setStage('results')
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setStage('error')
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand" onClick={reset} style={{ cursor: 'pointer' }}>
          <b>DUPE</b><span className="dot">.</span>
        </div>
        <span className="tag">snap · scan · save</span>
      </header>

      {stage === 'idle' && (
        <>
          <Capture onImage={handleImage} />
          <button
            className="btn btn-ghost"
            style={{ marginTop: 10, width: '100%', gap: 8 }}
            onClick={() => setStage('barcode')}
          >
            <BarcodeIcon /> Scan a barcode
          </button>
        </>
      )}

      {stage === 'barcode' && (
        <BarcodeScanner
          onProduct={analyzeBarcode}
          onCancel={reset}
        />
      )}

      {(stage === 'captured' || stage === 'analyzing') && (
        <Scanner
          image={image}
          analyzing={stage === 'analyzing'}
          onAnalyze={analyze}
          onRetake={reset}
        />
      )}

      {stage === 'results' && result && (
        <div className="results">
          <div className="section-kicker">The original</div>
          <ProductCard product={result.product} />

          {result.alternatives?.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div className="section-kicker" style={{ margin: 0, flex: 1 }}>Cheaper dupes · best savings first</div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                  <button
                    className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '7px 10px', fontSize: 12, gap: 5 }}
                    onClick={() => setViewMode('cards')}
                    title="Card view"
                  >
                    <GridIcon />
                  </button>
                  <button
                    className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '7px 10px', fontSize: 12, gap: 5 }}
                    onClick={() => setViewMode('table')}
                    title="Compare table"
                  >
                    <ListIcon />
                  </button>
                </div>
              </div>

              {viewMode === 'cards' ? (
                result.alternatives.map((alt, i) => (
                  <AlternativeCard key={i} alt={alt} index={i} />
                ))
              ) : (
                <ComparisonTable product={result.product} alternatives={result.alternatives} />
              )}
            </>
          ) : (
            <div className="notice">
              <div className="big">No dupes found</div>
              <p>We couldn't confidently identify a cheaper match. Try a clearer, closer photo of the product.</p>
            </div>
          )}

          {result.sources?.length > 0 && (
            <div className="sources">
              <div className="section-kicker">Sources</div>
              <div className="src-list">
                {result.sources.slice(0, 8).map((s, i) => (
                  <a key={i} className="src-chip" href={s.uri} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="again-bar">
            <button className="btn btn-primary" onClick={reset}>Scan another →</button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="results">
          <div className="notice">
            <div className="big">Hmm, that didn't work</div>
            <p>{error}</p>
            <button className="btn btn-accent" onClick={() => (image ? analyze() : reset())}>Try again</button>
          </div>
          <div className="again-bar">
            <button className="btn btn-ghost" onClick={reset}>Start over</button>
          </div>
        </div>
      )}

      <div className="fineprint">AI estimates · verify prices before buying</div>
    </div>
  )
}
