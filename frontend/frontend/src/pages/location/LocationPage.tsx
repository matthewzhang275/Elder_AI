// src/pages/location/LocationPage.tsx
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import HoverVideoCard from "../../components/HoverVideoCard"
import { getAllIndividualVideos, type GetAllVideosResponse } from "../../api/footage"
import "./LocationPage.css"

const LOCATIONS = [
  "Dining Commons #1",
  "Recess Building",
  "Main Lobby",
  "North Hallway",
  "Garden Patio",
] as const

const toISODate = (d: Date) => d.toISOString().slice(0, 10)
const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

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

type UiVideo = {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  videoUrl: string
}

type LocationGroup = {
  location: string
  summary: string
  videos: UiVideo[]
  ok: boolean
  error?: string
}

const pick = (v: any, keys: string[]) => {
  for (const k of keys) if (v?.[k] !== undefined) return v[k]
  return undefined
}

const normalizeVideo = (v: any, idx: number): UiVideo => {
  const id = String(pick(v, ["id", "clip_id", "clipId"]) ?? `clip-${idx}`)
  const videoUrl = String(pick(v, ["video_url", "videoUrl", "url"]) ?? "")
  const thumbnailUrl = (pick(v, ["thumbnail_url", "thumbnailUrl", "thumb_url", "thumbUrl"]) ?? null) as
    | string
    | null
  const title = String(pick(v, ["title", "name"]) ?? `Clip ${idx + 1}`)
  const description = String(pick(v, ["description", "desc"]) ?? "Hover to preview.")
  return { id, title, description, thumbnailUrl, videoUrl }
}

const makeSummary = (resp: GetAllVideosResponse, playableCount: number) => {
  if (!resp.ok) return resp.error ?? "Failed to load clips."
  if (playableCount === 0) return "None found."
  const total = typeof resp.total === "number" ? resp.total : playableCount
  return `${total} clip${total === 1 ? "" : "s"} available.`
}

export default function LocationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const dateISO = useMemo(() => {
    const q = searchParams.get("date") || ""
    if (q && isISODate(q)) return q
    return toISODate(new Date())
  }, [searchParams])

  const placement = useMemo(() => {
    const p = Number(searchParams.get("placement") ?? "0")
    return Number.isFinite(p) ? p : 0
  }, [searchParams])

  const [groups, setGroups] = useState<LocationGroup[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const results = await Promise.all(
          LOCATIONS.map(async (location) => {
            const resp = await getAllIndividualVideos({
              date: dateISO,
              location,
              placement,
            })

            const vidsRaw = Array.isArray(resp.videos) ? resp.videos : []
            const vids = vidsRaw
              .map((v, i) => normalizeVideo(v, i))
              .filter((v) => v.videoUrl)

            return {
              location,
              ok: resp.ok,
              error: resp.error,
              summary: makeSummary(resp, vids.length),
              videos: vids,
            } satisfies LocationGroup
          })
        )

        if (!cancelled) setGroups(results)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dateISO, placement])

  const onOpenClip = (clipId: string, location: string) => {
    const qs = new URLSearchParams({
      date: dateISO,
      location,
      placement: String(placement),
    }).toString()
    navigate(`/footage/${encodeURIComponent(clipId)}?${qs}`)
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
                <div className={`lp-rowSummary ${!g.ok ? "is-error" : g.videos.length === 0 ? "is-empty" : ""}`}>
                  {g.summary}
                </div>
              </div>

              {g.videos.length === 0 ? (
                <div className="lp-noneFound">
                  <div className="lp-noneTitle">No clips</div>
                  <div className="lp-noneSub">
                    Nothing recorded for this location on {formatNiceDate(dateISO)}
                    {placement ? ` (placement ${placement})` : ""}.
                  </div>
                </div>
              ) : (
                <div className="lp-rail">
                  {g.videos.map((v) => (
                    <HoverVideoCard
                      key={v.id}
                      title={v.title}
                      description={v.description}
                      thumbnailUrl={v.thumbnailUrl}
                      videoUrl={v.videoUrl}
                      onClick={() => onOpenClip(v.id, g.location)}
                      className="lp-card"
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
