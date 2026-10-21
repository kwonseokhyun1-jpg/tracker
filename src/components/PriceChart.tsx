import { useMemo, useState } from 'react'
import type { PriceHistoryPoint } from '../priceHistory'

interface PriceChartProps {
  points: PriceHistoryPoint[]
  showFoil?: boolean
}

function formatAxisDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTipDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildPath(
  values: Array<{ x: number; y: number } | null>,
): string {
  let d = ''
  let started = false
  for (const pt of values) {
    if (!pt) {
      started = false
      continue
    }
    d += started ? ` L ${pt.x} ${pt.y}` : `M ${pt.x} ${pt.y}`
    started = true
  }
  return d
}

export function PriceChart({ points, showFoil = true }: PriceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const chart = useMemo(() => {
    const width = 560
    const height = 220
    const pad = { top: 16, right: 16, bottom: 28, left: 48 }
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom

    const samples = points.flatMap((p) => {
      const vals: number[] = []
      if (typeof p.normal === 'number') vals.push(p.normal)
      if (showFoil && typeof p.foil === 'number') vals.push(p.foil)
      return vals
    })

    if (samples.length === 0 || points.length === 0) {
      return null
    }

    const minY = Math.min(...samples)
    const maxY = Math.max(...samples)
    const span = maxY - minY || Math.max(maxY * 0.1, 0.5)
    const y0 = Math.max(0, minY - span * 0.08)
    const y1 = maxY + span * 0.08

    const xAt = (i: number) =>
      pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
    const yAt = (v: number) => pad.top + ((y1 - v) / (y1 - y0)) * innerH

    const normalPts = points.map((p, i) =>
      typeof p.normal === 'number' ? { x: xAt(i), y: yAt(p.normal) } : null,
    )
    const foilPts = showFoil
      ? points.map((p, i) =>
          typeof p.foil === 'number' ? { x: xAt(i), y: yAt(p.foil) } : null,
        )
      : []

    const ticks = 4
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = y0 + ((y1 - y0) * i) / ticks
      return { value: v, y: yAt(v) }
    })

    const xLabelIndexes =
      points.length <= 4
        ? points.map((_, i) => i)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1]

    return {
      width,
      height,
      pad,
      innerW,
      innerH,
      yTicks,
      xLabelIndexes,
      normalPath: buildPath(normalPts),
      foilPath: buildPath(foilPts),
      normalPts,
      foilPts,
      xAt,
    }
  }, [points, showFoil])

  if (!chart) {
    return <p className="muted price-chart-empty">No priced points to graph yet.</p>
  }

  const hover = hoverIndex != null ? points[hoverIndex] : null

  return (
    <div className="price-chart">
      <svg
        className="price-chart-svg"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Card market price history chart"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {chart.yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={chart.pad.left}
              x2={chart.pad.left + chart.innerW}
              y1={tick.y}
              y2={tick.y}
              className="price-chart-grid"
            />
            <text x={chart.pad.left - 8} y={tick.y + 4} textAnchor="end" className="price-chart-label">
              ${tick.value.toFixed(tick.value >= 100 ? 0 : 2)}
            </text>
          </g>
        ))}

        {chart.xLabelIndexes.map((i) => (
          <text
            key={points[i].date}
            x={chart.xAt(i)}
            y={chart.height - 8}
            textAnchor="middle"
            className="price-chart-label"
          >
            {formatAxisDate(points[i].date)}
          </text>
        ))}

        {chart.foilPath && (
          <path d={chart.foilPath} className="price-chart-line price-chart-line-foil" fill="none" />
        )}
        {chart.normalPath && (
          <path
            d={chart.normalPath}
            className="price-chart-line price-chart-line-normal"
            fill="none"
          />
        )}

        {hoverIndex != null && (
          <line
            x1={chart.xAt(hoverIndex)}
            x2={chart.xAt(hoverIndex)}
            y1={chart.pad.top}
            y2={chart.pad.top + chart.innerH}
            className="price-chart-crosshair"
          />
        )}

        {points.map((_, i) => (
          <rect
            key={points[i].date}
            x={chart.xAt(i) - Math.max(chart.innerW / points.length / 2, 6)}
            y={chart.pad.top}
            width={Math.max(chart.innerW / points.length, 12)}
            height={chart.innerH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}
      </svg>

      <div className="price-chart-legend">
        <span className="price-chart-legend-item price-chart-legend-normal">Market</span>
        {showFoil && points.some((p) => p.foil != null) && (
          <span className="price-chart-legend-item price-chart-legend-foil">Foil</span>
        )}
      </div>

      {hover && (
        <p className="price-chart-tooltip" aria-live="polite">
          {formatTipDate(hover.date)}
          {typeof hover.normal === 'number' && <> · Market ${hover.normal.toFixed(2)}</>}
          {typeof hover.foil === 'number' && <> · Foil ${hover.foil.toFixed(2)}</>}
        </p>
      )}
    </div>
  )
}
