import React from "react"
import "./QuadThumbCard.css"

type QuadThumbCardProps = {
  thumbnails?: (string | null)[]
  location: string
  title?: string
  description?: string
  onClick?: () => void
  className?: string
}

const SLOT_COUNT = 4

const QuadThumbCard: React.FC<QuadThumbCardProps> = ({
  thumbnails = [],
  location,
  title,
  description,
  onClick,
  className = "",
}) => {
  return (
    <button type="button" className={`qtc-card ${className}`} onClick={onClick}>
      <div className="qtc-grid">
        {Array.from({ length: SLOT_COUNT }).map((_, i) => {
          const src = thumbnails[i]
          return (
            <div key={i} className="qtc-thumbWrap">
              {src ? (
                <img className="qtc-thumb" src={src} alt={`thumbnail ${i + 1}`} />
              ) : (
                <div className="qtc-thumbPlaceholder" aria-hidden />
              )}
            </div>
          )
        })}
        <div className="qtc-openPill">Open</div>
      </div>

      <div className="qtc-meta">
        <div className="qtc-topRow">
          <div className="qtc-location">{location}</div>
          <div className="qtc-dot" />
        </div>

        {title ? <div className="qtc-title">{title}</div> : null}
        {description ? <div className="qtc-desc">{description}</div> : null}
      </div>
    </button>
  )
}

export default QuadThumbCard
