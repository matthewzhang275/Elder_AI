import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { Home } from './pages/Home'
import { Footage } from './pages/Footage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/footage" element={<Footage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
