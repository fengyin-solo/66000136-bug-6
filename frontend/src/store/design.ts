import { create } from 'zustand'
import type { DesignParams, PatternType } from '../types'
import { THEMES } from '../themes/palettes'
import {
  buildFileName,
  buildSvgBlob,
  computeExportSize,
  downloadBlob,
  rasterizePng,
  type ExportFormat,
} from '../utils/export'

export type ExportStatus = 'idle' | 'working' | 'success' | 'error'

interface DesignStore extends DesignParams {
  svgContent: string
  /** 用户选择的导出倍率 */
  exportScale: number
  exportStatus: ExportStatus
  /** 导出区的状态说明（成功/失败原因） */
  exportMessage: string
  setParam: <K extends keyof DesignParams>(key: K, value: DesignParams[K]) => void
  setPattern: (p: PatternType) => void
  setTheme: (id: string) => void
  randomSeed: () => void
  setSvgContent: (s: string) => void
  setExportScale: (scale: number) => void
  clearExportMessage: () => void
  exportImage: (format: ExportFormat) => Promise<void>
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
  exportStatus: 'idle',
  exportMessage: '',
  setParam: (key, value) => set({ [key]: value } as any),
  setPattern: (p) => set({ pattern: p }),
  setTheme: (id) => {
    const theme = THEMES.find(t => t.id === id)
    if (theme) set({ palette: theme.colors, themeId: theme.id })
  },
  randomSeed: () => set({ seed: Math.floor(Math.random() * 99999) }),
  setSvgContent: (s) => set({ svgContent: s }),
  setExportScale: (exportScale) => set({ exportScale, exportStatus: 'idle', exportMessage: '' }),
  clearExportMessage: () => set({ exportStatus: 'idle', exportMessage: '' }),
  exportImage: async (format) => {
    const state = get()

    // 导出进行中直接忽略，挡住重复点击
    if (state.exportStatus === 'working') return

    if (!state.svgContent) {
      set({ exportStatus: 'error', exportMessage: '画面尚未生成，请稍后再试' })
      return
    }

    const result = computeExportSize(state.width, state.height, state.exportScale)
    if (!result.ok) {
      set({ exportStatus: 'error', exportMessage: result.error })
      return
    }
    const size = result.size

    set({
      exportStatus: 'working',
      exportMessage: `正在导出 ${format.toUpperCase()}（${size.targetWidth}×${size.targetHeight}）…`,
    })

    try {
      const params = {
        format,
        pattern: state.pattern,
        themeId: state.themeId,
        seed: state.seed,
      }
      // 先完整生成文件（任何一步失败都会抛出且不会触发下载，避免半截文件）
      const blob = format === 'png'
        ? await rasterizePng(state.svgContent, size)
        : buildSvgBlob(state.svgContent, size)
      const fileName = buildFileName(params, size)
      downloadBlob(blob, fileName)
      set({
        exportStatus: 'success',
        exportMessage: `已保存 ${fileName}（${size.targetWidth}×${size.targetHeight}px）`,
      })
    } catch (err) {
      set({
        exportStatus: 'error',
        exportMessage: err instanceof Error ? err.message : '导出失败，请重试',
      })
    }
  },
}))
