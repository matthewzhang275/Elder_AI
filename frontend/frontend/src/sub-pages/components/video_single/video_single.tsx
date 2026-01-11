// VideoGlassCard.tsx (FULL FILE — copy/paste)
// Instead of thumbnailUrl, takes videoUrl and shows a hover-to-play preview.

import React, { useEffect, useMemo, useRef, useState } from "react"
import type { DiningTag } from "../../variables/video"

type VideoGlassCardProps = {
  videoUrl: string
  videoName: string
  diningCommonsName: string
  dateTime: Date | string
  tags?: DiningTag[]
  onClick?: () => void

  // Optional sizing
  width?: number | string
  height?: number | string
  className?: string
}

const formatDateTime = (dt: Date | string) => {
  const d = typeof dt === "string" ? new Date(dt) : dt
  if (Number.isNaN(d.getTime())) return "Invalid date"

  return d
    .toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(",", "")
}

const chipLabel = (t: string) => {
  const s = t.trim()
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1)
}

export const VideoGlassCard: React.FC<VideoGlassCardProps> = ({
  videoUrl,
  videoName,
  diningCommonsName,
  dateTime,
  tags = [],
  onClick,
  width = 380,
  height = 240,
  className = "",
}) => {
  const timeLabel = useMemo(() => formatDateTime(dateTime), [dateTime])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isHover, setIsHover] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    if (!isHover) {
      try {
        v.pause()
        v.currentTime = 0
      } catch {}
      return
    }

    // Hover: try to play (muted + playsInline)
    ;(async () => {
      try {
        if (v.readyState < 2) v.load()
        await v.play()
      } catch {
        // autoplay can still be blocked sometimes; ignore
      }
    })()
  }, [isHover, videoUrl])

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{
        width,
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        style={{
          borderRadius: 26,
          overflow: "hidden",
          position: "relative",
          height,
          background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.20)",
        }}
      >
        {/* Video preview layer */}
        <div style={{ position: "absolute", inset: 0 }}>
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              preload="metadata"
              loop
              // prevent iOS fullscreen on play
              controls={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scale(1.02)",
                filter: "saturate(1.05) contrast(1.05)",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              No video
            </div>
          )}
        </div>

        {/* Dark gradient for readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.72) 100%)",
          }}
        />

        {/* Subtle highlight sheen */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -80,
            width: 220,
            height: 220,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0.0) 60%)",
            transform: "rotate(18deg)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 16,
            gap: 10,
          }}
        >
          {/* Top row chips (tags) */}
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {tags.slice(0, 6).map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  style={{
                    fontSize: 12,
                    lineHeight: "18px",
                    padding: "6px 10px",
                    borderRadius: 999,
                    color: "rgba(255,255,255,0.92)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
                    border: "1px solid rgba(255,255,255,0.18)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
                    userSelect: "none",
                  }}
                >
                  {chipLabel(String(t))}
                </span>
              ))}
              {tags.length > 6 && (
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: "18px",
                    padding: "6px 10px",
                    borderRadius: 999,
                    color: "rgba(255,255,255,0.85)",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    userSelect: "none",
                  }}
                >
                  +{tags.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Title + meta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                color: "rgba(255,255,255,0.96)",
                fontSize: 18,
                fontWeight: 650,
                letterSpacing: "-0.2px",
                textShadow: "0 10px 24px rgba(0,0,0,0.45)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={videoName}
            >
              {videoName}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                color: "rgba(255,255,255,0.78)",
                fontSize: 13,
                textShadow: "0 10px 24px rgba(0,0,0,0.35)",
              }}
            >
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {diningCommonsName}
              </span>

              <span style={{ opacity: 0.7 }}>•</span>

              <span>{timeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
