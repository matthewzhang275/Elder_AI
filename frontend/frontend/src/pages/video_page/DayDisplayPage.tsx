// DayDisplayPage.tsx (FULL FILE — copy/paste)
// Updated: no thumbnails, cards use videoUrl preview, drawer always plays the selected video.

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import CameraSetupBox from "../../sub-pages/components/camera_setup/camera"
import { VideoGlassCard } from "../../sub-pages/components/video_single/video_single"
import { RightGlassDrawer } from "../../sub-pages/components/glass_drawer/RightGlassDrawer"
import "./DayDisplayPage.css"

import { getAllIndividualVideos } from "../../api/footage"

type StreamMeta = {
  dayId: string
  placeName: string
  dateISO: string
  totalPeopleAppeared: number
}

type StreamItem = {
  id: string
  streamName: string
  placeName: string
  dateISO: string
  tags: string[]
  videoUrl: string
  camera: string
  clipId: string
}

const camTag = (camera: string) => {
  if (!camera) return "cam-?"
  return camera.replace("cam", "cam-")
}

export default function DayDisplayPage() {
  const { id } = useParams<{ id: string }>()
  const dayId = id ?? "unknown"

  const [searchParams] = useSearchParams()

  const dateParam = (searchParams.get("date") || "").trim()
  const locationParam = (searchParams.get("location") || "").trim()
  const placementParamRaw = (searchParams.get("placement") || "0").trim()
  const placement = Number.isFinite(Number(placementParamRaw)) ? Math.max(0, Number(placementParamRaw)) : 0

  const [meta, setMeta] = useState<StreamMeta>({
    dayId,
    placeName: locationParam || "Unknown Location",
    dateISO: dateParam ? `${dateParam}T00:00:00.000Z` : new Date().toISOString(),
    totalPeopleAppeared: 0,
  })

  const [streams, setStreams] = useState<StreamItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [totalStreams, setTotalStreams] = useState(0)

  const [paging, setPaging] = useState<{ offset: number; pageSize: number; total: number }>({
    offset: 0,
    pageSize: 4,
    total: 0,
  })

  const [activeStream, setActiveStream] = useState<StreamItem | null>(null)

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        if (!dateParam || !locationParam) {
          if (!alive) return
          setStreams([])
          setHasMore(false)
          setTotalStreams(0)
          setPaging({ offset: 0, pageSize: 4, total: 0 })
          setMeta({
            dayId,
            placeName: locationParam || "Unknown Location",
            dateISO: dateParam ? `${dateParam}T00:00:00.000Z` : new Date().toISOString(),
            totalPeopleAppeared: 0,
          })
          setActiveStream(null)
          return
        }

        const data = await getAllIndividualVideos({
          date: dateParam,
          location: locationParam,
          placement,
        })

        if (!alive) return

        if (!data.ok) {
          console.log("getAllIndividualVideos failed:", data.error)
          setStreams([])
          setHasMore(false)
          setTotalStreams(0)
          setPaging({ offset: 0, pageSize: 4, total: 0 })
          setActiveStream(null)
          return
        }

        console.log("[footage]", {
          asked: { date: dateParam, location: locationParam, placement },
          got: data.debug,
          returned: data.videos.map((v: any) => ({ id: v.id, clip_id: v.clip_id, camera: v.camera })),
        })

        setHasMore(!!data.has_more)
        setTotalStreams(data.total)

        const offset = data.debug?.offset ?? placement * data.page_size
        const pageSize = data.page_size ?? 4
        setPaging({ offset, pageSize, total: data.total })

        setMeta({
          dayId,
          placeName: data.location,
          dateISO: `${data.date}T00:00:00.000Z`,
          totalPeopleAppeared: 0,
        })

        const mapped: StreamItem[] = data.videos.map((v: any) => ({
          id: String(v.id),
          clipId: v.clip_id,
          streamName: v.title?.trim() ? v.title : `${String(v.camera || "").toUpperCase()} • ${v.clip_id}`,
          placeName: v.location,
          dateISO: `${v.date}T00:00:00.000Z`,
          tags: ["recorded", camTag(v.camera), `clip:${v.clip_id}`],
          videoUrl: v.video_url || "",
          camera: v.camera,
        }))

        setStreams(mapped)
        setActiveStream(null)
      } catch (e) {
        console.log("getAllIndividualVideos threw:", e)
        setStreams([])
        setHasMore(false)
        setTotalStreams(0)
        setPaging({ offset: 0, pageSize: 4, total: 0 })
        setActiveStream(null)
      }
    })()

    return () => {
      alive = false
    }
  }, [dayId, dateParam, locationParam, placement])

  const prettyDate = useMemo(() => {
    const d = new Date(meta.dateISO)
    if (Number.isNaN(d.getTime())) return "Invalid date"
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
  }, [meta.dateISO])

  const showingText = useMemo(() => {
    const start = paging.total === 0 ? 0 : paging.offset + 1
    const end = Math.min(paging.offset + streams.length, paging.total)
    return `Showing ${start}–${end} of ${paging.total}`
  }, [paging.offset, paging.total, streams.length])

  // ---- Carousel controls ----
  const railRef = useRef<HTMLDivElement | null>(null)

  const scrollByCards = (dir: "left" | "right") => {
    const rail = railRef.current
    if (!rail) return
    const amount = Math.round(rail.clientWidth * 0.92) * (dir === "left" ? -1 : 1)
    rail.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <div className="dd-page">
      <div className="dd-shell">
        <header className="dd-header">
          <div className="dd-headLeft">
            <div className="dd-title">Stream Display</div>
            <div className="dd-subtitle">Monitor and switch streams for a given day.</div>

            <div className="dd-metaRow">
              <span className="dd-metaChip">{meta.placeName}</span>
              <span className="dd-metaDot">•</span>
              <span className="dd-metaChip">{prettyDate}</span>
              <span className="dd-metaDot">•</span>
              <span className="dd-metaChip">{showingText}</span>
              {hasMore ? (
                <>
                  <span className="dd-metaDot">•</span>
                  <span className="dd-metaChip">more available</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="dd-idPill">Day ID: {dayId}</div>
        </header>

        {/* Camera control (top) */}
        <section className="dd-top">
          <div className="dd-sectionTitleRow">
            <div className="dd-sectionTitle">Camera Control</div>
            <div className="dd-sectionHint">Rotate the rig • Zoom • Select a camera</div>
          </div>

          <div className="dd-cameraCard">
            <CameraSetupBox streams={streams.map((s) => s.videoUrl)} />
          </div>
        </section>

        {/* Streams carousel */}
        <section className="dd-streams">
          <div className="dd-sectionTitleRow">
            <div className="dd-sectionTitle">Streams</div>
            <div className="dd-sectionHint">Scroll or use arrows • Click a card to open</div>
          </div>

          <div className="dd-carousel">
            <button type="button" className="dd-arrow dd-arrowLeft" onClick={() => scrollByCards("left")}>
              ←
            </button>

            <div className="dd-rail" ref={railRef}>
              {streams.map((s) => (
                <div className="dd-cardSlot" key={s.id}>
                  <VideoGlassCard
                    videoUrl={s.videoUrl}
                    videoName={s.streamName}
                    diningCommonsName={s.placeName}
                    dateTime={s.dateISO}
                    tags={s.tags as any}
                    onClick={() => setActiveStream(s)}
                  />
                </div>
              ))}
            </div>

            <button type="button" className="dd-arrow dd-arrowRight" onClick={() => scrollByCards("right")}>
              →
            </button>
          </div>
        </section>
      </div>

      {/* Right glass drawer (fixed) */}
      <RightGlassDrawer dayId={dayId} defaultOpen={false}>
        {!activeStream ? (
          <div style={{ opacity: 0.9 }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* ✅ PLAYABLE VIDEO */}
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.35)",
              }}
            >
              {activeStream.videoUrl ? (
                <video
                  src={activeStream.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ padding: 14, opacity: 0.9 }}>No video URL</div>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {activeStream.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    fontSize: 12,
                    opacity: 0.92,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div style={{ opacity: 0.9, fontSize: 13, lineHeight: 1.5 }}>
              <div>
                <b>Location:</b> {activeStream.placeName}
              </div>
              <div>
                <b>Date:</b> {new Date(activeStream.dateISO).toLocaleString()}
              </div>
              <div>
                <b>Clip ID:</b> {activeStream.clipId}
              </div>
              <div>
                <b>Camera:</b> {activeStream.camera}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (activeStream.videoUrl) window.open(activeStream.videoUrl, "_blank")
                }}
                disabled={!activeStream.videoUrl}
              >
                Open in new tab
              </button>

              <button
                style={{
                  width: 44,
                  height: 40,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveStream(null)}
                title="Clear"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </RightGlassDrawer>
    </div>
  )
}
