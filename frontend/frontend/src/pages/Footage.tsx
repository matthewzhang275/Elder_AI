// Footage.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "./Footage.css"

type DayData = {
  date: Date
  dateId: string // YYYY-MM-DD
  location: string
}

type DaySummary = {
  title: string
  summary: string
  suggestions: string[]
  highlights: { id: string; title: string; location: string }[]
}

const toISODate = (d: Date) => d.toISOString().split("T")[0]

const formatNiceDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

// Hardcoded for now (pretend backend)
const SUMMARY_BY_DATE: Record<string, DaySummary> = {
  "2026-01-04": {
    title: "Calm morning, busier afternoon",
    summary:
      "Resident activity was steady. Most movement occurred around mid-day. No obvious safety issues detected, but a few moments are worth reviewing.",
    suggestions: [
      "Check for longer periods of inactivity after lunch.",
      "Review hallway traffic peaks around mid-day.",
      "Confirm staff response time for the alert-like moments.",
    ],
    highlights: [
      { id: "Main Lobby-2026-01-04-2", title: "Lobby gathering", location: "Main Lobby" },
      { id: "North Hallway-2026-01-04-4", title: "Hallway traffic spike", location: "North Hallway" },
      { id: "Garden Patio-2026-01-04-1", title: "Outdoor activity", location: "Garden Patio" },
      { id: "Recess Building-2026-01-04-6", title: "Afternoon movement", location: "Recess Building" },
    ],
  },
  "2026-01-05": {
    title: "Higher activity day",
    summary:
      "More frequent transitions between areas. Several short stops suggest residents may have been waiting or orienting.",
    suggestions: [
      "Review repeated short stops in corridors.",
      "Confirm doorways aren’t creating bottlenecks.",
      "Cross-check staff presence during peak traffic.",
    ],
    highlights: [
      { id: "Dining Commons #1-2026-01-05-0", title: "Breakfast rush", location: "Dining Commons #1" },
      { id: "Main Lobby-2026-01-05-3", title: "Lobby arrivals", location: "Main Lobby" },
      { id: "North Hallway-2026-01-05-5", title: "Corridor pacing", location: "North Hallway" },
      { id: "Garden Patio-2026-01-05-7", title: "Patio check-in", location: "Garden Patio" },
    ],
  },
}

const makeFallbackSummary = (dateId: string): DaySummary => ({
  title: "Daily overview",
  summary:
    "Summary will be loaded from the backend. For now, this is a placeholder overview for the selected day.",
  suggestions: [
    "Review top highlighted clips.",
    "Check for unusual inactivity or traffic spikes.",
    "Confirm alerts and staff responses.",
  ],
  highlights: [
    { id: `Main Lobby-${dateId}-0`, title: "Top clip", location: "Main Lobby" },
    { id: `North Hallway-${dateId}-1`, title: "Notable movement", location: "North Hallway" },
    { id: `Garden Patio-${dateId}-2`, title: "Outdoor activity", location: "Garden Patio" },
    { id: `Recess Building-${dateId}-3`, title: "General activity", location: "Recess Building" },
  ],
})

export function Footage() {
  const navigate = useNavigate()

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day
    const weekStart = new Date(today.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  })

  const weekDays = useMemo<DayData[]>(() => {
    const days: DayData[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + i)

      days.push({
        date,
        dateId: toISODate(date),
        location: `Location ${String.fromCharCode(65 + (i % 4))}`,
      })
    }
    return days
  }, [currentWeekStart])

  const carouselRef = useRef<HTMLDivElement | null>(null)

  const scrollByCards = (dir: "left" | "right") => {
    const carousel = carouselRef.current
    if (!carousel) return
    const cardWidth = 280
    const amount = cardWidth * (dir === "left" ? -1 : 1)
    carousel.scrollBy({ left: amount, behavior: "smooth" })
  }

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
  }

  const weekRangeLabel = useMemo(() => {
    const weekEnd = new Date(currentWeekStart)
    weekEnd.setDate(currentWeekStart.getDate() + 6)

    const startMonth = currentWeekStart.toLocaleDateString(undefined, { month: "short" })
    const startDay = currentWeekStart.getDate()
    const endMonth = weekEnd.toLocaleDateString(undefined, { month: "short" })
    const endDay = weekEnd.getDate()
    const year = currentWeekStart.getFullYear()

    if (startMonth === endMonth) return `Week of ${startMonth} ${startDay} - ${endDay}, ${year}`
    return `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }, [currentWeekStart])

  useEffect(() => {
    if (carouselRef.current) carouselRef.current.scrollLeft = 0
  }, [currentWeekStart])

  const [selectedDayId, setSelectedDayId] = useState(() => toISODate(new Date()))
  const [selectedDayLocation, setSelectedDayLocation] = useState(() => "Location A")

  useEffect(() => {
    const inWeek = weekDays.some((d) => d.dateId === selectedDayId)
    if (!inWeek) {
      const first = weekDays[0]
      if (first) {
        setSelectedDayId(first.dateId)
        setSelectedDayLocation(first.location)
      } else {
        setSelectedDayId(toISODate(new Date()))
        setSelectedDayLocation("Location A")
      }
    }
  }, [weekDays, selectedDayId])

  useEffect(() => {
    const found = weekDays.find((d) => d.dateId === selectedDayId)
    if (found) setSelectedDayLocation(found.location)
  }, [weekDays, selectedDayId])

  const selectedSummary = useMemo(() => {
    return SUMMARY_BY_DATE[selectedDayId] ?? makeFallbackSummary(selectedDayId)
  }, [selectedDayId])

  const highlightsRef = useRef<HTMLDivElement | null>(null)

  const scrollHighlights = (dir: "left" | "right") => {
    const el = highlightsRef.current
    if (!el) return
    const cardWidth = 320
    const amount = cardWidth * (dir === "left" ? -1 : 1)
    el.scrollBy({ left: amount, behavior: "smooth" })
  }

  const isTodayISO = (iso: string) => iso === toISODate(new Date())

  const openSelectedDay = () => {
    navigate(`/location/${encodeURIComponent(selectedDayLocation)}?date=${selectedDayId}`)
  }

  return (
    <div className="footage-page">
      <div className="footage-container">
        <header className="footage-header">
          <div>
            <h1 className="footage-title">Footage</h1>
            <p className="footage-subtitle">Browse footage by day</p>
          </div>
        </header>

        <section className="footage-week-section">
          <div className="footage-week-header">
            <button
              type="button"
              className="footage-week-nav-btn"
              onClick={goToPreviousWeek}
              aria-label="Previous week"
            >
              <span className="footage-arrow-icon">←</span>
            </button>

            <div className="footage-week-label">{weekRangeLabel}</div>

            <button
              type="button"
              className="footage-week-nav-btn"
              onClick={goToNextWeek}
              aria-label="Next week"
            >
              <span className="footage-arrow-icon">→</span>
            </button>
          </div>

          <div className="footage-carousel-wrapper">
            <button
              type="button"
              className="footage-carousel-arrow footage-carousel-arrow-left"
              onClick={() => scrollByCards("left")}
              aria-label="Scroll left"
            >
              <span className="footage-arrow-icon">←</span>
            </button>

            <div className="footage-carousel" ref={carouselRef}>
              {weekDays.map((day) => {
                const dayName = day.date.toLocaleDateString(undefined, { weekday: "short" })
                const dayNumber = day.date.getDate()
                const monthName = day.date.toLocaleDateString(undefined, { month: "short" })
                const today = isTodayISO(day.dateId)
                const selected = day.dateId === selectedDayId

                return (
                  <button
                    key={day.dateId}
                    type="button"
                    onClick={() => {
                      setSelectedDayId(day.dateId)
                      setSelectedDayLocation(day.location)
                    }}
                    className={[
                      "footage-day-card",
                      today ? "footage-day-card-today" : "",
                      selected ? "footage-day-card-selected" : "",
                    ].join(" ")}
                  >
                    <div className="footage-day-card-header">
                      <div className="footage-day-card-dayname">{dayName}</div>
                      {today && <div className="footage-day-card-badge">Today</div>}
                    </div>
                    <div className="footage-day-card-date">
                      <span className="footage-day-card-daynum">{dayNumber}</span>
                      <span className="footage-day-card-month">{monthName}</span>
                    </div>
                    <div className="footage-day-card-location">{day.location}</div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="footage-carousel-arrow footage-carousel-arrow-right"
              onClick={() => scrollByCards("right")}
              aria-label="Scroll right"
            >
              <span className="footage-arrow-icon">→</span>
            </button>
          </div>
        </section>

        {/* Quick summary + open day */}
        <section className="footage-summary-section">
          <div className="footage-summary-header">
            <div className="footage-summary-titleRow">
              <div className="footage-summary-kicker">Quick Summary</div>
              <div className="footage-summary-date">{formatNiceDate(selectedDayId)}</div>
            </div>

            <div className="footage-summary-titleLine">
              <div className="footage-summary-title">{selectedSummary.title}</div>

              <button
                type="button"
                className="footage-openDayBtn"
                onClick={openSelectedDay}
                aria-label={`Open ${selectedDayLocation} on ${selectedDayId}`}
              >
                Open Day
              </button>
            </div>
          </div>

          <div className="footage-summary-grid">
            <div className="footage-summary-card">
              <div className="footage-summary-cardTitle">What happened</div>
              <div className="footage-summary-text">{selectedSummary.summary}</div>
            </div>

            <div className="footage-summary-card">
              <div className="footage-summary-cardTitle">Suggestions</div>
              <ul className="footage-suggestions">
                {selectedSummary.suggestions.map((s, i) => (
                  <li key={i} className="footage-suggestionItem">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footage-highlights-header">
            <div className="footage-highlights-title">Highlights</div>

            <div className="footage-highlights-actions">
              <button
                type="button"
                className="footage-highlights-btn"
                onClick={() => scrollHighlights("left")}
                aria-label="Scroll highlights left"
              >
                ←
              </button>
              <button
                type="button"
                className="footage-highlights-btn"
                onClick={() => scrollHighlights("right")}
                aria-label="Scroll highlights right"
              >
                →
              </button>
            </div>
          </div>

          <div className="footage-highlights-rail" ref={highlightsRef}>
            {selectedSummary.highlights.map((h) => (
              <Link
                key={h.id}
                to={`/footage/${encodeURIComponent(h.id)}?date=${selectedDayId}&location=${encodeURIComponent(
                  h.location
                )}`}
                className="footage-highlight-card"
              >
                <div className="footage-highlight-top">
                  <div className="footage-highlight-pill">Open</div>
                </div>
                <div className="footage-highlight-title">{h.title}</div>
                <div className="footage-highlight-meta">{h.location}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
