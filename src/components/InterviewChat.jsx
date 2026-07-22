import { useEffect, useRef, useState } from 'react'
import { sendInterviewMessage } from '../lib/openai'

export default function InterviewChat({ systemPrompt, onEndChat }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const startedRef = useRef(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    askInterviewer([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function askInterviewer(history) {
    setLoading(true)
    setError(null)
    try {
      const reply = await sendInterviewMessage(systemPrompt, history)
      setMessages([...history, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    if (!input.trim() || loading) return
    const history = [...messages, { role: 'user', content: input.trim() }]
    setMessages(history)
    setInput('')
    askInterviewer(history)
  }

  return (
    <div className="interview-chat">
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            <strong>{m.role === 'assistant' ? 'Interviewer' : 'You'}:</strong> {m.content}
          </div>
        ))}
        {loading && <div className="chat-bubble assistant">Interviewer is typing…</div>}
        <div ref={bottomRef} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          placeholder="Type your answer…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
        <button className="end-chat-btn" onClick={() => onEndChat(messages)} disabled={loading}>
          End Chat
        </button>
      </div>
    </div>
  )
}
