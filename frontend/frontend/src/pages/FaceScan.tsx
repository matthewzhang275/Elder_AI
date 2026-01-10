import { FaceScanInput } from '../components/FaceScanInput'
import './FaceScan.css'

export function FaceScan() {
  return (
    <div className="face-scan-container">
      <h1>Face Scan</h1>
      <FaceScanInput />
    </div>
  )
}
