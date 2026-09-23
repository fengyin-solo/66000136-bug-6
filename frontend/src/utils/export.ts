/** 导出倍率允许的取值范围 */
export const MIN_SCALE = 1
export const MAX_SCALE = 8
/** 保守的单边长上限：覆盖 Safari（8192）并给主流桌面浏览器留余量 */
export const MAX_EDGE_PX = 8192
/** 保守的总像素面积上限，低于各浏览器的 canvas 极限 */
export const MAX_PIXELS = 67_000_000

export type ExportFormat = 'svg' | 'png'

export interface ExportSize {
  scale: number
  targetWidth: number
  targetHeight: number
}

export interface ExportParams {
  format: ExportFormat
  pattern: string
  themeId: string
  seed: number
}

/** 校验倍率，返回可读的错误原因；合法时返回 null */
export function validateScale(scale: number): string | null {
  if (!Number.isFinite(scale)) return '请填写导出倍率（数字）'
  if (scale < MIN_SCALE || scale > MAX_SCALE) {
    return `倍率需在 ${MIN_SCALE}～${MAX_SCALE} 之间`
  }
  return null
}

/** 按倍率计算目标像素尺寸并校验是否超出浏览器允许范围 */
export function computeExportSize(
  width: number,
  height: number,
  scale: number,
): { ok: true; size: ExportSize } | { ok: false; error: string } {
  const scaleError = validateScale(scale)
  if (scaleError) return { ok: false, error: scaleError }

  const targetWidth = Math.round(width * scale)
  const targetHeight = Math.round(height * scale)

  if (targetWidth > MAX_EDGE_PX || targetHeight > MAX_EDGE_PX) {
    return {
      ok: false,
      error: `导出尺寸 ${targetWidth}×${targetHeight} 超出单边长上限 ${MAX_EDGE_PX}px，请降低倍率`,
    }
  }
  const pixels = targetWidth * targetHeight
  if (pixels > MAX_PIXELS) {
    return {
      ok: false,
      error: `导出像素总量约 ${(pixels / 1_000_000).toFixed(1)}MP，超出 ${(MAX_PIXELS / 1_000_000).toFixed(0)}MP 上限，请降低倍率`,
    }
  }

  return { ok: true, size: { scale, targetWidth, targetHeight } }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 本地时间戳，保证同一件作品多次导出也不会重名互相覆盖 */
function timestamp(): string {
  const d = new Date()
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  )
}

const FILE_SAFE = /[^a-z0-9-]+/gi

function sanitize(part: string): string {
  return (part || 'art').replace(FILE_SAFE, '-').replace(/^-+|-+$/g, '')
}

/**
 * 生成可读且可区分的文件名：
 * art-<图案>-<主题>-<种子>-<宽>x<高>[-<倍率>x]-<时间戳>.<ext>
 */
export function buildFileName(params: ExportParams, size: ExportSize): string {
  const themeName = sanitize(params.themeId || 'custom')
  const parts = [
    'art',
    sanitize(params.pattern),
    themeName,
    String(params.seed),
    `${size.targetWidth}x${size.targetHeight}`,
  ]
  // 1× 是原始尺寸，无需冗余后缀；其它倍率标明
  if (size.scale !== 1) parts.push(`${size.scale}x`)
  parts.push(timestamp())
  return `${parts.join('-')}.${params.format}`
}

/** 克隆 SVG 并按目标尺寸改写 width/height（viewBox 不变，保持与预览完全一致的画面） */
function resizeSvg(svgText: string, targetWidth: number, targetHeight: number): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const root = doc.querySelector('svg')
  const parseError = doc.querySelector('parsererror')
  if (parseError || !root) {
    throw new Error('当前画面的 SVG 数据无效，无法导出')
  }
  root.setAttribute('width', String(targetWidth))
  root.setAttribute('height', String(targetHeight))
  return new XMLSerializer().serializeToString(doc.documentElement)
}

let lastObjectUrl: string | null = null

/** 触发浏览器下载。Blob 完整生成后才会创建链接，出错不会留下半截文件 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  try {
    a.click()
  } finally {
    a.remove()
    // 释放上一次导出遗留的 URL（此时下载早已启动），再把当前 URL 留到下次清理
    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl)
    lastObjectUrl = url
  }
}

function loadSvgImage(svgText: string): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败：浏览器无法渲染当前画面的 SVG'))
    }
    img.src = url
  })
}

/**
 * 将当前画面的 SVG 按目标尺寸栅格化为 PNG。
 * 任一步失败都抛错，且不会触发下载，因此不会产生半截文件。
 */
export async function rasterizePng(svgContent: string, size: ExportSize): Promise<Blob> {
  let resizedSvg: string
  try {
    resizedSvg = size.scale === 1
      ? svgContent
      : resizeSvg(svgContent, size.targetWidth, size.targetHeight)
  } catch {
    throw new Error('生成导出图片时出错：无法按目标倍率重建 SVG')
  }

  const { img, url } = await loadSvgImage(resizedSvg)

  const canvas = document.createElement('canvas')
  canvas.width = size.targetWidth
  canvas.height = size.targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    URL.revokeObjectURL(url)
    throw new Error('当前浏览器不支持 Canvas，无法导出 PNG')
  }

  try {
    ctx.drawImage(img, 0, 0, size.targetWidth, size.targetHeight)
  } catch {
    URL.revokeObjectURL(url)
    throw new Error(
      `绘制导出图片失败（目标尺寸 ${size.targetWidth}×${size.targetHeight} 可能超过浏览器限制），请降低倍率后重试`,
    )
  }
  URL.revokeObjectURL(url)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    throw new Error('生成 PNG 文件失败：图像编码出错，请降低倍率后重试')
  }
  return blob
}

/** 生成 SVG 文件内容（非 1× 时改写 width/height，保证导出文件与所选尺寸一致） */
export function buildSvgBlob(svgContent: string, size: ExportSize): Blob {
  const text = size.scale === 1
    ? svgContent
    : resizeSvg(svgContent, size.targetWidth, size.targetHeight)
  return new Blob([text], { type: 'image/svg+xml;charset=utf-8' })
}
