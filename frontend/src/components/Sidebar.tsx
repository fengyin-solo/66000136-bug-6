import { useDesignStore } from '../store/design'
import { THEMES } from '../themes/palettes'
import {
  computeExportSize,
  MAX_SCALE,
  MIN_SCALE,
  type ExportFormat,
} from '../utils/export'
import type { PatternType } from '../types'

const PATTERNS: { value: PatternType; label: string }[] = [
  { value: 'spiral',  label: '🌀 螺旋' },
  { value: 'fractal', label: '🌳 分形树' },
  { value: 'wave',    label: '🌊 波浪' },
  { value: 'circles', label: '⭕ 圆环' },
  { value: 'noise',   label: '🎲 噪声场' },
]

const SCALE_PRESETS = [1, 2, 3, 4]

export default function Sidebar() {
  const store = useDesignStore()

  const isWorking = store.exportStatus === 'working'
  const sizeResult = computeExportSize(store.width, store.height, store.exportScale)
  const sizeHint = sizeResult.ok
    ? `导出尺寸 ${sizeResult.size.targetWidth}×${sizeResult.size.targetHeight}px（约 ${(
        sizeResult.size.targetWidth * sizeResult.size.targetHeight / 1_000_000
      ).toFixed(1)}MP），以当前预览画面为准`
    : sizeResult.error
  const canExport = !isWorking && sizeResult.ok && !!store.svgContent

  const handleExport = (format: ExportFormat) => {
    void store.exportImage(format)
  }

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto flex flex-col gap-4">
      <h2 className="text-lg font-bold">🎨 SVG 海报设计器</h2>

      {/* Pattern */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">图案类型</label>
        <div className="grid grid-cols-2 gap-2">
          {PATTERNS.map(p => (
            <button key={p.value} onClick={() => store.setPattern(p.value)}
              className={`px-2 py-1.5 rounded text-xs font-medium ${store.pattern===p.value?'bg-indigo-600':'bg-gray-700 hover:bg-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">颜色主题</label>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => store.setTheme(t.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600">
              <div className="flex">{t.colors.map((c,i) => (
                <div key={i} style={{background:c}} className="w-3 h-3 rounded-full" />
              ))}</div>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Seed */}
      <div>
        <label className="text-xs text-gray-400">种子: {store.seed}</label>
        <div className="flex gap-2 mt-1">
          <input type="range" min={0} max={99999} value={store.seed}
            onChange={e => store.setParam('seed', Number(e.target.value))} className="flex-1 accent-indigo-500" />
          <button onClick={() => store.randomSeed()} className="px-2 bg-indigo-600 rounded text-xs">🎲</button>
        </div>
      </div>

      {/* Iterations */}
      <div>
        <label className="text-xs text-gray-400">迭代数: {store.iterations}</label>
        <input type="range" min={10} max={500} step={10} value={store.iterations}
          onChange={e => store.setParam('iterations', Number(e.target.value))} className="w-full accent-purple-500" />
      </div>

      {/* Scale */}
      <div>
        <label className="text-xs text-gray-400">缩放: {store.scale.toFixed(2)}</label>
        <input type="range" min={0.1} max={3} step={0.1} value={store.scale}
          onChange={e => store.setParam('scale', Number(e.target.value))} className="w-full accent-green-500" />
      </div>

      {/* Rotation */}
      <div>
        <label className="text-xs text-gray-400">旋转: {store.rotation}°</label>
        <input type="range" min={0} max={360} step={5} value={store.rotation}
          onChange={e => store.setParam('rotation', Number(e.target.value))} className="w-full accent-yellow-500" />
      </div>

      {/* Stroke */}
      <div>
        <label className="text-xs text-gray-400">描边: {store.strokeWidth.toFixed(1)}</label>
        <input type="range" min={0.5} max={5} step={0.5} value={store.strokeWidth}
          onChange={e => store.setParam('strokeWidth', Number(e.target.value))} className="w-full accent-orange-500" />
      </div>

      {/* Opacity */}
      <div>
        <label className="text-xs text-gray-400">透明度: {store.opacity.toFixed(2)}</label>
        <input type="range" min={0.1} max={1} step={0.05} value={store.opacity}
          onChange={e => store.setParam('opacity', Number(e.target.value))} className="w-full accent-pink-500" />
      </div>

      {/* Export */}
      <div className="flex flex-col gap-2 mt-2 border-t border-gray-700 pt-4">
        <label className="text-xs text-gray-400 block">导出倍率</label>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {SCALE_PRESETS.map(s => (
              <button
                key={s}
                disabled={isWorking}
                onClick={() => store.setExportScale(s)}
                className={`w-10 py-1 rounded text-xs font-medium disabled:opacity-50 ${
                  store.exportScale === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <input
            type="number"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={1}
            value={Number.isFinite(store.exportScale) ? store.exportScale : ''}
            disabled={isWorking}
            onChange={e => {
              const v = e.target.value
              store.setExportScale(v.trim() === '' ? NaN : Number(v))
            }}
            className="w-16 px-2 py-1 rounded text-xs bg-gray-800 border border-gray-600 disabled:opacity-50"
            aria-label="自定义导出倍率"
          />
          <span className="text-[11px] text-gray-500">倍（{MIN_SCALE}–{MAX_SCALE}）</span>
        </div>
        <p className={`text-[11px] leading-relaxed ${sizeResult.ok ? 'text-gray-400' : 'text-red-400'}`}>
          {sizeHint}
        </p>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => handleExport('svg')}
            disabled={!canExport}
            className="flex-1 py-2 bg-teal-600 rounded text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-500"
          >
            {isWorking ? '导出中…' : '⬇ SVG'}
          </button>
          <button
            onClick={() => handleExport('png')}
            disabled={!canExport}
            className="flex-1 py-2 bg-rose-600 rounded text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-500"
          >
            {isWorking ? (
              <span className="inline-flex items-center justify-center gap-1">
                <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                导出中
              </span>
            ) : '⬇ PNG'}
          </button>
        </div>

        {store.exportStatus !== 'idle' && store.exportMessage && (
          <div
            role={store.exportStatus === 'error' ? 'alert' : 'status'}
            className={`text-[11px] leading-relaxed rounded px-2 py-1.5 ${
              store.exportStatus === 'error'
                ? 'bg-red-950/60 text-red-300 border border-red-800'
                : store.exportStatus === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                  : 'bg-gray-800 text-gray-300 border border-gray-700'
            }`}
          >
            {store.exportMessage}
          </div>
        )}
      </div>
    </div>
  )
}
