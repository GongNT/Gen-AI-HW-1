import { useEffect, useRef, useState } from 'react'

// Phase 1: capture 15 evenly spaced frames across the first 30 seconds.
const PHASE1_COUNT = 15
const PHASE1_WINDOW = 30

// Phase 2 (only if the video runs longer than 30s and the viewer keeps
// watching): sample every few seconds and keep only the 5 moments with the
// biggest frame-to-frame change in the viewer's expression.
const PHASE2_INTERVAL = 2
const PHASE2_KEEP = 5
const DIFF_W = 32
const DIFF_H = 24

export default function WebcamCapture({ active, duration, currentTime, onFramesUpdate }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const diffCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)

  const phase1FramesRef = useRef([])
  const phase1NextIndexRef = useRef(0)
  const top5Ref = useRef([])
  const prevLumRef = useRef(null)
  const nextPhase2TimeRef = useRef(PHASE1_WINDOW)

  // Start/stop the webcam stream.
  useEffect(() => {
    if (!active) return undefined

    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err) => setError(err.message))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [active])

  function captureFullFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, 320, 240)
    return canvas.toDataURL('image/jpeg', 0.7)
  }

  function captureLuminance() {
    const video = videoRef.current
    const canvas = diffCanvasRef.current
    if (!video || !canvas || video.readyState < 2) return null
    canvas.width = DIFF_W
    canvas.height = DIFF_H
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, DIFF_W, DIFF_H)
    const { data } = ctx.getImageData(0, 0, DIFF_W, DIFF_H)
    const lum = new Float32Array(DIFF_W * DIFF_H)
    for (let i = 0; i < lum.length; i++) {
      const o = i * 4
      lum[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
    }
    return lum
  }

  function emitFrames() {
    const combined = [
      ...phase1FramesRef.current,
      ...[...top5Ref.current].sort((a, b) => a.timestamp - b.timestamp),
    ]
    onFramesUpdate?.(combined)
  }

  // Drives both capture phases as playback progress comes in from the parent.
  useEffect(() => {
    if (!active || !duration || duration <= 0) return

    const phase1Window = Math.min(PHASE1_WINDOW, duration)

    if (phase1NextIndexRef.current < PHASE1_COUNT) {
      const denom = PHASE1_COUNT > 1 ? PHASE1_COUNT - 1 : 1
      const threshold = (phase1NextIndexRef.current / denom) * phase1Window
      if (currentTime < threshold) return

      const dataUrl = captureFullFrame()
      if (dataUrl) {
        phase1FramesRef.current = [
          ...phase1FramesRef.current,
          { timestamp: Math.round(threshold), dataUrl },
        ]
        phase1NextIndexRef.current += 1
        emitFrames()
      }
      return
    }

    if (duration <= phase1Window) return
    if (currentTime < nextPhase2TimeRef.current) return

    const lum = captureLuminance()
    const dataUrl = captureFullFrame()
    nextPhase2TimeRef.current += PHASE2_INTERVAL
    if (!lum || !dataUrl) return

    let score = 0
    if (prevLumRef.current) {
      for (let i = 0; i < lum.length; i++) {
        score += Math.abs(lum[i] - prevLumRef.current[i])
      }
    }
    prevLumRef.current = lum

    const candidate = { timestamp: Math.round(currentTime), dataUrl, score }
    const top5 = top5Ref.current
    if (top5.length < PHASE2_KEEP) {
      top5.push(candidate)
      emitFrames()
    } else {
      let minIdx = 0
      for (let i = 1; i < top5.length; i++) {
        if (top5[i].score < top5[minIdx].score) minIdx = i
      }
      if (candidate.score > top5[minIdx].score) {
        top5[minIdx] = candidate
        emitFrames()
      }
    }
  }, [active, currentTime, duration])

  return (
    <div className="webcam-capture">
      <video ref={videoRef} autoPlay muted playsInline className="webcam-preview" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={diffCanvasRef} style={{ display: 'none' }} />
      {error && <p className="error-text">Webcam error: {error}</p>}
    </div>
  )
}
