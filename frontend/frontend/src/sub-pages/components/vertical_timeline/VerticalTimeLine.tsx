import React, { useMemo } from "react"
import "./VerticalTimeLine.css"

export type TimelineEvent = {
  id: string
  personId: string
  atSec: number
  label?: string
}

type VerticalTimelineProps = {
  durationSec: number
  events: TimelineEvent[]
  labelEverySec?: number
  minHeightPx?: number
  pxPerMinute?: number
  padTopPx?: number
  padBottomPx?: number
  minorTickEverySec?: number
  onEventClick?: (ev: TimelineEvent) => void
  className?: string
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, "0")}`
}

const secToY = (sec: number, duration: number, padTop: number, padBottom: number, height: number) => {
  const usable = Math.max(1, height - padTop - padBottom)
  const t = clamp(sec, 0, duration) / Math.max(1, duration)
  return padTop + t * usable
}

export default function VerticalTimeline({
  durationSec,
  events,
  labelEverySec = 60,
  minorTickEverySec,
  minHeightPx = 520,
  pxPerMinute = 60,
  padTopPx = 22,
  padBottomPx = 22,
  onEventClick,
  className,
}: VerticalTimelineProps) {
  const safeDuration = Math.max(1, Math.floor(durationSec))
  const heightPx = Math.max(minHeightPx, Math.round((safeDuration / 60) * pxPerMinute))

  const normalizedEvents = useMemo(
    () =>
      [...events]
        .map((e) => ({
          ...e,
          atSec: clamp(Math.floor(e.atSec), 0, safeDuration),
        }))
        .sort((a, b) => a.atSec - b.atSec),
    [events, safeDuration]
  )

  const labels = useMemo(() => {
    const step = Math.max(1, Math.floor(labelEverySec))
    const out: number[] = []
    for (let t = 0; t <= safeDuration; t += step) out.push(t)
    if (out[out.length - 1] !== safeDuration) out.push(safeDuration)
    return out
  }, [labelEverySec, safeDuration])

  const minorTicks = useMemo(() => {
    if (!minorTickEverySec) return []
    const step = Math.max(1, Math.floor(minorTickEverySec))
    const out: number[] = []
    for (let t = 0; t <= safeDuration; t += step) out.push(t)
    return out
  }, [minorTickEverySec, safeDuration])

  return (
    <div className={`vt-root ${className ?? ""}`}>
      <div
        className="vt-railWrap"
        style={
          {
            height: `${heightPx}px`,
            "--vt-pad-top": `${padTopPx}px`,
            "--vt-pad-bottom": `${padBottomPx}px`,
          } as React.CSSProperties
        }
      >
        <div className="vt-rail" />

        {/* Labels + major ticks */}
        {labels.map((t) => {
          const y = secToY(t, safeDuration, padTopPx, padBottomPx, heightPx)
          return (
            <div key={t} className="vt-labelRow" style={{ top: `${y}px` }}>
              <span className="vt-labelText">{fmt(t)}</span>
              <span className="vt-tick vt-tickMajor" />
            </div>
          )
        })}

        {/* Minor ticks */}
        {minorTicks.map((t) => {
          if (t % Math.max(1, Math.floor(labelEverySec)) === 0) return null
          const y = secToY(t, safeDuration, padTopPx, padBottomPx, heightPx)
          return <span key={`min-${t}`} className="vt-tick vt-tickMinor" style={{ top: `${y}px` }} />
        })}

        {/* Events (ALL RIGHT) */}
        {normalizedEvents.map((ev) => {
          const y = secToY(ev.atSec, safeDuration, padTopPx, padBottomPx, heightPx)
          const text = ev.label ?? `Person ${ev.personId}`

          return (
            <button
              key={ev.id}
              type="button"
              className="vt-event vt-right"
              style={{ top: `${y}px` }}
              onClick={() => onEventClick?.(ev)}
              title={`${fmt(ev.atSec)} • ${text}`}
            >
              <span className="vt-dot" />
              <span className="vt-branch" />
              <span className="vt-chip">{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
