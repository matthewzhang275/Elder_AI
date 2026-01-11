import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Canvas } from "@react-three/fiber"
import { Html, OrbitControls, RoundedBox, Environment } from "@react-three/drei"
import "./camera.css"

type CamId = "topLeft" | "topRight" | "bottomLeft" | "bottomRight"

const CAMS: { id: CamId; label: string; idx: number }[] = [
  { id: "topLeft", label: "Cam 1", idx: 0 },
  { id: "topRight", label: "Cam 2", idx: 1 },
  { id: "bottomLeft", label: "Cam 3", idx: 2 },
  { id: "bottomRight", label: "Cam 4", idx: 3 },
]

const camTitle = (id: CamId) => {
  switch (id) {
    case "topLeft":
      return "Camera 1 — Top Left"
    case "topRight":
      return "Camera 2 — Top Right"
    case "bottomLeft":
      return "Camera 3 — Bottom Left"
    case "bottomRight":
      return "Camera 4 — Bottom Right"
  }
}

function BoxScene({
  activeCam,
  setActiveCam,
}: {
  activeCam: CamId
  setActiveCam: (id: CamId) => void
}) {
  // Box dimensions in world units
  const w = 6
  const h = 2.2
  const d = 3

  // Top face anchors
  // Top face anchors (slightly inset + slightly above the surface so they visually "sit" on the corner)
  const anchors = useMemo(
    () => {
      const inset = 0.42 // pull toward center so it matches rounded corners visually
      const yLift = 0.18 // lift above glass so it doesn't clip / feel embedded

      return ({
        topLeft: [-w / 2 + inset, h / 2 + yLift, -d / 2 + inset] as [number, number, number],
        topRight: [w / 2 - inset, h / 2 + yLift, -d / 2 + inset] as [number, number, number],
        bottomLeft: [-w / 2 + inset, h / 2 + yLift, d / 2 - inset] as [number, number, number],
        bottomRight: [w / 2 - inset, h / 2 + yLift, d / 2 - inset] as [number, number, number],
      }) satisfies Record<CamId, [number, number, number]>
    },
    [w, h, d]
  )


  return (
    <>
      {/* interior-ish lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 4]} intensity={0.85} />
      <directionalLight position={[-6, 6, -6]} intensity={0.25} />

      {/* warehouse reads more "indoor" than city */}
      <Environment preset="warehouse" />

      {/* ROOM (simple dining hall vibe) */}
      <group>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]} receiveShadow>
          <planeGeometry args={[26, 18, 1, 1]} />
          <meshStandardMaterial color="#0c0d10" roughness={0.55} metalness={0.15} />
        </mesh>

        {/* Back wall */}
        <mesh position={[0, 3.2, -8]} receiveShadow>
          <planeGeometry args={[26, 10]} />
          <meshStandardMaterial color="#0e0f13" roughness={0.95} metalness={0} />
        </mesh>

        {/* Left wall */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[-13, 3.2, 0]} receiveShadow>
          <planeGeometry args={[18, 10]} />
          <meshStandardMaterial color="#0d0e12" roughness={0.95} metalness={0} />
        </mesh>

        {/* Right wall */}
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[13, 3.2, 0]} receiveShadow>
          <planeGeometry args={[18, 10]} />
          <meshStandardMaterial color="#0d0e12" roughness={0.95} metalness={0} />
        </mesh>

        {/* Ceiling */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8.2, 0]} receiveShadow>
          <planeGeometry args={[26, 18]} />
          <meshStandardMaterial color="#0b0c10" roughness={0.9} metalness={0} />
        </mesh>

        {/* Ceiling "light panels" (emissive) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-5, 8.15, -2]}>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.55} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[5, 8.15, -2]}>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.55} />
        </mesh>

        {/* Pillars */}
        <mesh position={[-8, 2.2, -3]}>
          <boxGeometry args={[0.7, 6, 0.7]} />
          <meshStandardMaterial color="#0a0b0f" roughness={0.9} />
        </mesh>
        <mesh position={[8, 2.2, -3]}>
          <boxGeometry args={[0.7, 6, 0.7]} />
          <meshStandardMaterial color="#0a0b0f" roughness={0.9} />
        </mesh>
      </group>

      {/* GLASS BOX inside the room (lifted slightly) */}
      <group position={[0, 0.1, 0]}>
        <RoundedBox args={[w, h, d]} radius={0.28} smoothness={10}>
          <meshPhysicalMaterial
            transparent
            opacity={0.18}
            roughness={0.12}
            metalness={0.0}
            clearcoat={1}
            clearcoatRoughness={0.08}
            ior={1.45}
            thickness={2.4}
            transmission={1}
            attenuationDistance={3.5}
            attenuationColor="#ffffff"
            specularIntensity={1}
          />
        </RoundedBox>

        <RoundedBox args={[w * 0.92, h * 0.92, d * 0.92]} radius={0.26} smoothness={10}>
          <meshPhysicalMaterial
            transparent
            opacity={0.06}
            roughness={0.35}
            metalness={0}
            transmission={1}
            thickness={1.5}
            ior={1.4}
            clearcoat={0.8}
            clearcoatRoughness={0.25}
          />
        </RoundedBox>

        {/* Corner pills */}
        {(Object.keys(anchors) as CamId[]).map((id) => {
          const isActive = id === activeCam
          return (
            <group key={id} position={anchors[id]}>
              <Html center transform distanceFactor={12} occlude={false} style={{ pointerEvents: "auto" }}>
                <button
                  type="button"
                  onClick={() => setActiveCam(id)}
                  className={`cs-cornerCam3d cs-cornerCam3d--sm ${isActive ? "isActive" : ""}`}
                  aria-pressed={isActive}
                >
                  <span className="cs-camDot" />
                  <span className="cs-camText">{CAMS.find((c) => c.id === id)?.label}</span>
                </button>
              </Html>
            </group>
          )
        })}
      </group>

      <OrbitControls
        target={[0, 0.6, 0]}
        enablePan={false}
        enableZoom
        zoomSpeed={1.0}
        rotateSpeed={0.65}
        dampingFactor={0.08}
        enableDamping
        minDistance={4.5}
        maxDistance={18}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.55}
      />
    </>
  )
}

export default function CameraSetupBox() {
  // read the day_display id from the URL: /day_display/:id
  const { id } = useParams<{ id: string }>()
  const dayId = id ?? "unknown"

  const [activeCam, setActiveCam] = useState<CamId>("topLeft")
  const activeLabel = useMemo(() => camTitle(activeCam), [activeCam])

  // 4 stream URLs (index 0..3) — state so backend can update it
  const [streams, setStreams] = useState<string[]>([
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  ])

  useEffect(() => {
    // TODO: BACKEND CALL GOES HERE (use dayId)
    // Example shape you might want from backend:
    // GET /api/day_display/${dayId}/streams  ->  { streams: [url0, url1, url2, url3] }
    //
    // const load = async () => {
    //   const res = await fetch(`/api/day_display/${dayId}/streams`)
    //   const data = await res.json()
    //   // Ensure length 4
    //   const next = Array.isArray(data.streams) ? data.streams.slice(0, 4) : []
    //   while (next.length < 4) next.push("")
    //   setStreams(next)
    // }
    // load()

    // dud for now (but shows where dayId is used)
    console.log("would fetch streams for dayId:", dayId)
  }, [dayId])

  const activeStreamUrl = useMemo(() => {
    const idx = CAMS.find((c) => c.id === activeCam)?.idx ?? 0
    return streams[idx] || ""
  }, [activeCam, streams])

  return (
    <div className="cs-page">
      <div className="cs-shell">
        <div className="cs-headerRow">
          <div className="cs-title">Camera Setup</div>
          <div className="cs-pill">{activeLabel}</div>
        </div>

        <div className="cs-stage">
          {/* Left */}
          <div className="cs-boxWrap">
            <div className="cs-3dWrap">
              <Canvas className="cs-canvas" camera={{ position: [6, 4, 8], fov: 50 }} dpr={[1, 2]}>
                <BoxScene activeCam={activeCam} setActiveCam={setActiveCam} />
              </Canvas>
            </div>

            <div className="cs-dragHint">Drag to rotate • Scroll to zoom • Click corners</div>
          </div>

          {/* Right */}
          <div className="cs-streamPanel">
            <div className="cs-streamGlass">
              <video
                key={activeCam} // forces reload when cam changes (handy for live-ish mp4 testing)
                className="cs-streamVideo"
                src={activeStreamUrl}
                autoPlay
                muted
                playsInline
                loop
                controls
              />

              <div className="cs-streamOverlay">
                <div className="cs-streamTop">
                  <div className="cs-streamTitle">Live View</div>
                  <div className="cs-streamSub">{activeLabel}</div>
                </div>

                <div className="cs-streamQuickRow">
                  {CAMS.map((c) => {
                    const isActive = c.id === activeCam
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveCam(c.id)}
                        className={`cs-quickBtn ${isActive ? "isActive" : ""}`}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="cs-streamSheen" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
