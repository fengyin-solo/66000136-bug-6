export type PatternType = 'spiral' | 'fractal' | 'wave' | 'circles' | 'voronoi' | 'noise'

export interface DesignParams {
  pattern: PatternType
  seed: number
  iterations: number
  scale: number
  rotation: number
  strokeWidth: number
  opacity: number
  bgColor: string
  palette: string[]
  /** 当前颜色主题 id，用于导出文件命名 */
  themeId: string
  width: number
  height: number
}

export interface ColorTheme {
  id: string
  name: string
  colors: string[]
}
