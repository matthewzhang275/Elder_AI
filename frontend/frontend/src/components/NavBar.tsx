import { Link, useLocation } from 'react-router-dom'
import eldercareLogo from '../assets/Eldercare_AI.png'
import './NavBar.css'

export function NavBar() {
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-links">
          <Link
            to="/"
            className={location.pathname === "/" ? "navbar-link active" : "navbar-link"}
          >
            <img src={eldercareLogo} alt="Eldercare AI" className="navbar-logo" />
          </Link>
          <Link
            to="/footage"
            className={location.pathname === "/footage" ? "navbar-link active" : "navbar-link"}
          >
            Footage
          </Link>
        </div>
      </div>
    </nav>
  )
}
