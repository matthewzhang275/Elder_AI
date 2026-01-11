import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import CameraSetupBox from "../../sub-pages/components/camera_setup/camera"
import { VideoGlassCard } from "../../sub-pages/components/video_single/video_single"
import { RightGlassDrawer } from "../../sub-pages/components/glass_drawer/RightGlassDrawer"
import "./DayDisplayPage.css"

type StreamMeta = {
  dayId: string
  placeName: string
  dateISO: string
  totalPeopleAppeared: number
}

type StreamItem = {
  id: string
  thumbnailUrl: string
  streamName: string
  placeName: string
  dateISO: string
  tags: string[]
}

export default function DayDisplayPage() {
  const { id } = useParams<{ id: string }>()
  const dayId = id ?? "unknown"

  // ---- Backend-driven meta (stub) ----
  const [meta, setMeta] = useState<StreamMeta>({
    dayId,
    placeName: "Default Location",
    dateISO: new Date().toISOString(),
    totalPeopleAppeared: 0,
  })

  // ---- Backend-driven stream list (stub) ----
  const [streams, setStreams] = useState<StreamItem[]>([
    {
      id: "s1",
      thumbnailUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?fit=crop&w=1200&q=80",
      streamName: "Stream A — North Entrance",
      placeName: "Default Location",
      dateISO: new Date().toISOString(),
      tags: ["live", "cam-1"],
    },
    {
      id: "s2",
      thumbnailUrl: "https://images.unsplash.com/photo-1529042410759-befb1204b468?fit=crop&w=1200&q=80",
      streamName: "Stream B — Main Hall",
      placeName: "Default Location",
      dateISO: new Date().toISOString(),
      tags: ["live", "cam-2"],
    },
    {
      id: "s3",
      thumbnailUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?fit=crop&w=1200&q=80",
      streamName: "Stream C — Side View",
      placeName: "Default Location",
      dateISO: new Date().toISOString(),
      tags: ["live", "cam-3"],
    },
    {
      id: "s4",
      thumbnailUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?fit=crop&w=1200&q=80",
      streamName: "Stream D — Overview",
      placeName: "Default Location",
      dateISO: new Date().toISOString(),
      tags: ["live", "cam-4"],
    },
  ])

  // Drawer content state (optional)
  const [activeStream, setActiveStream] = useState<StreamItem | null>(null)

  useEffect(() => {
    // TODO: BACKEND CALL GOES HERE (dayId)

    // Stub: demonstrate meta changes by dayId
    setMeta((m) => ({
      ...m,
      dayId,
      placeName: `Location — ${dayId}`,
      dateISO: new Date().toISOString(),
      totalPeopleAppeared: 27,
    }))

    setStreams((prev) =>
      prev.map((s) => ({
        ...s,
        placeName: `Location — ${dayId}`,
        dateISO: new Date().toISOString(),
      }))
    )

    // reset drawer selection on day change
    setActiveStream(null)
  }, [dayId])

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
              <span className="dd-metaChip">{meta.totalPeopleAppeared} people appeared</span>
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
            <CameraSetupBox />
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
                    thumbnailUrl={s.thumbnailUrl}
                    videoName={s.streamName}
                    diningCommonsName={s.placeName}
                    dateTime={s.dateISO}
                    tags={s.tags}
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
      <RightGlassDrawer
        defaultOpen={false}
      >
        {!activeStream ? (
          <div style={{ opacity: 0.9 }}>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <img
                src={activeStream.thumbnailUrl}
                alt={activeStream.streamName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
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
                <b>Time:</b>{" "}
                {new Date(activeStream.dateISO).toLocaleString()}
              </div>
              <div>
                <b>ID:</b> {activeStream.id}
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
                onClick={() => console.log("Open stream:", activeStream.id)}
              >
                Open Stream
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
