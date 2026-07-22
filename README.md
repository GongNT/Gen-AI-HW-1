# Insight Observer

A React + Vite app that watches you watch a YouTube video. It captures your
webcam reactions while the video plays, interviews you about what you liked
and disliked afterward, and writes a final sentiment report.

## How it works

1. **Paste a YouTube URL.** The app extracts the video's title, duration,
   description, and transcript directly from YouTube (via a dev-server proxy
   configured in `vite.config.js`, so no YouTube API key is needed).
2. **Watch the video.** Your webcam captures up to 20 frames spaced evenly
   across the video's runtime.
3. **Visual evaluation.** When the video ends, the captured frames are sent
   to OpenAI, which writes a timestamped evaluation of your visible
   reactions.
4. **Interview.** Click **Start Interview** to chat with an AI interviewer
   whose system prompt includes the video metadata and your visual
   evaluation. It asks what you liked/disliked and references specific
   moments from the evaluation.
5. **Final report.** Click **End Chat** to have the AI synthesize the chat
   transcript, metadata, and visual evaluation into a final written
   sentiment report.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set VITE_OPENAI_API_KEY=sk-...
npm run dev
```

The app runs at `http://localhost:5173`.

**Note:** `VITE_OPENAI_API_KEY` is never committed — `.env` is gitignored.
The key is used directly from the browser via `fetch`, matching this
project's client-only architecture; do not commit or share it.

The model used for all AI calls is set in [`src/lib/openai.js`](src/lib/openai.js):

```js
const MODEL = 'gpt-5.6'
```

## Test video

This app was tested with the official trailer for *The Odyssey*:
https://www.youtube.com/watch?v=Mzw2ttJD2qQ

## Producing the `ai_grading/` submission files

After completing a full run (load video → watch → visual evaluation →
interview → end chat → final report), click **Download Grading Files** on
the report screen. This downloads `ai_grading.zip` containing:

- `video_metadata.json` — title, duration, description, transcript
- `visual_evaluation.txt` — the AI's evaluation of your webcam reactions
- `final_prompt.txt` — the exact prompt sent for the final synthesis
- `final_report.txt` — the final sentiment report text

Unzip it at the repository root (so `ai_grading/` sits next to `src/`)
before pushing.

## Project structure

```
src/
  App.jsx                  main app / stage orchestration
  components/
    YouTubePlayer.jsx       embeds the YouTube IFrame Player API
    WebcamCapture.jsx       captures webcam frames synced to playback
    InterviewChat.jsx       post-video interview chat UI
  lib/
    youtube.js              metadata + transcript extraction
    openai.js                OpenAI API calls (vision, chat, synthesis)
    exportGrading.js         builds the ai_grading.zip download
```

## Known limitations

- The YouTube metadata/transcript proxy is configured for the Vite **dev
  server** (`npm run dev`); it is not set up for a production build/deploy.
- Some videos have no captions, in which case the transcript field will say
  so and the app continues without it.
