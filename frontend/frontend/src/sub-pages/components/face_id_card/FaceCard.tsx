import React, { type ReactNode, useRef, useState } from "react"
import "./FaceCard.css"

type FaceCardProps = {
  /** If true, renders a "Show All" card (no other props required). */
  all?: boolean
  onClick?: () => void
  className?: string

  // normal card props (optional when all=true)
  imgUrl?: string
  name?: string
  age?: number | string
  meta?: string

  topRight?: ReactNode
  footer?: ReactNode
}

export default function FaceCard({
  all = false,
  onClick,
  className,

  imgUrl,
  name,
  age,
  meta,

  topRight,
  footer,
}: FaceCardProps) {
  const cardRef = useRef<HTMLButtonElement | null>(null)
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const [hover, setHover] = useState(false)

  const handleClick = () => onClick?.()

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    setMx(x)
    setMy(y)
  }

  const styleVars = {
    ["--mx" as any]: String(mx),
    ["--my" as any]: String(my),
  } as React.CSSProperties

  if (all) {
    return (
      <button
        ref={cardRef}
        type="button"
        className={`facecard facecard-all ${className ?? ""}`}
        onClick={handleClick}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={styleVars}
      >
        <div className="facecard-glow" />
        <div className={`facecard-tilt ${hover ? "is-hover" : ""}`} />
        <div className="facecard-allCenter">Show All</div>
      </button>
    )
  }

  return (
    <button
      ref={cardRef}
      type="button"
      className={`facecard ${className ?? ""}`}
      onClick={handleClick}
      disabled={!onClick}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={styleVars}
    >
      <div className="facecard-glow" />

      {topRight && <div className="facecard-topRight">{topRight}</div>}

      <div className="facecard-viewer">
        <div className={`facecard-imgWrap ${hover ? "is-hover" : ""}`}>
          {imgUrl ? (
            <img className="facecard-img" src={imgUrl} alt={name ?? "Face"} draggable={false} />
          ) : (
            <div className="facecard-loading">No image</div>
          )}
        </div>

        <div className="facecard-shine" />
      </div>

      <div className="facecard-content">
        <div className="facecard-header">
          <div className="facecard-name">{name ?? "Unknown"}</div>
          <div className="facecard-age">{age !== undefined ? `Age ${age}` : "Age —"}</div>
        </div>

        <div className="facecard-meta">{meta ?? ""}</div>

        {footer && <div className="facecard-footer">{footer}</div>}
      </div>
    </button>
  )
}
