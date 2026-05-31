import { useEffect, useRef, useState } from 'react'

const ScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="8" y1="12" x2="16" y2="12" strokeWidth="3" />
  </svg>
)

// Lookup product name from barcode using Open Food Facts (food) or UPCitemdb (general)
async function lookupBarcode(code) {
  // Try Open Food Facts first (no API key, food products)
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,brands,categories_tags`, { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    if (d.status === 1 && d.product?.product_name) {
      const brand = d.product.brands?.split(',')[0]?.trim() || ''
      return brand ? `${brand} ${d.product.product_name}` : d.product.product_name
    }
  } catch { /* ignore */ }

  // Try UPCitemdb free trial (100 requests/day, general products)
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, { signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    const item = d.items?.[0]
    if (item?.title) return item.title
  } catch { /* ignore */ }

  return null
}

export default function BarcodeScanner({ onProduct, onCancel }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(null)
  const detectedRef = useRef(false)

  const [status, setStatus] = useState('starting') // starting | scanning | found | error | unsupported
  const [found, setFound] = useState(null) // { code, name }

  const supported = typeof BarcodeDetector !== 'undefined'

  useEffect(() => {
    if (!supported) { setStatus('unsupported'); return }
    startScan()
    return () => {
      cancelAnimationFrame(rafRef.current)
      stopStream()
    }
  }, [])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function startScan() {
    try {
      detectorRef.current = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39', 'data_matrix'] })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')
      scan()
    } catch {
      setStatus('error')
    }
  }

  async function scan() {
    if (detectedRef.current || !videoRef.current || !detectorRef.current) return
    const video = videoRef.current
    if (video.readyState >= 2) {
      try {
        const codes = await detectorRef.current.detect(video)
        if (codes.length > 0 && !detectedRef.current) {
          detectedRef.current = true
          const code = codes[0].rawValue
          setStatus('found')
          setFound({ code, name: null })
          cancelAnimationFrame(rafRef.current)
          stopStream()

          // Look up product name
          const name = await lookupBarcode(code)
          setFound({ code, name })
        }
      } catch { /* detector can throw on empty frames */ }
    }
    rafRef.current = requestAnimationFrame(scan)
  }

  function confirm() {
    if (!found) return
    onProduct(found.name || found.code)
  }

  if (status === 'unsupported') {
    return (
      <div className="notice" style={{ textAlign: 'center' }}>
        <div className="big">Not supported</div>
        <p>Your browser doesn't support the Barcode Detection API. Try Chrome on Android or desktop.</p>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onCancel}>← Back</button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="notice" style={{ textAlign: 'center' }}>
        <div className="big">Camera error</div>
        <p>Couldn't access the camera. Check permissions and try again.</p>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onCancel}>← Back</button>
      </div>
    )
  }

  if (status === 'found' && found) {
    return (
      <div className="hero">
        <div className="notice" style={{ textAlign: 'center' }}>
          <div className="big" style={{ marginBottom: 8 }}>📦 Barcode found!</div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 14, marginBottom: 4 }}>{found.code}</p>
          {found.name ? (
            <p style={{ fontWeight: 700, fontSize: 17, margin: '10px 0' }}>{found.name}</p>
          ) : (
            <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Looking up product…</p>
          )}
        </div>
        <div className="cam-controls" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent" onClick={confirm} disabled={!found.name && !found.code}>
            Find dupes →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hero">
      <div className="cam-wrap" style={{ position: 'relative' }}>
        <video ref={videoRef} playsInline muted autoPlay />
        {/* Scanning overlay frame */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <div style={{
            width: '70%', height: '28%', border: '3px solid var(--acid)',
            borderRadius: 12, boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
          }} />
        </div>
        {status === 'scanning' && (
          <div className="analyzing-label"><span className="pulse-dot" /> Scanning for barcode…</div>
        )}
        {status === 'starting' && (
          <div className="analyzing-label">Starting camera…</div>
        )}
      </div>
      <div className="cam-controls">
        <button className="btn btn-ghost" onClick={onCancel}>← Back</button>
      </div>
    </div>
  )
}
