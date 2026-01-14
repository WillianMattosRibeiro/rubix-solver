import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react'

interface CameraFeedProps {
  ws: WebSocket | null
}

export interface CameraFeedRef {
  capture: () => void
}

const CameraFeed = forwardRef<CameraFeedRef, CameraFeedProps>(({ ws }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  useImperativeHandle(ref, () => ({
    capture: () => {
      console.log('Capture called, ws readyState:', ws?.readyState, 'video ready:', isVideoReady)
      if (videoRef.current && canvasRef.current && ws && ws.readyState === WebSocket.OPEN && isVideoReady) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          ctx.drawImage(videoRef.current, 0, 0)
          const dataURL = canvas.toDataURL('image/jpeg', 0.8)
          const base64 = dataURL.split(',')[1]
          console.log('Sending frame, base64 length:', base64.length)
          ws.send(JSON.stringify({ type: 'frame', data: base64 }))
          console.log('Frame sent')
        } else {
          console.log('No canvas context')
        }
      } else {
        console.log('Conditions not met for capture')
      }
    }
  }))

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            setIsVideoReady(true)
          }
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
        className="w-full max-w-md border-2 border-gray-400 rounded-lg shadow-lg"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {!isVideoReady && <p className="text-center mt-2 text-gray-400">Loading camera...</p>}
    </div>
  )
})

export default CameraFeed