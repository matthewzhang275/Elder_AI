// LocationPage.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import QuadThumbCard from "../../components/QuadThumbCard"
import "./LocationPage.css"

type LocationItem = {
  id: string
  location: string
  date: string // ISO "YYYY-MM-DD"
  title: string
  description: string
  thumbnails: (string | null)[]
}

type LocationGroup = {
  location: string
  items: LocationItem[]
}

const LOCATIONS = [
  "Dining Commons #1",
  "Recess Building",
  "Main Lobby",
  "North Hallway",
  "Garden Patio",
] as const

const toISODate = (d: Date) => d.toISOString().slice(0, 10)
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

/** DUD */
const getAllByLocationAndDate = async (
  location: string,
  dateISO: string
): Promise<LocationItem[]> => {
  await new Promise((r) => setTimeout(r, 120))

  return Array.from({ length: 8 }).map((_, i) => ({
    id: `${location}-${dateISO}-${i}`, // <-- this will become :id for /footage/:id
    location,
    date: dateISO,
    title: `Clip ${i + 1}`,
    description: "Click to learn more about what happened here.",
    thumbnails: [null, null, null, null],
  }))
}

const getAllLocationsByDate = async (dateISO: string): Promise<LocationGroup[]> => {
  return Promise.all(
    LOCATIONS.map(async (loc) => ({
      location: loc,
      items: await getAllByLocationAndDate(loc, dateISO),
    }))
  )
}

const formatNiceDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}

const LocationPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const dateISO = useMemo(() => {
    const q = searchParams.get("date") || ""
    if (q && isISODate(q)) return q
    return toISODate(new Date())
  }, [searchParams])

  const [groups, setGroups] = useState<LocationGroup[]>([])
  const [loading, setLoading] = useState(false)

  const railRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await getAllLocationsByDate(dateISO)
        if (!cancelled) setGroups(res)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dateISO])

  // ✅ Navigate to /footage/:id
  // (keeping date/location as query params is optional but useful)
  const onOpen = (location: string, id: string) => {
    const qs = new URLSearchParams({
      date: dateISO,
      location,
    }).toString()

    navigate(`/footage/${encodeURIComponent(id)}?${qs}`)
  }

  return (
    <div className="lp-wrap">
      <div className="lp-header">
        <div className="lp-dateChip">
          <span className="lp-dateChipDot" />
          <span className="lp-dateChipText">{formatNiceDate(dateISO)}</span>
        </div>
      </div>

      {loading ? (
        <div className="lp-loadingStack">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="lp-skeletonRow">
              <div className="lp-skeletonTitle" />
              <div className="lp-skeletonRail">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="lp-skeletonCard" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="lp-rows">
          {groups.map((g) => (
            <section key={g.location} className="lp-row">
              <div className="lp-rowHeader">
                <div className="lp-rowTitle">{g.location}</div>
              </div>

              <div
                className="lp-rail"
                ref={(el) => {
                  railRefs.current[g.location] = el
                }}
              >
                {g.items.map((it) => (
                  <QuadThumbCard
                    key={it.id}
                    thumbnails={it.thumbnails}
                    location={it.location}
                    title={it.title}
                    description={it.description}
                    onClick={() => onOpen(it.location, it.id)}
                    className="lp-card"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default LocationPage
