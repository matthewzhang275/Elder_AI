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
