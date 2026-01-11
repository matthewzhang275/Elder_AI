import React, { useEffect, useMemo, useRef, useState } from "react"
import FaceCard from "../face_id_card/FaceCard"
import VerticalTimeline from "../vertical_timeline/VerticalTimeLine"
import type { TimelineEvent } from "../vertical_timeline/VerticalTimeLine"
import "./RightGlassDrawer.css"

type RightGlassDrawerProps = {
  defaultOpen?: boolean
  openWidth?: number
  closedWidth?: number
  children?: React.ReactNode
}

type PersonAppeared = {
  id: string
  imgUrl: string
  name: string
  age: number | string
  meta: string
}

export const RightGlassDrawer: React.FC<RightGlassDrawerProps> = ({
  defaultOpen = true,
  openWidth,
  closedWidth = 48,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen)

  // which resident is selected for filtering timeline (null = show all)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // ---- Backend-driven people list (stub for now) ----
  const [people, setPeople] = useState<PersonAppeared[]>([
    {
      id: "p1",
      imgUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&w=1200&q=80",
      name: "Resident A",
      age: 82,
      meta: "Seen 3 times • Cam 2 • 12:41 PM",
    },
    {
      id: "p2",
      imgUrl: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?fit=crop&w=1200&q=80",
      name: "Resident B",
      age: 77,
      meta: "Seen 1 time • Cam 1 • 9:02 AM",
    },
    {
      id: "p3",
      imgUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?fit=crop&w=1200&q=80",
      name: "Resident C",
      age: "Unknown",
      meta: "Seen 5 times • Cam 4 • 6:18 PM",
    },
  ])

  // ---- Timeline (stub for now) ----
  const [durationSec, setDurationSec] = useState<number>(42 * 60 + 10) // 42:10
  const [events, setEvents] = useState<TimelineEvent[]>([
    { id: "e1", personId: "p1", atSec: 35, label: "p1 entered" },
    { id: "e2", personId: "p2", atSec: 140, label: "p2 entered" },
    { id: "e3", personId: "p1", atSec: 420, label: "p1 seated" },
    { id: "e4", personId: "p3", atSec: 615, label: "p3 entered" },
    { id: "e5", personId: "p2", atSec: 980, label: "p2 left" },
    { id: "e6", personId: "p1", atSec: 1710, label: "p1 left" },
  ])

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
    // TODO: BACKEND CALL GOES HERE
    // Example:
    // const load = async () => {
    //   const res = await fetch(`/api/monitoring_stats?dayId=...`)
    //   const data = await res.json()
    //   setPeople(data.people)
    //   setDurationSec(data.videoDuration)
    //   setEvents(data.timelineEvents)
    // }
    // load()
  }, [])

  const widthStyle = useMemo(() => {
    const w = open ? openWidth ?? "clamp(420px, 50vw, 760px)" : `${closedWidth}px`
    return { width: typeof w === "number" ? `${w}px` : w }
  }, [open, openWidth, closedWidth])

  // FILTER: if a person is selected, show only their events; otherwise show all
  const filteredEvents = useMemo(() => {
    if (!selectedPersonId) return events
    return events.filter((e) => e.personId === selectedPersonId)
  }, [events, selectedPersonId])

  const onShowAll = () => {
    setSelectedPersonId(null)
    console.log("Show ALL timeline events")
  }

  const onPersonClick = (personId: string) => {
    setSelectedPersonId(personId)
    console.log("Filter timeline -> person:", personId)
  }

  const onTimelineEventClick = (ev: TimelineEvent) => {
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
              <button
                type="button"
                className="rgd-carArrow rgd-carArrowLeft"
                onClick={() => scrollPeopleBy("left")}
                aria-label="Scroll residents left"
              >
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
                  <FaceCard
                    all
                    onClick={onShowAll}
                    className={!selectedPersonId ? "rgd-personSelected" : undefined}
                  />
                </div>
              </div>

              <button
                type="button"
                className="rgd-carArrow rgd-carArrowRight"
                onClick={() => scrollPeopleBy("right")}
                aria-label="Scroll residents right"
              >
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
