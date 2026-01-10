import { Link } from "react-router-dom"
import "./Home.css"

export default function Home() {
  return (
    <div className="home">
      <h1>Home</h1>
      <p>This is the mono homepage for now.</p>

      <Link to="/simple">Go to simple page →</Link>
    </div>
  )
}
