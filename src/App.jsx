import { useState } from 'react'
import Capture from './components/Capture.jsx'
import Scanner from './components/Scanner.jsx'
import ProductCard from './components/ProductCard.jsx'
import AlternativeCard from './components/AlternativeCard.jsx'
import { analyzeImage } from './lib/api.js'

export default function App() {
  // idle -> captured -> analyzing -> results | error
  const [stage, setStage] = useState('idle')
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function reset() {
    setStage('idle')
    setImage(null)
    setResult(null)
    setError('')
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

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand" onClick={reset} style={{ cursor: 'pointer' }}>
          <b>DUPE</b><span className="dot">.</span>
        </div>
        <span className="tag">snap · scan · save</span>
      </header>

      {stage === 'idle' && <Capture onImage={handleImage} />}

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
              <div className="section-kicker">Cheaper dupes · best savings first</div>
              {result.alternatives.map((alt, i) => (
                <AlternativeCard key={i} alt={alt} index={i} />
              ))}
            </>
          ) : (
            <div className="notice">
              <div className="big">No dupes found</div>
              <p>We couldn’t confidently identify a cheaper match. Try a clearer, closer photo of the product.</p>
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
            <div className="big">Hmm, that didn’t work</div>
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
