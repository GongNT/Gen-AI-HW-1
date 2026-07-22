import JSZip from 'jszip'

// Bundles the four required ai_grading/ files into a zip the student can
// unzip at the repo root as `ai_grading/` before pushing.
export async function downloadGradingBundle({
  metadata,
  visualEvaluation,
  finalPrompt,
  finalReport,
}) {
  const zip = new JSZip()
  const folder = zip.folder('ai_grading')

  folder.file(
    'video_metadata.json',
    JSON.stringify(
      {
        videoId: metadata.videoId,
        title: metadata.title,
        durationSeconds: metadata.durationSeconds,
        description: metadata.description,
        transcript: metadata.transcript,
      },
      null,
      2
    )
  )
  folder.file('visual_evaluation.txt', visualEvaluation)
  folder.file('final_prompt.txt', finalPrompt)
  folder.file('final_report.txt', finalReport)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ai_grading.zip'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
