// src/lib/uploadFootage.ts
import axios from "axios"
import api from "./AxiosClient"

export type UploadFootageArgs = {
  dateISO: string
  location: string
  camera: string
  clipId: string
  title?: string
  file: File
  meta?: Record<string, any>
}

export type UploadFootageOk = {
  ok: true
  id: number
  clip_id: string
  video_url: string
  date: string
  location: string
  camera: string
  title: string
}

export type UploadFootageErr = {
  ok: false
  status?: number
  error: string
  data?: any
}

export type UploadFootageResult = UploadFootageOk | UploadFootageErr

const pickErrMsg = (data: any) =>
  (typeof data === "string" && data) ||
  data?.error ||
  data?.detail ||
  data?.message ||
  "Upload failed"

export const uploadFootage = async (args: UploadFootageArgs): Promise<UploadFootageResult> => {
  const fd = new FormData()
  fd.append("date", args.dateISO)
  fd.append("location", args.location)
  fd.append("camera", args.camera)
  fd.append("clip_id", args.clipId)
  fd.append("title", args.title ?? "")
  fd.append("video", args.file)

  if (args.meta && Object.keys(args.meta).length) {
    fd.append("meta", JSON.stringify(args.meta))
  }

  try {
    const res = await api.post("/api/footage/upload/", fd, {
      timeout: 120_000, // <-- should override defaults if AxiosClient is normal
      headers: { Accept: "application/json" },
      // IMPORTANT: do NOT set Content-Type for FormData
    })

    const data = res.data as Partial<UploadFootageOk> & Record<string, any>

    // ✅ If backend already returns ok:true, keep it. Otherwise force ok:true.
    if (data && typeof data === "object" && data.ok === true) {
      return data as UploadFootageOk
    }

    // ✅ Build response explicitly (no duplicate `ok` spread warning)
    return {
      ok: true,
      id: Number(data.id),
      clip_id: String(data.clip_id ?? args.clipId),
      video_url: String(data.video_url),
      date: String(data.date ?? args.dateISO),
      location: String(data.location ?? args.location),
      camera: String(data.camera ?? args.camera),
      title: String(data.title ?? args.title ?? ""),
    }
  } catch (e) {
    if (!axios.isAxiosError(e)) {
      return { ok: false, error: "Unknown error", data: e }
    }

    const status = e.response?.status
    const data = e.response?.data
    const error =
      pickErrMsg(data) ||
      (e.code === "ECONNABORTED" ? "Upload timed out" : "") ||
      e.message ||
      "Upload failed"

    console.error("[uploadFootage] FAILED", {
      status,
      error,
      data,
      message: e.message,
      code: e.code,
    })

    return { ok: false, status, error, data }
  }
}
