import { BrowserRouter,Routes, Route } from "react-router-dom"
import DayDisplayPage from "./pages/video_page/DayDisplayPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/day_display/:id" element={<DayDisplayPage />} />
      </Routes>
    </BrowserRouter>
  )
}
