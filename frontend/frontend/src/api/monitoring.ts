import api from "./AxiosClient"

export type PersonAppeared = {
  id: string
  imgUrl: string
  name: string
  age: number | string
  meta: string
}

export type TimelineEvent = {
  id: string
  personId: string
  atSec: number
  label: string
}

export type MonitoringStatsResponse = {
  ok: boolean
  people: PersonAppeared[]
  videoDurationSec: number
  timelineEvents: TimelineEvent[]
}

/**
 * GET monitoring stats for a day (and optionally a location/stream).
 * Change URL to match your Django route.
 */
export const getMonitoringStats = async (params: { dayId: string }) => {
  const res = await api.get<MonitoringStatsResponse>("/api/monitoring/stats/", {
    params, // -> ?dayId=...
  })
  return res.data
}
