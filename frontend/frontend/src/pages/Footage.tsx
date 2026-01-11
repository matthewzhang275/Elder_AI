import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import "./Footage.css"

type DayData = {
  date: Date
  dateId: string // Format: YYYY-MM-DD
  location: string
}

export function Footage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start of current week (Sunday)
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day
    const weekStart = new Date(today.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  })

  // Generate 7 days for the current week
  const weekDays = useMemo<DayData[]>(() => {
    const days: DayData[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + i)
      
      days.push({
        date,
        dateId: date.toISOString().split('T')[0], // YYYY-MM-DD format
        location: `Location ${String.fromCharCode(65 + (i % 4))}`, // A, B, C, D, A, B, C
      })
    }
    return days
  }, [currentWeekStart])

  const carouselRef = useRef<HTMLDivElement | null>(null)

  const scrollByCards = (dir: "left" | "right") => {
    const carousel = carouselRef.current
    if (!carousel) return
    const cardWidth = 280 // Approximate card width including gap
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
    
    const startMonth = currentWeekStart.toLocaleDateString(undefined, { month: 'short' })
    const startDay = currentWeekStart.getDate()
    const endMonth = weekEnd.toLocaleDateString(undefined, { month: 'short' })
    const endDay = weekEnd.getDate()
    const year = currentWeekStart.getFullYear()
    
    if (startMonth === endMonth) {
      return `Week of ${startMonth} ${startDay} - ${endDay}, ${year}`
    }
    return `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }, [currentWeekStart])

  // Reset scroll position when week changes
  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0
    }
  }, [currentWeekStart])

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
                const dayName = day.date.toLocaleDateString(undefined, { weekday: 'short' })
                const dayNumber = day.date.getDate()
                const monthName = day.date.toLocaleDateString(undefined, { month: 'short' })
                const isToday = day.date.toDateString() === new Date().toDateString()

                return (
                  <Link 
                    key={day.dateId} 
                    to={`/footage/${day.dateId}`}
                    className={`footage-day-card ${isToday ? 'footage-day-card-today' : ''}`}
                  >
                    <div className="footage-day-card-header">
                      <div className="footage-day-card-dayname">{dayName}</div>
                      {isToday && <div className="footage-day-card-badge">Today</div>}
                    </div>
                    <div className="footage-day-card-date">
                      <span className="footage-day-card-daynum">{dayNumber}</span>
                      <span className="footage-day-card-month">{monthName}</span>
                    </div>
                  </Link>
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
      </div>
    </div>
  )
}
