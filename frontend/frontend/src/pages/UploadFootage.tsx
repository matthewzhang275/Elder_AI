import React, { useEffect, useMemo, useRef, useState } from "react"
import { uploadFootage } from "../api/uploadFootage"
import "./UploadFootage.css"

type CamId = "cam1" | "cam2" | "cam3" | "cam4"

const CAMS: { id: CamId; label: string }[] = [
  { id: "cam1", label: "Cam 1" },
  { id: "cam2", label: "Cam 2" },
  { id: "cam3", label: "Cam 3" },
  { id: "cam4", label: "Cam 4" },
]

const LOCATIONS = [
  "Dining Commons #1",
  "Recess Building",
  "Main Lobby",
  "North Hallway",
  "Garden Patio",
] as const

type LocationName = (typeof LOCATIONS)[number]

type UploadItem = {
  key: string
  dateISO: string
  location: LocationName
  cam: CamId
  file: File

  clipIndex: number
  clipId: string
  clipTitle: string

  status: "queued" | "uploading" | "done" | "error"
  error?: string

  uploadedUrl?: string
}

const toISODate = (d: Date) => d.toISOString().slice(0, 10)

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

const isVideoFile = (f: File) =>
  f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi)$/i.test(f.name)

const makeKey = (dateISO: string, location: string, cam: CamId, file: File) =>
  `${dateISO}|${location}|${cam}|${file.name}|${file.size}|${file.lastModified}`

const makeClipId = (location: string, dateISO: string, idx: number) =>
  `${location}-${dateISO}-${idx}`

const nextClipIndexForGroup = (items: UploadItem[], dateISO: string, location: string) => {
  let max = -1
  for (const it of items) {
    if (it.dateISO === dateISO && it.location === location) {
      if (it.clipIndex > max) max = it.clipIndex
    }
  }
  return max + 1
}

export default function UploadFootage() {
  const [dateISO, setDateISO] = useState(() => toISODate(new Date()))
  const [location, setLocation] = useState<LocationName>(LOCATIONS[0])
  const [activeCam, setActiveCam] = useState<CamId>("cam1")

  const [items, setItems] = useState<UploadItem[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)

  // custom dropdown (Location)
  const [locOpen, setLocOpen] = useState(false)
  const locWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = locWrapRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) setLocOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, UploadItem[]> = {}
    for (const it of items) {
      const k = `${it.dateISO} • ${it.location}`
      if (!map[k]) map[k] = []
      map[k].push(it)
    }
    return map
  }, [items])

  const setItem = (key: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(isVideoFile)
    if (arr.length === 0) {
      setToast("Drop a video file (mp4/mov/webm/etc).")
      return
    }

    setItems((prev) => {
      const next = [...prev]
      let idx = nextClipIndexForGroup(next, dateISO, location)

      for (const f of arr) {
        const key = makeKey(dateISO, location, activeCam, f)
        if (next.some((x) => x.key === key)) continue

        const clipIndex = idx++
        const clipId = makeClipId(location, dateISO, clipIndex)

        next.push({
          key,
          dateISO,
          location,
          cam: activeCam,
          file: f,

          clipIndex,
          clipId,
          clipTitle: `Clip ${clipIndex + 1}`,

          status: "queued",
        })
      }
      return next
    })
  }

  const onPickFiles = () => inputRef.current?.click()

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const removeItem = (key: string) => setItems((prev) => prev.filter((x) => x.key !== key))
  const clearDone = () => setItems((prev) => prev.filter((x) => x.status !== "done"))

  // ---- uses shared uploadFootage() helper ----
  const uploadOne = async (it: UploadItem) => {
    const result = await uploadFootage({
      dateISO: it.dateISO,
      location: it.location,
      camera: it.cam,
      clipId: it.clipId,
      title: it.clipTitle,
      file: it.file,
    })

    if (!result.ok) throw new Error(result.error)
    return result
  }

  const uploadAll = async () => {
    const queued = items.filter((x) => x.status === "queued" || x.status === "error")
    if (queued.length === 0) {
      setToast("Nothing to upload.")
      return
    }

    setBusy(true)
    setToast(null)

    try {
      for (const it of queued) {
        setItem(it.key, { status: "uploading", error: undefined })

        try {
          const data = await uploadOne(it)
          setItem(it.key, { status: "done", uploadedUrl: data.video_url })
        } catch (err: any) {
          const msg = err?.message || "Upload failed"
          setItem(it.key, { status: "error", error: msg })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const queuedCount = items.filter((x) => x.status === "queued" || x.status === "error").length

  return (
    <div className="uf-page">
      <div className="uf-shell">
        <header className="uf-header">
          <div>
            <div className="uf-title">Upload Footage</div>
            <div className="uf-subtitle">Drop videos by date, location, and camera view.</div>
          </div>

          <div className="uf-actions">
            <button className="uf-btn" type="button" onClick={clearDone} disabled={busy}>
              Clear done
            </button>
            <button className="uf-btn uf-btnPrimary" type="button" onClick={uploadAll} disabled={busy}>
              Upload {queuedCount || ""}
            </button>
          </div>
        </header>

        <section className="uf-controls">
          <div className="uf-controlCard">
            <div className="uf-controlLabel">Date</div>
            <input
              className="uf-date"
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              disabled={busy}
            />
            <div className="uf-hint">{formatNiceDate(dateISO)}</div>
          </div>

          <div className="uf-controlCard">
            <div className="uf-controlLabel">Location</div>

            <div className="uf-ddWrap" ref={locWrapRef}>
              <button
                type="button"
                className="uf-ddBtn"
                onClick={() => setLocOpen((v) => !v)}
                disabled={busy}
                aria-expanded={locOpen}
              >
                <span className="uf-ddValue">{location}</span>
                <span className={`uf-ddChevron ${locOpen ? "open" : ""}`}>▾</span>
              </button>

              {locOpen ? (
                <div className="uf-ddMenu" role="listbox" aria-label="Locations">
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      className={`uf-ddItem ${loc === location ? "active" : ""}`}
                      onClick={() => {
                        setLocation(loc)
                        setLocOpen(false)
                      }}
                      role="option"
                      aria-selected={loc === location}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="uf-hint">Same date + location can contain multiple camera uploads.</div>
          </div>

          <div className="uf-controlCard">
            <div className="uf-controlLabel">Camera</div>
            <div className="uf-camRow">
              {CAMS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`uf-camPill ${activeCam === c.id ? "isActive" : ""}`}
                  onClick={() => setActiveCam(c.id)}
                  disabled={busy}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="uf-hint">Drop multiple files — they’ll be tagged to the selected camera.</div>
          </div>
        </section>

        <section className="uf-dropWrap">
          <div className="uf-drop" onDrop={onDrop} onDragOver={onDragOver} role="button" tabIndex={0}>
            <div className="uf-dropTop">
              <div className="uf-dropTitle">Drag & drop videos here</div>
              <div className="uf-dropMeta">
                Tagged as <span className="uf-pill">{formatNiceDate(dateISO)}</span>
                <span className="uf-dot" />
                <span className="uf-pill">{location}</span>
                <span className="uf-dot" />
                <span className="uf-pill">{CAMS.find((c) => c.id === activeCam)?.label}</span>
              </div>
            </div>

            <div className="uf-dropBottom">
              <button className="uf-btn" type="button" onClick={onPickFiles} disabled={busy}>
                Browse files
              </button>
              <div className="uf-note">mp4 / mov / webm accepted</div>
            </div>

            <input
              ref={inputRef}
              className="uf-hiddenInput"
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.currentTarget.value = ""
              }}
            />
          </div>
        </section>

        <section className="uf-naming">
          <div className="uf-namingHeader">
            <div className="uf-namingTitle">Naming & Parsing</div>
            <div className="uf-namingMeta">
              IDs follow: <span className="uf-mono">{`{location}-{date}-{index}`}</span>
            </div>
          </div>

          <div className="uf-namingHint">
            Backend receives <span className="uf-mono">clip_id</span> exactly like your manual navigation IDs.
          </div>
        </section>

        <section className="uf-queue">
          <div className="uf-queueHeader">
            <div className="uf-queueTitle">Queue</div>
            <div className="uf-queueCount">{items.length} item(s)</div>
          </div>

          {items.length === 0 ? (
            <div className="uf-empty">No uploads yet. Pick a date/location/cam and drop a video.</div>
          ) : (
            <div className="uf-groups">
              {Object.entries(grouped).map(([groupKey, groupItems]) => (
                <div key={groupKey} className="uf-groupCard">
                  <div className="uf-groupHeader">
                    <div className="uf-groupTitle">{groupKey}</div>
                    <div className="uf-groupMeta">
                      {groupItems.filter((x) => x.status === "done").length}/{groupItems.length} done
                    </div>
                  </div>

                  <div className="uf-rail">
                    {groupItems.map((it) => (
                      <div key={it.key} className="uf-itemCard">
                        <div className="uf-itemTop">
                          <div className="uf-itemCam">{CAMS.find((c) => c.id === it.cam)?.label}</div>
                          <div className={`uf-status ${it.status}`}>
                            {it.status === "queued" ? "Queued" : null}
                            {it.status === "uploading" ? "Uploading…" : null}
                            {it.status === "done" ? "Done" : null}
                            {it.status === "error" ? "Error" : null}
                          </div>
                        </div>

                        <div className="uf-fileName" title={it.file.name}>
                          {it.file.name}
                        </div>

                        <div className="uf-clipRow">
                          <div className="uf-clipLabel">Clip ID</div>
                          <div className="uf-clipId uf-mono">{it.clipId}</div>
                        </div>

                        <div className="uf-titleRow">
                          <div className="uf-clipLabel">Title</div>
                          <input
                            className="uf-titleInput"
                            value={it.clipTitle}
                            onChange={(e) => setItem(it.key, { clipTitle: e.target.value })}
                            disabled={busy || it.status === "uploading"}
                            placeholder="Clip title"
                          />
                        </div>

                        <div className="uf-fileMeta">{(it.file.size / (1024 * 1024)).toFixed(1)} MB</div>

                        {it.status === "error" && it.error ? <div className="uf-error">{it.error}</div> : null}

                        {it.status === "done" && it.uploadedUrl ? (
                          <div className="uf-uploaded">
                            Saved: <span className="uf-mono">{it.uploadedUrl}</span>
                          </div>
                        ) : null}

                        <div className="uf-itemActions">
                          <button
                            type="button"
                            className="uf-miniBtn"
                            onClick={() => removeItem(it.key)}
                            disabled={busy || it.status === "uploading"}
                          >
                            Remove
                          </button>

                          {it.status === "error" ? (
                            <button
                              type="button"
                              className="uf-miniBtn uf-miniBtnPrimary"
                              onClick={async () => {
                                setItem(it.key, { status: "uploading", error: undefined })
                                try {
                                  const data = await uploadOne(it)
                                  setItem(it.key, { status: "done", uploadedUrl: data.video_url })
                                } catch (err: any) {
                                  const msg = err?.message || "Upload failed"
                                  setItem(it.key, { status: "error", error: msg })
                                }
                              }}
                              disabled={busy}
                            >
                              Retry
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {busy ? (
        <div className="uf-overlay" aria-label="Uploading">
          <div className="uf-overlayCard">
            <div className="uf-spinner" />
            <div className="uf-overlayTitle">Uploading footage…</div>
            <div className="uf-overlaySub">Please don’t close this tab.</div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="uf-toast" role="status">
          {toast}
          <button className="uf-toastClose" onClick={() => setToast(null)} type="button">
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}
