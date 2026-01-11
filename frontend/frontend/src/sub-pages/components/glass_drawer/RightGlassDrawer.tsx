import React, { useEffect, useMemo, useRef, useState } from "react"
import FaceCard from "../face_id_card/FaceCard"
import VerticalTimeline from "../vertical_timeline/VerticalTimeLine"
import type { TimelineEvent as UITimelineEvent } from "../vertical_timeline/VerticalTimeLine"
import "./RightGlassDrawer.css"

import { getAllPeople, type PersonAppeared } from "../../../api/people"

type RightGlassDrawerProps = {
  dayId: string
  defaultOpen?: boolean
  openWidth?: number
  closedWidth?: number
  children?: React.ReactNode
}

export const RightGlassDrawer: React.FC<RightGlassDrawerProps> = ({
  dayId,
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

  // carousel ref
  const peopleRailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        // ✅ calls your Django: GET /api/people/
        const loadedPeople = await getAllPeople()
        if (!alive) return

        setPeople(loadedPeople)

        // these are still stubbed until you make endpoints for them
        setDurationSec(0)
        setEvents([])

        // reset filter when day changes
        setSelectedPersonId(null)
      } catch (e) {
        console.log("getAllPeople failed", e)
      }
    })()

    return () => {
      alive = false
    }
  }, [dayId])

  const widthStyle = useMemo(() => {
    const w = open ? openWidth ?? "clamp(420px, 50vw, 760px)" : `${closedWidth}px`
    return { width: typeof w === "number" ? `${w}px` : w }
  }, [open, openWidth, closedWidth])

  // FILTER: if a person is selected, show only their events; otherwise show all
  const filteredEvents = useMemo(() => {
    if (!selectedPersonId) return events
    return events.filter((e) => e.personId === selectedPersonId)
  }, [events, selectedPersonId])

  const onShowAll = () => setSelectedPersonId(null)
  const onPersonClick = (personId: string) => setSelectedPersonId(personId)

  const onTimelineEventClick = (ev: UITimelineEvent) => {
    console.log("timeline click -> person:", ev.personId, "seek sec:", ev.atSec, ev)
  }

  const scrollPeopleBy = (dir: "left" | "right") => {
    const rail = peopleRailRef.current
    if (!rail) return
    const amt = Math.round(rail.clientWidth * 0.92) * (dir === "left" ? -1 : 1)
    rail.scrollBy({ left: amt, behavior: "smooth" })
  }

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
                Timeline{selectedPersonId ? ` • ${selectedPersonId}` : " • All"}
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
