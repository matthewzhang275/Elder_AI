// src/api/twelvelabs.ts
import api from "./AxiosClient"

export type TwelveLabsWarning = {
  type: string
  severity: "low" | "medium" | "high"
  start_sec: number
  end_sec: number
  person: string
  evidence: string
  confidence: number
}

export type TwelveLabsTimelinePerson = {
  name: string
  action: string
  location_hint: string
  confidence: number
}

export type TwelveLabsTimelineItem = {
  t: number
  people: TwelveLabsTimelinePerson[]
}

export type TwelveLabsAnalysis = {
  video: {
    duration_sec: number | null
    people_count: number
    people: string[]
  }
  summary: {
    one_sentence: string
    bullets: string[]
  }
  warnings: TwelveLabsWarning[]
  timeline: TwelveLabsTimelineItem[]
  _twelvelabs?: {
    index_id?: string
    asset_id?: string
    indexed_asset_id?: string
    video_url?: string
    video_id_hint?: string
  }
}

export type AnalyzeVideoResponse =
  | {
      ok: true
      clip_id: string
      video_url: string
      analysis: TwelveLabsAnalysis
    }
  | {
      ok: false
      error: string
    }

/**
 * Call backend to analyze a processed video with TwelveLabs.
 *
 * Backend should expose something like:
 *   POST /api/footage/analyze/
 * Body:
 *   { "clip_id": "abc123" }
 *
 * Response (example):
 *   { ok: true, clip_id, video_url, analysis }
 */
export const analyzeFootageWithTwelveLabs = async (clipId: string) => {
  const res = await api.post<AnalyzeVideoResponse>("/api/footage/analyze/", {
    clip_id: clipId,
  })
  return res.data
}
