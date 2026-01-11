// src/components/HoverVideoCard.tsx
import React, { useRef, useState } from "react"
import "./HoverVideoCard.css"

type HoverVideoCardProps = {
  title: string
  description: string
  thumbnailUrl?: string | null
  videoUrl: string
  onClick?: () => void
  className?: string
}

export default function HoverVideoCard({
  title,
  description,
  thumbnailUrl,
  videoUrl,
  onClick,
  className,
}: HoverVideoCardProps) {
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const [hover, setHover] = useState(false)

  const start = async () => {
    setHover(true)
    const v = vidRef.current
    if (!v) return
    v.currentTime = 0
    try {
      await v.play()
    } catch {
      // ignore autoplay restrictions
    }
  }

  const stop = () => {
    setHover(false)
    const v = vidRef.current
    if (!v) return
    v.pause()
    v.currentTime = 0
  }

  return (
    <button
      type="button"
      className={`hvc ${className ?? ""}`}
      onClick={onClick}
      onMouseEnter={start}
      onMouseLeave={stop}
    >
      <div className="hvc-glow" />

      <div className="hvc-media">
        <div className={`hvc-thumb ${hover ? "is-hidden" : ""}`}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} draggable={false} />
          ) : (
            <div className="hvc-fallback">No thumbnail</div>
          )}
        </div>

        <div className={`hvc-video ${hover ? "is-visible" : ""}`}>
          <video ref={vidRef} src={videoUrl} muted playsInline loop preload="metadata" />
        </div>

        <div className="hvc-shine" />
      </div>

      <div className="hvc-content">
        <div className="hvc-title">{title}</div>
        <div className="hvc-desc">{description}</div>
      </div>
    </button>
  )
}
