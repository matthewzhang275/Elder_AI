import { VideoGlassCard } from "../sub-pages/components/video_single/video_single"
import CameraSetupBox from "../sub-pages/components/camera_setup/camera"
import "./Home.css"

export default function Home() {
  return (
    <div className="home" style={{ padding: 32 }}>
      <h1>Home</h1>
      <p>This is the mono homepage for now.</p>

      {/* Test glass card */}
      <div style={{ marginTop: 24, maxWidth: 420 }}>
        <VideoGlassCard
          thumbnailUrl="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?fit=crop&w=1200&q=80"
          videoName="Carrillo Dinner Walkthrough"
          diningCommonsName="Carrillo Dining Commons"
          dateTime={new Date()}
          tags={["dinner", "dessert"]}
          onClick={() => {
            console.log("Video card clicked")
          }}
        />
      </div>

      {/* 👇 TEST CAMERA SETUP HERE */}
      <div style={{ marginTop: 48 }}>
        <CameraSetupBox />
      </div>
    </div>
  )
}
