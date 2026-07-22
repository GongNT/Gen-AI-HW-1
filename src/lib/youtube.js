// Client-side YouTube metadata + transcript extraction.
// Uses the /yt-page and /yt-captions dev-server proxies (see vite.config.js)
// to work around YouTube not sending CORS headers.

export function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  throw new Error('Could not extract a video ID from that URL.')
}

function decodeHtmlEntities(text) {
  const el = document.createElement('textarea')
  el.innerHTML = text
  return el.value
}

async function fetchTranscript(baseUrl) {
  try {
    const url = new URL(baseUrl)
    const proxied = `/yt-captions${url.search}`
    const res = await fetch(proxied)
    if (!res.ok) return ''
    const xml = await res.text()
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    const nodes = Array.from(doc.getElementsByTagName('text'))
    return nodes
      .map((n) => decodeHtmlEntities(n.textContent || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch (err) {
    console.warn('Transcript fetch failed:', err)
    return ''
  }
}

export async function fetchVideoMetadata(videoId) {
  const res = await fetch(`/yt-page?v=${videoId}`)
  if (!res.ok) {
    throw new Error(`Failed to load YouTube page (status ${res.status}).`)
  }
  const html = await res.text()

  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var |<\/script>)/s)
  if (!match) {
    throw new Error('Could not parse YouTube page data. The page format may have changed.')
  }

  let data
  try {
    data = JSON.parse(match[1])
  } catch (err) {
    throw new Error('Failed to parse YouTube metadata JSON.')
  }

  const details = data.videoDetails || {}
  const title = details.title || 'Unknown title'
  const durationSeconds = parseInt(details.lengthSeconds || '0', 10)
  const description = details.shortDescription || ''

  const captionTracks =
    data.captions?.playerCaptionsTracklistRenderer?.captionTracks || []
  let transcript = ''
  if (captionTracks.length > 0) {
    const track =
      captionTracks.find((t) => t.languageCode?.startsWith('en')) || captionTracks[0]
    transcript = await fetchTranscript(track.baseUrl)
  }

  return {
    videoId,
    title,
    durationSeconds,
    description,
    transcript: transcript || '(No transcript/captions available for this video.)',
  }
}
