// 附件图片压缩管线：入口体检 → createImageBitmap 解码 → 等比降采样（长边 1024）
// → JPEG 质量循环（产物 ≤1MB）→ data URL。GIF 经 createImageBitmap 自然取首帧。
// 所有浏览器 API 集中在 compressImageFile；入口体检、尺寸计算与文件名生成为
// 纯函数（node 环境单测覆盖）。产物 data URL 同时用于气泡渲染与请求分段（同源零转换）。

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

/** 压缩目标：等比缩至长边（模型内部约 800×800 处理，1024 留 OCR 余量） */
const TARGET_MAX_EDGE = 1024
/** 压缩产物上限（超限按质量步进重试，仍超限拒绝） */
const MAX_OUTPUT_BYTES = 1024 * 1024
/** JPEG 质量步进（逐档降低直至产物达标） */
const JPEG_QUALITY_STEPS = [0.85, 0.7, 0.6] as const

export type ImageRejectReason = 'unsupported_type' | 'too_large' | 'undecodable' | 'compress_failed'

export interface ImageCompressSuccess {
  ok: true
  dataUrl: string
  /** 展示名（剪贴板图片无文件名时自动生成） */
  name: string
  /** 展示格式标签 */
  format: 'jpeg'
  /** 压缩产物字节数 */
  bytes: number
}

export interface ImageCompressFailure {
  ok: false
  reason: ImageRejectReason
}

/** 入口体检：格式白名单与大小上限（不满足返回拒绝原因，满足返回 null） */
export function checkImageEntry(input: { size: number; type: string }): ImageRejectReason | null {
  if (!SUPPORTED_IMAGE_TYPES.includes(input.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return 'unsupported_type'
  }
  if (input.size > MAX_IMAGE_BYTES) return 'too_large'
  return null
}

/** 等比目标尺寸：长边压到 maxEdge，小图不放大（最小 1px 防退化） */
export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number = TARGET_MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** 剪贴板图片的展示名（Coze 同型：image_<时间戳>） */
export function generateImageName(now: number = Date.now()): string {
  return `image_${now}`
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(new Error('dataUrl read failed')))
    reader.readAsDataURL(blob)
  })
}

/**
 * 压缩单张图片文件：任一层失败返回机器可读拒绝原因（文案归 UI 层），
 * 不抛出异常。一次性解码后立即 close 位图，避免大图内存驻留。
 */
export async function compressImageFile(
  file: File,
): Promise<ImageCompressSuccess | ImageCompressFailure> {
  const entryIssue = checkImageEntry({ size: file.size, type: file.type })
  if (entryIssue) return { ok: false, reason: entryIssue }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { ok: false, reason: 'undecodable' }
  }

  try {
    const target = computeTargetSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, reason: 'compress_failed' }
    // JPEG 无透明通道：白底填充，避免透明 PNG 缩放后发黑
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, target.width, target.height)
    ctx.drawImage(bitmap, 0, 0, target.width, target.height)

    let chosen: Blob | null = null
    for (const quality of JPEG_QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality)
      if (!blob) continue
      chosen = blob
      if (blob.size <= MAX_OUTPUT_BYTES) break
    }
    if (!chosen || chosen.size > MAX_OUTPUT_BYTES) return { ok: false, reason: 'compress_failed' }

    const dataUrl = await blobToDataUrl(chosen)
    return { ok: true, dataUrl, name: generateImageName(), format: 'jpeg', bytes: chosen.size }
  } catch {
    return { ok: false, reason: 'compress_failed' }
  } finally {
    bitmap.close()
  }
}
