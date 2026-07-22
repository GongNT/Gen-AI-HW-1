import { useEffect, useRef, useState } from 'react'

const MAX_FRAMES = 20

export default function WebcamCapture({ active, duration, currentTime, onFramesUpdate }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const framesRef = useRef([])
  const nextIndexRef = useRef(0)
  const [error, setError] = useState(null)

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

  // Reset captured frames whenever a new session starts.
  useEffect(() => {
    if (active) {
      framesRef.current = []
      nextIndexRef.current = 0
      onFramesUpdate?.([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Capture a frame each time currentTime crosses the next even threshold.
  useEffect(() => {
    if (!active || !duration || duration <= 0) return
    if (nextIndexRef.current >= MAX_FRAMES) return

    const threshold = (nextIndexRef.current / (MAX_FRAMES - 1)) * duration
    if (currentTime < threshold) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, 320, 240)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

    const frame = { timestamp: Math.round(threshold), dataUrl }
    framesRef.current = [...framesRef.current, frame]
    nextIndexRef.current += 1
    onFramesUpdate?.(framesRef.current)
  }, [active, currentTime, duration, onFramesUpdate])

  return (
    <div className="webcam-capture">
      <video ref={videoRef} autoPlay muted playsInline className="webcam-preview" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {error && <p className="error-text">Webcam error: {error}</p>}
    </div>
  )
}
