import { useRef, useState } from 'react'
import YouTubePlayer from './components/YouTubePlayer'
import WebcamCapture from './components/WebcamCapture'
import InterviewChat from './components/InterviewChat'
import { extractVideoId, fetchVideoMetadata } from './lib/youtube'
import {
  evaluateVisualReactions,
  buildInterviewSystemPrompt,
  buildFinalSynthesisPrompt,
  synthesizeFinalReport,
} from './lib/openai'
import { downloadGradingBundle } from './lib/exportGrading'
import './App.css'

const STAGES = {
  INPUT: 'input',
  WATCHING: 'watching',
  EVALUATING: 'evaluating',
  EVALUATED: 'evaluated',
  INTERVIEW: 'interview',
  SYNTHESIZING: 'synthesizing',
  REPORT: 'report',
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const [stage, setStage] = useState(STAGES.INPUT)
  const [url, setUrl] = useState('')
  const [metadata, setMetadata] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [frames, setFrames] = useState([])
  const framesRef = useRef([])
  const metadataRef = useRef(null)

  const [visualEvaluation, setVisualEvaluation] = useState('')
  const [finalPrompt, setFinalPrompt] = useState('')
  const [finalReport, setFinalReport] = useState('')

  function handleFramesUpdate(newFrames) {
    framesRef.current = newFrames
    setFrames(newFrames)
  }

  async function handleSubmitUrl(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const videoId = extractVideoId(url)
      const meta = await fetchVideoMetadata(videoId)
      metadataRef.current = meta
      setMetadata(meta)
      setDuration(0)
      setCurrentTime(0)
      framesRef.current = []
      setFrames([])
      setVisualEvaluation('')
      setFinalPrompt('')
      setFinalReport('')
      setStage(STAGES.WATCHING)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleNewSearch() {
    setStage(STAGES.INPUT)
    setUrl('')
    setMetadata(null)
    metadataRef.current = null
    setError(null)
    setDuration(0)
    setCurrentTime(0)
    framesRef.current = []
    setFrames([])
    setVisualEvaluation('')
    setFinalPrompt('')
    setFinalReport('')
  }

  async function handleVideoEnded() {
    setStage(STAGES.EVALUATING)
    try {
      const evaluation = await evaluateVisualReactions(metadataRef.current, framesRef.current)
      setVisualEvaluation(evaluation)
      setStage(STAGES.EVALUATED)
    } catch (err) {
      setError(err.message)
      setStage(STAGES.EVALUATED)
    }
  }

  async function handleEndChat(chatHistory) {
    setStage(STAGES.SYNTHESIZING)
    try {
      const prompt = buildFinalSynthesisPrompt(metadata, visualEvaluation, chatHistory)
      setFinalPrompt(prompt)
      const report = await synthesizeFinalReport(prompt)
      setFinalReport(report)
      setStage(STAGES.REPORT)
    } catch (err) {
      setError(err.message)
      setStage(STAGES.REPORT)
    }
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Insight Observer</h1>
        {stage !== STAGES.INPUT && (
          <button className="new-search-btn" onClick={handleNewSearch}>
            New Search
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {stage === STAGES.INPUT && (
        <form className="url-form" onSubmit={handleSubmitUrl}>
          <input
            type="text"
            placeholder="Paste a YouTube URL…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Load Video'}
          </button>
        </form>
      )}

      {metadata && stage !== STAGES.INPUT && (
        <div className="metadata-card">
          <h2>{metadata.title}</h2>
          <p>
            <strong>Duration:</strong> {formatDuration(metadata.durationSeconds)}
          </p>
          <p>
            <strong>Description:</strong> {metadata.description.slice(0, 300)}
            {metadata.description.length > 300 ? '…' : ''}
          </p>
        </div>
      )}

      {stage === STAGES.WATCHING && (
        <div className="watch-stage">
          <div className="video-wrapper">
            <YouTubePlayer
              videoId={metadata.videoId}
              onReady={(d) => setDuration(d)}
              onProgress={(t, d) => {
                setCurrentTime(t)
                setDuration(d)
              }}
              onEnded={handleVideoEnded}
            />
          </div>
          <div className="webcam-wrapper">
            <p>Live Visual Evaluation Capture ({frames.length}/20 frames)</p>
            <WebcamCapture
              active={true}
              duration={duration}
              currentTime={currentTime}
              onFramesUpdate={handleFramesUpdate}
            />
          </div>
        </div>
      )}

      {stage === STAGES.EVALUATING && <p>Analyzing your reactions…</p>}

      {(stage === STAGES.EVALUATED ||
        stage === STAGES.INTERVIEW ||
        stage === STAGES.SYNTHESIZING ||
        stage === STAGES.REPORT) &&
        visualEvaluation && (
          <div className="evaluation-card">
            <h3>Visual Evaluation</h3>
            <pre>{visualEvaluation}</pre>
          </div>
        )}

      {stage === STAGES.EVALUATED && (
        <button onClick={() => setStage(STAGES.INTERVIEW)}>Start Interview</button>
      )}

      {stage === STAGES.INTERVIEW && (
        <InterviewChat
          systemPrompt={buildInterviewSystemPrompt(metadata, visualEvaluation)}
          onEndChat={handleEndChat}
        />
      )}

      {stage === STAGES.SYNTHESIZING && <p>Writing your final report…</p>}

      {stage === STAGES.REPORT && (
        <div className="report-card">
          <h3>Final Sentiment Report</h3>
          <pre>{finalReport}</pre>
          <button
            onClick={() =>
              downloadGradingBundle({ metadata, visualEvaluation, finalPrompt, finalReport })
            }
          >
            Download Grading Files (ai_grading.zip)
          </button>
        </div>
      )}
    </div>
  )
}
