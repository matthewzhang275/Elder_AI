import { useState, useRef, useEffect } from 'react'
import { uploadFaceScan } from '../api/uploadFaceScan'
import './FaceScanInput.css'

interface FaceScanData {
  name: string
  description: string
  age: string
  video: Blob | null
}

const RECORDING_DURATION = 15000 // 15 seconds in milliseconds

export function FaceScanInput() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [age, setAge] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const stopTimerRef = useRef<number | null>(null)

  useEffect(() => {
    // Cleanup video URL when component unmounts
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [videoUrl])

  const startRecording = async () => {
    try {
      // Clear previous recording if exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
        setVideoUrl(null)
      }
      setVideoBlob(null)
      // Set recording state first so video element becomes visible
      setIsRecording(true)
      setCountdown(15)

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      streamRef.current = stream
      // Video element is always rendered (just hidden), so ref should be available
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setVideoBlob(blob)
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        setCountdown(null)
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      }

      mediaRecorder.start()

      // Countdown timer
      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current)
            }
            return null
          }
          return prev - 1
        })
      }, 1000)

      // Auto-stop after 15 seconds
      stopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
          setIsRecording(false)
        }
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
        }
      }, RECORDING_DURATION)
    } catch (error) {
      console.error('Error accessing webcam:', error)
      alert('Error accessing webcam. Please allow camera permissions.')
      setIsRecording(false)
      setCountdown(null)
    }
  }

  const reRecord = () => {
    // Clean up existing video
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
    setVideoBlob(null)
    // Stop any ongoing recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    // Clear timers
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
    }
    // Stop any active stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCountdown(null)
  }

  const handlePushScan = async () => {
    if (!name.trim()) return alert("Enter a name")
    if (!age.trim()) return alert("Enter an age")
    if (!videoBlob) return alert("Record a scan video first")

    const res = await uploadFaceScan({
      name,
      description,
      age,
      videoBlob,
      filename: `scan-${name.replace(/\s+/g, "_")}-${Date.now()}.webm`,
    })

    if (!res.ok) {
      alert(res.error)
      return
    }

    console.log("✅ Created person:", res.person)
    alert(`Saved: ${res.person.name}`)
  }

  return (
    <div className="face-scan-input">
      <div className="video-section">
        <h3>Record Video</h3>
        <div className="instructions">
          <p><strong>Instructions:</strong> Please move your head slowly in all directions - left, right, up, down, and rotate - so we can capture your face from multiple angles. The recording will automatically stop after 15 seconds.</p>
        </div>
        <div className="video-container">
          {isRecording && (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className="video-preview"
            />
          )}
          {videoUrl && !isRecording && (
            <div className="video-playback">
              <p>Recorded Video:</p>
              <video src={videoUrl} controls className="recorded-video" />
            </div>
          )}
        </div>
        <div className="video-controls">
          {!isRecording && !videoUrl && (
            <button onClick={startRecording} className="record-button">
              Start Scan (15 seconds)
            </button>
          )}
          {isRecording && (
            <div className="recording-status">
              <button className="record-button" disabled>
                Recording... {countdown !== null ? `${countdown}s` : ''}
              </button>
            </div>
          )}
          {videoUrl && !isRecording && (
            <button onClick={reRecord} className="rerecord-button">
              Re-record Video
            </button>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3>Enter Information</h3>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows={4}
          />
        </div>
        <div className="form-group">
          <label htmlFor="age">Age:</label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Enter age"
            min="0"
          />
        </div>
        <button onClick={handlePushScan} className="push-scan-button">
          Push Scan
        </button>
      </div>
    </div>
  )
}
