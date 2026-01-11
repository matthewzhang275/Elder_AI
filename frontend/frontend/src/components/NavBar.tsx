import { Link, useLocation } from "react-router-dom"
import eldercareLogo from "../assets/Eldercare_AI.png"
import "./NavBar.css"

export function NavBar() {
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* LEFT */}
        <div className="navbar-links">
          <Link
            to="/"
            className={location.pathname === "/" ? "navbar-link active" : "navbar-link"}
          >
            <img
              src={eldercareLogo}
              alt="Eldercare AI"
              className="navbar-logo"
            />
          </Link>

          <Link
            to="/footage"
            className={location.pathname === "/footage" ? "navbar-link active" : "navbar-link"}
          >
            Footage
          </Link>

          <Link
            to="/face-scan"
            className={location.pathname === "/face-scan" ? "navbar-link active" : "navbar-link"}
          >
            Face Scan
          </Link>

          <Link
            to="/upload-footage"
            className={location.pathname === "/upload-footage" ? "navbar-link active" : "navbar-link"}
          >
            Import Footage
          </Link>
        </div>

        {/* RIGHT */}
        <div className="navbar-user">
          Logged in as <span className="navbar-org">Westmont Living</span> administrator
        </div>
      </div>
    </nav>
  )
}
