import api from "./AxiosClient"

export type CreatePersonPayload = {
  name: string
  age: number
  description?: string
  face: File
}

export const createPerson = async (payload: CreatePersonPayload) => {
  const form = new FormData()
  form.append("name", payload.name)
  form.append("age", String(payload.age))
  if (payload.description) form.append("description", payload.description)
  form.append("face", payload.face)

  const res = await api.post("/people/create/", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return res.data
}

export type PersonAppeared = {
  id: string
  imgUrl: string
  name: string
  age: number | string
  meta: string
}

type BackendPerson = {
  id: number
  name: string
  age: number
  description: string
  thumb_url: string | null
}

type ListPeopleResponse = {
  ok: boolean
  people: BackendPerson[]
}

export const getAllPeople = async (): Promise<PersonAppeared[]> => {
  const res = await api.get<ListPeopleResponse>("/api/people/")

  if (!res.data.ok) return []

  return res.data.people.map((p) => ({
    id: String(p.id),
    name: p.name,
    age: p.age ?? "Unknown",

    // ✅ BACKEND ALREADY RETURNS ABSOLUTE URL
    imgUrl: p.thumb_url ?? "",

    meta: p.description || "—",
  }))
}
