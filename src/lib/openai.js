// Thin client-side wrapper around the OpenAI Chat Completions API.
// Requires VITE_OPENAI_API_KEY in a local .env file (see .env.example).

export const MODEL = 'gpt-5.6-luna'

const API_URL = 'https://api.openai.com/v1/chat/completions'

function getApiKey() {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!key) {
    throw new Error(
      'Missing VITE_OPENAI_API_KEY. Add it to a local .env file (see .env.example).'
    )
  }
  return key
}

async function chatCompletion(messages) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

// Sends the captured webcam frames (data URLs) + timestamps to the vision
// model and asks for a structured evaluation of the viewer's reactions.
export async function evaluateVisualReactions(metadata, frames) {
  const content = [
    {
      type: 'text',
      text: `You are analyzing webcam snapshots of a person watching a YouTube video titled "${metadata.title}" (duration ${metadata.durationSeconds}s). The frames below are sampled in two phases: first, up to 15 frames spaced evenly across the first 30 seconds of viewing; then (if the video is longer and they kept watching), up to 5 additional frames from later in the video, each chosen because it showed the biggest moment-to-moment change in the viewer's expression. Each frame is labeled with its approximate timestamp. Describe the viewer's visible facial expressions and reactions over time, calling out specific moments (with timestamps) where their expression noticeably changed (e.g., smiling, laughing, frowning, surprised, bored, neutral) — the later frames in particular mark the viewer's strongest reaction shifts. Write a clear, structured evaluation organized by timestamp.`,
    },
  ]

  frames.forEach((frame) => {
    content.push({
      type: 'text',
      text: `Frame at ~${frame.timestamp}s:`,
    })
    content.push({
      type: 'image_url',
      image_url: { url: frame.dataUrl },
    })
  })

  return chatCompletion([{ role: 'user', content }])
}

export function buildInterviewSystemPrompt(metadata, visualEvaluation) {
  return `You are an interviewer AI conducting a short post-viewing interview.

The viewer just watched this YouTube video:
- Title: ${metadata.title}
- Duration: ${metadata.durationSeconds} seconds
- Description: ${metadata.description}
- Transcript: ${metadata.transcript}

Here is an evaluation of the viewer's facial expressions/reactions captured via webcam while they watched, organized by timestamp:
${visualEvaluation}

Your job: ask the viewer what they liked and disliked about the video. Reference specific facial expression moments from the evaluation above (e.g., "I noticed you smiled at around 0:45 — what caused that?"). Ask one question at a time, keep a natural conversational tone, and follow up based on their answers. Keep responses concise.`
}

export async function sendInterviewMessage(systemPrompt, chatHistory) {
  const messages = [{ role: 'system', content: systemPrompt }, ...chatHistory]
  return chatCompletion(messages)
}

export function buildFinalSynthesisPrompt(metadata, visualEvaluation, chatHistory) {
  const transcriptText = chatHistory
    .map((m) => `${m.role === 'user' ? 'Viewer' : 'Interviewer'}: ${m.content}`)
    .join('\n')

  return `You are writing a final sentiment report about how a viewer felt about a YouTube video, based on three sources of evidence:

1. Video metadata:
- Title: ${metadata.title}
- Duration: ${metadata.durationSeconds} seconds
- Description: ${metadata.description}

2. Visual evaluation of the viewer's facial reactions while watching (captured via webcam):
${visualEvaluation}

3. Full interview transcript between the interviewer AI and the viewer after watching:
${transcriptText}

Write a final written sentiment report summarizing how the viewer felt about the video overall. Structure it with clear sections: Overall Sentiment, Key Likes, Key Dislikes, Notable Reaction Moments (tying webcam observations to specific timestamps), and a brief Summary. Be specific and reference evidence from both the visual evaluation and the interview.`
}

export async function synthesizeFinalReport(finalPrompt) {
  return chatCompletion([{ role: 'user', content: finalPrompt }])
}
