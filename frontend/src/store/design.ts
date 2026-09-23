import { create } from 'zustand'
import type { DesignParams, PatternType } from '../types'
import { THEMES } from '../themes/palettes'

export const EXPORT_SCALE_MIN = 1
export const EXPORT_SCALE_MAX = 4
export const EXPORT_MAX_DIMENSION = 10000

interface DesignStore extends DesignParams {
  themeId: string
  svgContent: string
  exportScale: number
  isExporting: boolean
  exportError: string | null
  exportMessage: string | null
  setParam: <K extends keyof DesignParams>(key: K, value: DesignParams[K]) => void
  setPattern: (p: PatternType) => void
  setTheme: (id: string) => void
  randomSeed: () => void
  setSvgContent: (s: string) => void
  setExportScale: (v: number) => void
  clearExportStatus: () => void
  exportSvg: () => void
  exportPng: () => Promise<void>
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function timestamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
}

function formatScale(scale: number) {
  return Number.isInteger(scale) ? String(scale) : scale.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// 文件名带上图案 / 主题 / 种子 / 尺寸 / 倍率 / 时间，同一作品换样式或重复导出都不会重名
function buildFileName(s: DesignStore, scale: number) {
  const scaleTag = scale > 1 ? `@${formatScale(scale)}x` : ''
  return `art-${s.pattern}-${s.themeId}-s${s.seed}-${s.width}x${s.height}${scaleTag}-${timestamp()}`
}

function validateScale(scale: number): string | null {
  if (!Number.isFinite(scale)) return '导出倍率必须是数字'
  if (scale < EXPORT_SCALE_MIN || scale > EXPORT_SCALE_MAX) {
    return `导出倍率需在 ${EXPORT_SCALE_MIN}–${EXPORT_SCALE_MAX} 之间，当前为 ${formatScale(scale)}×`
  }
  return null
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return `${fallback}：${e.message}`
  return fallback
}

// 只在文件真正生成成功后触发下载，失败时不留下空文件 / 半截文件
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function rasterizeSvg(svg: string, outW: number, outH: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    let settled = false

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('浏览器无法创建画布（可能内存不足）')
        // 按目标像素尺寸光栅化 SVG，高分辨率屏上也与预览画面一致且清晰
        ctx.drawImage(img, 0, 0, outW, outH)
        URL.revokeObjectURL(url)
        canvas.toBlob(blob => {
          if (settled) return
          if (blob) {
            settled = true
            resolve(blob)
          } else {
            settled = true
            reject(new Error('PNG 编码失败（目标尺寸可能过大）'))
          }
        }, 'image/png')
      } catch (e) {
        URL.revokeObjectURL(url)
        if (!settled) {
          settled = true
          reject(e)
        }
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      if (!settled) {
        settled = true
        reject(new Error('SVG 图片加载失败，画面数据可能已损坏'))
      }
    }
    img.src = url
  })
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  pattern: 'spiral',
  seed: 42,
  iterations: 200,
  scale: 1.0,
  rotation: 0,
  strokeWidth: 1.5,
  opacity: 0.8,
  bgColor: '#030712',
  palette: THEMES[0].colors,
  themeId: THEMES[0].id,
  width: 800,
  height: 1000,
  svgContent: '',
  exportScale: 2,
  isExporting: false,
  exportError: null,
  exportMessage: null,
  setParam: (key, value) => set({ [key]: value } as any),
  setPattern: (p) => set({ pattern: p }),
  setTheme: (id) => {
    const theme = THEMES.find(t => t.id === id)
    if (theme) set({ palette: theme.colors, themeId: theme.id })
  },
  randomSeed: () => set({ seed: Math.floor(Math.random() * 99999) }),
  setSvgContent: (s) => set({ svgContent: s }),
  setExportScale: (v) => set({ exportScale: v, exportError: null, exportMessage: null }),
  clearExportStatus: () => set({ exportError: null, exportMessage: null }),
  exportSvg: () => {
    const s = get()
    if (s.isExporting) return
    set({ exportError: null, exportMessage: null })
    if (!s.svgContent.trim()) {
      set({ exportError: 'SVG 导出失败：当前画面为空，请先调整参数生成图案' })
      return
    }
    set({ isExporting: true })
    try {
      const blob = new Blob([s.svgContent], { type: 'image/svg+xml;charset=utf-8' })
      const filename = `${buildFileName(s, 1)}.svg`
      triggerDownload(blob, filename)
      set({ exportMessage: `SVG 已导出：${filename}（矢量图，基准尺寸 ${s.width} × ${s.height}）` })
    } catch (e) {
      set({ exportError: errorMessage(e, 'SVG 导出失败') })
    } finally {
      set({ isExporting: false })
    }
  },
  exportPng: async () => {
    const s = get()
    if (s.isExporting) return
    set({ exportError: null, exportMessage: null })

    if (!s.svgContent.trim()) {
      set({ exportError: 'PNG 导出失败：当前画面为空，请先调整参数生成图案' })
      return
    }
    const scaleError = validateScale(s.exportScale)
    if (scaleError) {
      set({ exportError: scaleError })
      return
    }
    const outW = Math.round(s.width * s.exportScale)
    const outH = Math.round(s.height * s.exportScale)
    if (outW > EXPORT_MAX_DIMENSION || outH > EXPORT_MAX_DIMENSION) {
      set({
        exportError: `导出尺寸 ${outW} × ${outH} px 超出单边上限 ${EXPORT_MAX_DIMENSION} px，请降低倍率`,
      })
      return
    }

    set({ isExporting: true })
    try {
      const blob = await rasterizeSvg(s.svgContent, outW, outH)
      const filename = `${buildFileName(s, s.exportScale)}.png`
      triggerDownload(blob, filename)
      set({ exportMessage: `PNG 已导出：${filename}（${outW} × ${outH} px，${formatScale(s.exportScale)}×）` })
    } catch (e) {
      set({ exportError: errorMessage(e, 'PNG 导出失败') })
    } finally {
      set({ isExporting: false })
    }
  },
}))
