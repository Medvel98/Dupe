import { useEffect, useRef, useState } from 'react'

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
)
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function Capture({ onImage }) {
  const [mode, setMode] = useState('idle') // idle | camera
  const [dragging, setDragging] = useState(false)
  const [camError, setCamError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)

  // Attach stream to video element whenever we enter camera mode
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  // Stop stream on unmount
  useEffect(() => () => stopStream(), [])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function startCamera() {
    setCamError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      setMode('camera') // useEffect above will attach stream after render
    } catch {
      setCamError('Camera unavailable — upload a photo instead.')
      setMode('idle')
    }
  }

  function snap() {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 960
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopStream()
    setMode('idle')
    onImage(dataUrl)
  }

  async function handleFiles(files) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    // reset so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
    const dataUrl = await fileToDataUrl(file)
    onImage(dataUrl)
  }

  if (mode === 'camera') {
    return (
      <div className="hero">
        <div className="cam-wrap">
          <video ref={videoRef} playsInline muted autoPlay />
        </div>
        <div className="cam-controls">
          <button className="btn btn-ghost" onClick={() => { stopStream(); setMode('idle') }}>Cancel</button>
          <button className="btn btn-accent" onClick={snap}><CameraIcon /> Capture</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`hero ${dragging ? 'dropzone-active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      <h1>
        Snap it.<br />Find it <em>cheaper</em>.
      </h1>
      <p>Point at any product. We hunt down the real, lower-priced <span className="mark">dupes</span> for you.</p>

      <div className="cta-stack">
        <button className="btn btn-primary" onClick={startCamera}><CameraIcon /> Use camera</button>
        <button className="btn btn-accent" onClick={() => fileRef.current?.click()}><UploadIcon /> Upload a photo</button>
        {/* No capture="environment" — that attribute hijacks the button to open camera on mobile */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="drop-hint">{camError || 'or drop an image here'}</div>
    </div>
  )
}
