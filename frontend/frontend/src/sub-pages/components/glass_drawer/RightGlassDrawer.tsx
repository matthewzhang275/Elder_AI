import React, { useEffect, useMemo, useRef, useState } from "react"
import FaceCard from "../face_id_card/FaceCard"
import VerticalTimeline from "../vertical_timeline/VerticalTimeLine"
import type { TimelineEvent as UITimelineEvent } from "../vertical_timeline/VerticalTimeLine"
import "./RightGlassDrawer.css"

import { getAllPeople, type PersonAppeared } from "../../../api/people"
import { analyzeFootageWithTwelveLabs, type TwelveLabsAnalysis } from "../../../api/twelvelabs"

type RightGlassDrawerProps = {
  dayId: string
  activeClipId?: string | null // ✅ NEW
  defaultOpen?: boolean
  openWidth?: number
  closedWidth?: number
  children?: React.ReactNode
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const severityRank = (s?: string) => {
  if (s === "high") return 3
  if (s === "medium") return 2
  return 1
}

export const RightGlassDrawer: React.FC<RightGlassDrawerProps> = ({
  dayId,
  activeClipId = null,
  defaultOpen = true,
  openWidth,
  closedWidth = 48,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // ---- backend-driven ----
  const [people, setPeople] = useState<PersonAppeared[]>([])
  const [durationSec, setDurationSec] = useState<number>(0)
  const [events, setEvents] = useState<UITimelineEvent[]>([])

  const [analysis, setAnalysis] = useState<TwelveLabsAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  // carousel ref
  const peopleRailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Load people (same as before)
  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const loadedPeople = await getAllPeople()
        if (!alive) return

        setPeople(loadedPeople)

        // reset when day changes
        setSelectedPersonId(null)
      } catch (e) {
        console.log("getAllPeople failed", e)
      }
    })()

    return () => {
      alive = false
    }
  }, [dayId])

  // ✅ NEW: Analyze active clip with TwelveLabs -> build timeline events
  useEffect(() => {
    let alive = true
    if (!activeClipId) {
      setAnalysis(null)
      setDurationSec(0)
      setEvents([])
      return
    }

    const nameToId = new Map<string, string>()
    for (const p of people) nameToId.set(String(p.name).trim(), p.id)

    const toPersonId = (name: string) => nameToId.get(String(name).trim()) ?? "__unknown__"

    const buildEventsFromAnalysis = (a: TwelveLabsAnalysis) => {
      const out: UITimelineEvent[] = []

      // duration
      const durFromJson = a.video?.duration_sec ?? null
      const durFromTimeline =
        a.timeline?.length ? Math.max(...a.timeline.map((x) => x.t)) + 1 : 0
      const duration = durFromJson ?? durFromTimeline
      const safeDuration = Math.max(0, Math.floor(duration || 0))

      // 1) WARNING events (high priority)
      const warnings = Array.isArray(a.warnings) ? a.warnings : []
      warnings.forEach((w, i) => {
        const t = clamp(Math.floor(w.start_sec ?? 0), 0, Math.max(1, safeDuration))
        const personName = w.person || "Unknown"
        out.push({
          id: `warn-${i}-${personName}-${t}`,
          personId: toPersonId(personName),
          atSec: t,
          label: `⚠ ${personName}: ${w.type} (${w.severity})`,
          variant: "warn",
          severity: w.severity,
        })
      })

      // 2) Action events (downsample so it’s readable)
      // Pick every 10 seconds (adjust if you want denser)
      const STEP = 10
      const timeline = Array.isArray(a.timeline) ? a.timeline : []

      for (const item of timeline) {
        const t = Math.floor(item.t ?? 0)
        if (t % STEP !== 0) continue
        const ppl = Array.isArray(item.people) ? item.people : []

        for (const pp of ppl) {
          const nm = pp.name || "Unknown"
          const action = pp.action || "unknown"
          out.push({
            id: `act-${t}-${nm}`,
            personId: toPersonId(nm),
            atSec: clamp(t, 0, Math.max(1, safeDuration)),
            label: `${nm}: ${action}`,
            variant: "info",
            confidence: typeof pp.confidence === "number" ? pp.confidence : undefined,
          })
        }
      }

      // sort: warnings first at same time, and high severity first
      out.sort((a1, a2) => {
        if (a1.atSec !== a2.atSec) return a1.atSec - a2.atSec
        const w1 = a1.variant === "warn" ? 1 : 0
        const w2 = a2.variant === "warn" ? 1 : 0
        if (w1 !== w2) return w2 - w1
        return severityRank(a2.severity) - severityRank(a1.severity)
      })

      return { safeDuration, out }
    }

    ;(async () => {
      try {
        setAnalysisLoading(true)
        const res = await analyzeFootageWithTwelveLabs(activeClipId)
        if (!alive) return

        if (!res.ok) {
          setAnalysis(null)
          setDurationSec(0)
          setEvents([])
          setAnalysisLoading(false)
          return
        }

        const a = res.analysis
        setAnalysis(a)

        const built = buildEventsFromAnalysis(a)
        setDurationSec(built.safeDuration)
        setEvents(built.out)

        // reset selection when switching clips
        setSelectedPersonId(null)

        setAnalysisLoading(false)
      } catch (e) {
        console.log("analyzeFootageWithTwelveLabs failed", e)
        if (!alive) return
        setAnalysis(null)
        setDurationSec(0)
        setEvents([])
        setAnalysisLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [activeClipId, people])

  const widthStyle = useMemo(() => {
    const w = open ? openWidth ?? "clamp(420px, 50vw, 760px)" : `${closedWidth}px`
    return { width: typeof w === "number" ? `${w}px` : w }
  }, [open, openWidth, closedWidth])

  // FILTER: if a person is selected, show only their events; otherwise show all
  const filteredEvents = useMemo(() => {
    if (!selectedPersonId) return events
    return events.filter((e) => e.personId === selectedPersonId)
  }, [events, selectedPersonId])

  // resolve selected person's NAME from the ID
  const selectedPersonName = useMemo(() => {
    if (!selectedPersonId) return null
    return people.find((p) => p.id === selectedPersonId)?.name ?? null
  }, [people, selectedPersonId])

  const onShowAll = () => setSelectedPersonId(null)
  const onPersonClick = (personId: string) => setSelectedPersonId(personId)

  const onTimelineEventClick = (ev: UITimelineEvent) => {
    console.log("timeline click ->", ev)
  }

  const scrollPeopleBy = (dir: "left" | "right") => {
    const rail = peopleRailRef.current
    if (!rail) return
    const amt = Math.round(rail.clientWidth * 0.92) * (dir === "left" ? -1 : 1)
    rail.scrollBy({ left: amt, behavior: "smooth" })
  }

  const warningsCount = useMemo(() => {
    if (!analysis?.warnings) return 0
    return analysis.warnings.length
  }, [analysis])

  return (
    <aside className={`rgd-root ${open ? "rgd-open" : "rgd-closed"}`} style={widthStyle} aria-expanded={open}>
      <button
        className="rgd-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close panel" : "Open panel"}
        title={open ? "Close" : "Open"}
        type="button"
      >
        <span className="rgd-toggleIcon" aria-hidden="true">
          {open ? "›" : "‹"}
        </span>
      </button>

      <div className="rgd-surface">
        <div className="rgd-header">
          <div className="rgd-titleBig">Monitoring Statistics</div>

          {/* ✅ little status chip */}
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                fontSize: 12,
                opacity: 0.92,
              }}
            >
              {activeClipId ? `Clip: ${activeClipId}` : "No clip selected"}
            </span>

            {activeClipId ? (
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: warningsCount ? "rgba(255, 60, 90, 0.12)" : "rgba(80, 255, 180, 0.10)",
                  fontSize: 12,
                  opacity: 0.92,
                }}
              >
                {analysisLoading ? "Analyzing…" : warningsCount ? `${warningsCount} warning(s)` : "No warnings"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rgd-body">
          {/* Residents present (CAROUSEL) */}
          <div className="rgd-section">
            <div className="rgd-sectionHeader">
              <div className="rgd-sectionTitle">Residents Present</div>
              <div className="rgd-divider" />
            </div>

            <div className="rgd-carousel">
              <button type="button" className="rgd-carArrow rgd-carArrowLeft" onClick={() => scrollPeopleBy("left")}>
                ←
              </button>

              <div className="rgd-carRail" ref={peopleRailRef}>
                {people.map((p) => (
                  <div className="rgd-carSlot" key={p.id}>
                    <FaceCard
                      imgUrl={p.imgUrl}
                      name={p.name}
                      age={p.age}
                      meta={p.meta}
                      onClick={() => onPersonClick(p.id)}
                      className={selectedPersonId === p.id ? "rgd-personSelected" : undefined}
                    />
                  </div>
                ))}

                <div className="rgd-carSlot">
                  <FaceCard all onClick={onShowAll} className={!selectedPersonId ? "rgd-personSelected" : undefined} />
                </div>
              </div>

              <button type="button" className="rgd-carArrow rgd-carArrowRight" onClick={() => scrollPeopleBy("right")}>
                →
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="rgd-section rgd-timelineSection">
            <div className="rgd-sectionHeader rgd-timelineHeader">
              <div className="rgd-sectionTitle">
                Timeline{selectedPersonName ? ` • ${selectedPersonName}` : " • All"}
              </div>
              <div className="rgd-divider" />
            </div>

            <VerticalTimeline
              durationSec={durationSec}
              events={filteredEvents}
              labelEverySec={120}
              minorTickEverySec={30}
              minHeightPx={560}
              pxPerMinute={70}
              padTopPx={56}
              padBottomPx={28}
              onEventClick={onTimelineEventClick}
            />
          </div>

          {children}
        </div>
      </div>
    </aside>
  )
}
