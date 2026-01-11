import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { Home } from './pages/Home'
import { Footage } from './pages/Footage'
import { FaceScan } from './pages/FaceScan'
import DayDisplayPage from './pages/video_page/DayDisplayPage'

import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/footage" element={<Footage />} />
          <Route path="/face-scan" element={<FaceScan />} />
          <Route path="/day_display/:dayId" element={<DayDisplayPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
