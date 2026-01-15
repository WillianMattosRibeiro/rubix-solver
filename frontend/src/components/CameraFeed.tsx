import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react'

interface CameraFeedProps {
  ws: WebSocket | null
  wsOpen: boolean
  deviceId?: string
  cubeBbox?: [number, number, number, number]  // x, y, w, h
}

export interface CameraFeedRef {
  capture: () => void
}

const CameraFeed = forwardRef<CameraFeedRef, CameraFeedProps>(({ ws, wsOpen, deviceId, cubeBbox }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
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
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
          }
          videoRef.current.onplay = () => {
            setIsVideoReady(true)
          }
        }
      } catch (err) {
        console.error('Error accessing camera:', err)
        // Prompt user to allow camera permissions programmatically
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          alert('Camera access denied. Please allow camera permissions in your browser settings.')
        }
      }
    }
    startCamera()
  }, [deviceId])

  // Additional effect to detect camera availability and prompt
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const hasCamera = devices.some(device => device.kind === 'videoinput')
        if (!hasCamera) {
          alert('No camera device found. Please connect a camera and refresh the page.')
        }
      } catch (err) {
        console.error('Error enumerating devices:', err)
      }
    }
    checkCameraAvailability()
  }, [])

  useEffect(() => {
    if (!wsOpen || !ws || ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready for sending frames:', { wsOpen, wsReadyState: ws?.readyState })
      return
    }

    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && ws.readyState === WebSocket.OPEN && isVideoReady && videoRef.current.videoWidth > 0) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Reduce size to 320x240 to reduce data
          const maxWidth = 320
          const maxHeight = 240
          const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight
          let width = maxWidth
          let height = maxWidth / aspectRatio
          if (height > maxHeight) {
            height = maxHeight
            width = maxHeight * aspectRatio
          }
          canvas.width = width
          canvas.height = height
          ctx.drawImage(videoRef.current, 0, 0, width, height)
          const dataURL = canvas.toDataURL('image/jpeg', 0.7)
          const base64 = dataURL.split(',')[1]
          console.log('Sending frame automatically, canvas size:', width, height)
          ws.send(JSON.stringify({ type: 'frame', data: base64 }))
          console.log('Frame sent')
        } else {
          console.log('No canvas context')
        }
      } else {
        console.log('Not sending: video ready?', isVideoReady, 'video width:', videoRef.current?.videoWidth, 'ws ready:', ws.readyState)
      }
    }, 250) // Send frame every 250ms (4fps)

    return () => clearInterval(interval)
  }, [ws, wsOpen, isVideoReady])

  // Draw grid overlay when cubeBbox changes
  useEffect(() => {
    if (overlayRef.current && cubeBbox) {
      const overlay = overlayRef.current
      const ctx = overlay.getContext('2d')
      if (ctx) {
        overlay.width = videoRef.current?.videoWidth || 640
        overlay.height = videoRef.current?.videoHeight || 480
        ctx.clearRect(0, 0, overlay.width, overlay.height)
        const [x, y, w, h] = cubeBbox
        // Draw rectangle around cube
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, w, h)
        // Draw 3x3 grid inside the cube
        const cellW = w / 3
        const cellH = h / 3
        ctx.strokeStyle = 'yellow'
        ctx.lineWidth = 1
        for (let i = 1; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(x + i * cellW, y)
          ctx.lineTo(x + i * cellW, y + h)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x, y + i * cellH)
          ctx.lineTo(x + w, y + i * cellH)
          ctx.stroke()
        }
      }
    }
  }, [cubeBbox])

  useEffect(() => {
    if (!overlayRef.current || !videoRef.current) return
    const ctx = overlayRef.current.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const video = videoRef.current
      const overlay = overlayRef.current
      overlay.width = video.videoWidth
      overlay.height = video.videoHeight

      ctx.clearRect(0, 0, overlay.width, overlay.height)

      // Draw cube bounding box and grid if available
      if (cubeBbox) {
        const [x, y, w, h] = cubeBbox
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, w, h)

        const cellW = w / 3
        const cellH = h / 3
        ctx.strokeStyle = 'yellow'
        ctx.lineWidth = 1
        for (let i = 1; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(x + i * cellW, y)
          ctx.lineTo(x + i * cellW, y + h)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x, y + i * cellH)
          ctx.lineTo(x + w, y + i * cellH)
          ctx.stroke()
        }

        // Draw live detected face color label above the cube
        if (typeof liveInputFace !== 'undefined' && liveInputFace !== null) {
          const labelMap: {[key: string]: string} = {
            Y: 'Yellow',
            W: 'White',
            R: 'Red',
            G: 'Green',
            B: 'Blue',
            O: 'Orange'
          }
          const label = labelMap[liveInputFace] || 'Unknown'
          ctx.font = '24px Arial'
          ctx.fillStyle = 'lime'
          ctx.textAlign = 'center'
          ctx.fillText(label, x + w / 2, y - 10)
        }
      }

      requestAnimationFrame(draw)
    }

    draw()
  }, [cubeBbox, liveInputFace])

  return (
    <div className="mb-8 relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-md border-2 border-gray-400 rounded-lg shadow-lg"
      />
      <canvas
        ref={overlayRef}
        className="absolute top-0 left-0 w-full max-w-md border-2 border-gray-400 rounded-lg shadow-lg pointer-events-none"
        style={{ zIndex: 10 }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {!isVideoReady && <p className="text-center mt-2 text-gray-400">Loading camera...</p>}
    </div>
  )
})

export default CameraFeed