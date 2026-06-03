import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const VIDEO_EXT = new Set(['.mp4', '.webm', '.mkv', '.mov', '.m4v', '.avi', '.ogv'])

let ffmpegOk = null

export function isTranscodeEnabled() {
  const v = String(process.env.VIDEO_TRANSCODE ?? '').trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'no') return false
  return process.env.NODE_ENV === 'production'
}

async function hasFfmpeg() {
  if (ffmpegOk !== null) return ffmpegOk
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 5000, windowsHide: true })
    ffmpegOk = true
  } catch {
    ffmpegOk = false
  }
  return ffmpegOk
}

function isVideoFile(filePath) {
  return VIDEO_EXT.has(path.extname(filePath).toLowerCase())
}

/**
 * Сжимает загруженное видео в H.264 MP4 (web-friendly).
 * Возвращает абсолютный путь к итоговому файлу (может совпадать с входом).
 */
export async function processEpisodeVideoFile(inputPath) {
  if (!isTranscodeEnabled() || !isVideoFile(inputPath)) {
    return inputPath
  }
  if (!(await hasFfmpeg())) {
    console.warn('[video] ffmpeg не найден — файл сохранён без перекодирования')
    return inputPath
  }

  const dir = path.dirname(inputPath)
  const base = path.basename(inputPath, path.extname(inputPath))
  const outPath = path.join(dir, `${base}.mp4`)
  const tmpPath = path.join(dir, `${base}.transcoding.tmp.mp4`)

  const crf = process.env.FFMPEG_CRF || '28'
  const preset = process.env.FFMPEG_PRESET || 'medium'

  try {
    await fs.unlink(tmpPath).catch(() => {})
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i',
        inputPath,
        '-c:v',
        'libx264',
        '-preset',
        preset,
        '-crf',
        crf,
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        '-pix_fmt',
        'yuv420p',
        tmpPath,
      ],
      { timeout: 60 * 60 * 1000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    )

    const [inStat, outStat] = await Promise.all([fs.stat(inputPath), fs.stat(tmpPath)])
    if (!outStat.size) {
      await fs.unlink(tmpPath).catch(() => {})
      return inputPath
    }

    if (path.resolve(inputPath) !== path.resolve(outPath)) {
      await fs.unlink(outPath).catch(() => {})
    }
    await fs.rename(tmpPath, outPath)

    if (path.resolve(inputPath) !== path.resolve(outPath)) {
      await fs.unlink(inputPath).catch(() => {})
    }

    const saved =
      inStat.size > outStat.size
        ? `${Math.round((1 - outStat.size / inStat.size) * 100)}%`
        : '≈0%'
    console.log(
      `[video] ${path.basename(outPath)}: ${(inStat.size / 1e6).toFixed(1)}MB → ${(outStat.size / 1e6).toFixed(1)}MB (${saved})`,
    )
    return outPath
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {})
    console.error('[video] перекодирование не удалось:', err.message || err)
    return inputPath
  }
}

/** episodes/foo.mkv → episodes/foo.mp4 после обработки */
export async function finalizeEpisodeRelativePath(animeDir, relativeFile) {
  const rel = relativeFile.replace(/^episodes[/\\]/, '')
  const abs = path.join(animeDir, 'episodes', rel)
  const outAbs = await processEpisodeVideoFile(abs)
  return `episodes/${path.basename(outAbs)}`
}
