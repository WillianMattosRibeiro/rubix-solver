import { useRef, useEffect } from 'react'

const CameraFeed = () => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Error accessing camera:', err)
      }
    }
    startCamera()
  }, [])

  return (
    <div className="mb-8">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-md border border-gray-600 rounded"
      />
    </div>
  )
}

export default CameraFeed