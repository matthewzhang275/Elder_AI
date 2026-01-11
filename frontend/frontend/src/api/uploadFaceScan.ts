import axios from "axios"
import api from "./AxiosClient"

export type UploadFaceScanArgs = {
  name: string
  description: string
  age: string | number
  videoBlob: Blob
  filename?: string
}

export type UploadFaceScanOk = {
  ok: true
  person: {
    id: number
    name: string
    age: number
    description: string
    scan_video: string | null // URL
    face_image?: string | null
  }
}

export type UploadFaceScanErr = {
  ok: false
  status?: number
  error: string
  data?: any
}

export type UploadFaceScanResult = UploadFaceScanOk | UploadFaceScanErr

const pickErrMsg = (data: any) =>
  (typeof data === "string" && data) ||
  data?.error ||
  data?.detail ||
  data?.message ||
  "Upload failed"

export const uploadFaceScan = async (args: UploadFaceScanArgs): Promise<UploadFaceScanResult> => {
  const fd = new FormData()
  fd.append("name", args.name)
  fd.append("description", args.description ?? "")
  fd.append("age", String(args.age))

  const filename = args.filename ?? `face-scan-${Date.now()}.webm`
  const file = new File([args.videoBlob], filename, {
    type: args.videoBlob.type || "video/webm",
  })

  // ✅ match Django: scan_video field
  fd.append("scan_video", file)

  try {
    const res = await api.post("/api/person/create/", fd, {
      timeout: 120_000,
    })
    return res.data as UploadFaceScanOk
  } catch (e) {
    if (!axios.isAxiosError(e)) return { ok: false, error: "Unknown error", data: e }

    const status = e.response?.status
    const data = e.response?.data
    const error = pickErrMsg(data) || e.message

    console.error("[uploadFaceScan] FAILED", { status, error, data, message: e.message })
    return { ok: false, status, error, data }
  }
}
