import api from "./AxiosClient"

export type BackendVideo = {
  id: number
  clip_id: string
  title: string
  camera: string
  date: string // YYYY-MM-DD
  location: string
  video_url: string | null
  thumb_url: string | null
  meta: Record<string, any>
  created_at: string | null
}

export type GetAllVideosResponse = {
  ok: boolean
  error?: string

  debug?: {
    filters?: { date?: string; location?: string }
    placement?: number
    page_size?: number
    offset?: number
    limit?: number
    returned_count?: number
    total_matching?: number
    returned_clip_ids?: string[]
  }

  date: string
  location: string
  placement: number
  page_size: number
  total: number
  has_more: boolean
  videos: BackendVideo[]
}

export type GetAllVideosArgs = {
  date: string
  location: string
  placement: number
}

export const getAllIndividualVideos = async (args: GetAllVideosArgs): Promise<GetAllVideosResponse> => {
  const res = await api.get<GetAllVideosResponse>("/api/footage/all/", {
    params: {
      date: args.date,
      location: args.location,
      placement: args.placement,
    },
  })
  return res.data
}
