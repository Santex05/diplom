import { execFile } from 'child_process'
import fs from 'fs/promises'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

function readMvhdFromBuffer(buf, markerIndex) {
  const idx = markerIndex
  if (idx < 0 || idx + 32 > buf.length) return null
  const version = buf[idx + 4]
  if (version === 0) {
    const timescale = buf.readUInt32BE(idx + 16)
    const duration = buf.readUInt32BE(idx + 20)
    if (!timescale || !duration) return null
    return Math.round(duration / timescale)
  }
  if (version === 1) {
    const duration = Number(buf.readBigUInt64BE(idx + 24))
    const timescale = buf.readUInt32BE(idx + 32)
    if (!timescale || !duration) return null
    return Math.round(duration / timescale)
  }
  return null
}

/** Чтение длительности из MP4 (атом mvhd) без ffprobe */
async function probeMp4Duration(filePath) {
  try {
    const fh = await fs.open(filePath, 'r')
    const { size } = await fh.stat()
    const chunk = Math.min(size, 3 * 1024 * 1024)
    const head = Buffer.alloc(chunk)
    await fh.read(head, 0, chunk, 0)
    let sec = null
    let pos = 0
    while (pos < head.length - 8) {
      const i = head.indexOf('mvhd', pos)
      if (i < 0) break
      sec = readMvhdFromBuffer(head, i)
      if (sec && sec > 0) break
      pos = i + 4
    }
    if (!sec && size > chunk) {
      const tail = Buffer.alloc(chunk)
      await fh.read(tail, 0, chunk, size - chunk)
      pos = 0
      while (pos < tail.length - 8) {
        const i = tail.indexOf('mvhd', pos)
        if (i < 0) break
        sec = readMvhdFromBuffer(tail, i)
        if (sec && sec > 0) break
        pos = i + 4
      }
    }
    await fh.close()
    return sec && sec > 0 ? sec : null
  } catch {
    return null
  }
}

async function probeFfprobeDuration(filePath) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { timeout: 60000, windowsHide: true },
    )
    const sec = parseFloat(String(stdout).trim())
    return Number.isFinite(sec) && sec > 0 ? Math.round(sec) : null
  } catch {
    return null
  }
}

/** Длительность видео в секундах */
export async function probeVideoDuration(filePath) {
  const ext = filePath.toLowerCase()
  if (ext.endsWith('.mp4') || ext.endsWith('.m4v') || ext.endsWith('.mov')) {
    const mp4 = await probeMp4Duration(filePath)
    if (mp4) return mp4
  }
  return probeFfprobeDuration(filePath)
}
