import { useDesignStore, EXPORT_SCALE_MIN, EXPORT_SCALE_MAX, EXPORT_MAX_DIMENSION } from '../store/design'
import { THEMES } from '../themes/palettes'
import type { PatternType } from '../types'

const PATTERNS: { value: PatternType; label: string }[] = [
  { value: 'spiral',  label: '🌀 螺旋' },
  { value: 'fractal', label: '🌳 分形树' },
  { value: 'wave',    label: '🌊 波浪' },
  { value: 'circles', label: '⭕ 圆环' },
  { value: 'noise',   label: '🎲 噪声场' },
]

const SCALE_PRESETS = [1, 2, 3]

function scaleStatus(scale: number, width: number, height: number): { text: string; invalid: boolean } {
  if (!Number.isFinite(scale)) return { text: '请输入有效的倍率数字', invalid: true }
  if (scale < EXPORT_SCALE_MIN || scale > EXPORT_SCALE_MAX) {
    return { text: `倍率需在 ${EXPORT_SCALE_MIN}–${EXPORT_SCALE_MAX} 之间（当前 ${scale}×）`, invalid: true }
  }
  const outW = Math.round(width * scale)
  const outH = Math.round(height * scale)
  const tooLarge = outW > EXPORT_MAX_DIMENSION || outH > EXPORT_MAX_DIMENSION
  return {
    text: `导出尺寸：${outW} × ${outH} px（基于画面 ${width} × ${height}，${scale}×）${tooLarge ? `，超出单边 ${EXPORT_MAX_DIMENSION} px 上限` : ''}`,
    invalid: tooLarge,
  }
}

export default function Sidebar() {
  const store = useDesignStore()
  const status = scaleStatus(store.exportScale, store.width, store.height)

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
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${store.themeId===t.id?'ring-2 ring-indigo-400 bg-gray-700':'bg-gray-700 hover:bg-gray-600'}`}>
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
      <div className="border-t border-gray-700 pt-3 mt-1 flex flex-col gap-2">
        <label className="text-xs text-gray-400">PNG 导出倍率</label>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {SCALE_PRESETS.map(m => (
              <button key={m}
                onClick={() => store.setExportScale(m)}
                disabled={store.isExporting}
                className={`px-2.5 py-1 rounded text-xs font-medium ${store.exportScale===m?'bg-indigo-600':'bg-gray-700 hover:bg-gray-600'} disabled:opacity-50`}>
                {m}×
              </button>
            ))}
          </div>
          <input
            type="number"
            min={EXPORT_SCALE_MIN}
            max={EXPORT_SCALE_MAX}
            step={0.5}
            value={Number.isFinite(store.exportScale) ? store.exportScale : ''}
            onChange={e => store.setExportScale(e.target.value === '' ? NaN : Number(e.target.value))}
            disabled={store.isExporting}
            className="w-16 px-2 py-1 rounded text-xs bg-gray-800 border border-gray-600 disabled:opacity-50"
          />
          <span className="text-xs text-gray-500">倍</span>
        </div>
        <p className={`text-xs ${status.invalid ? 'text-red-400' : 'text-gray-400'}`}>{status.text}</p>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => store.exportSvg()}
            disabled={store.isExporting}
            className="flex-1 py-2 bg-teal-600 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-500">
            {store.isExporting ? '导出中…' : '⬇ SVG'}
          </button>
          <button
            onClick={() => store.exportPng()}
            disabled={store.isExporting || status.invalid}
            className="flex-1 py-2 bg-rose-600 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-500">
            {store.isExporting ? '导出中…' : '⬇ PNG'}
          </button>
        </div>

        {store.exportError && (
          <div className="text-xs text-red-300 bg-red-950/60 border border-red-800 rounded px-2 py-1.5">
            ⚠️ {store.exportError}
          </div>
        )}
        {store.exportMessage && !store.exportError && (
          <div className="text-xs text-green-300 bg-green-950/60 border border-green-800 rounded px-2 py-1.5 break-all">
            ✅ {store.exportMessage}
          </div>
        )}
      </div>
    </div>
  )
}
