import { useEffect, useRef } from 'react'

let apiPromise = null

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (previous) previous()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(script)
  })
  return apiPromise
}

export default function YouTubePlayer({ videoId, onReady, onProgress, onEnded }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            const duration = playerRef.current.getDuration()
            onReady?.(duration)
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              pollRef.current = setInterval(() => {
                if (!playerRef.current) return
                const currentTime = playerRef.current.getCurrentTime()
                const duration = playerRef.current.getDuration()
                onProgress?.(currentTime, duration)
              }, 500)
            } else if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }

            if (event.data === YT.PlayerState.ENDED) {
              onEnded?.()
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
      if (playerRef.current?.destroy) playerRef.current.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return <div className="youtube-player" ref={containerRef} />
}
