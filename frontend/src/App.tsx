import { useState, useEffect, useRef } from 'react'
import CameraFeed, { CameraFeedRef } from './components/CameraFeed'
import AlgorithmDisplay from './components/AlgorithmDisplay'
import VideoInputDropdown from './components/VideoInputDropdown'
import Calibration from './components/Calibration'
import ScannedFaces from './components/ScannedFaces'

// Type for RGB color tuple
 type RGB = [number, number, number]

interface ScannedFace {
  face: string
  colors: string
  confirmed: boolean
}

import LoadingPage from './components/LoadingPage'

function App() {
  const [status, setStatus] = useState('Connecting to server...')
  const [moves, setMoves] = useState<string[]>([])
  const [isWsOpen, setIsWsOpen] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [calibratedColors, setCalibratedColors] = useState<Record<string, RGB>>({
    Y: [180, 173, 42],    // Yellow
    W: [130, 125, 130],  // White
    R: [170, 18, 33],      // Red
    G: [4, 97, 21],      // Green
    B: [0, 33, 84],      // Blue
    O: [234, 53, 25]     // Orange
  })
  const [scannedFaces, setScannedFaces] = useState<ScannedFace[]>([])
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationMessage, setCalibrationMessage] = useState('')
  const [backendReady, setBackendReady] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const cameraRef = useRef<CameraFeedRef>(null)

  // Backend readiness check
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 10
    const retryDelay = 5000

    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health')
        if (response.ok) {
          setBackendReady(true)
        } else {
          throw new Error('Backend not ready')
        }
      } catch {
        retryCount++
        if (retryCount > maxRetries) {
          setStatus('Unable to connect to backend. Please refresh the page.')
        } else {
          setTimeout(checkBackend, retryDelay)
        }
      }
    }

    checkBackend()
  }, [])

  // WebSocket connection with retry and error handling
  useEffect(() => {
    if (!backendReady) return

    let attempt = 1
    const maxAttempts = 5
    let ws: WebSocket | null = null

    const connectWebSocket = () => {
      if (attempt > maxAttempts) {
        setStatus('Failed to connect to backend after multiple attempts.')
        setIsWsOpen(false)
        return
      }

      ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        setIsWsOpen(true)
        setStatus('Place the cube in front of the camera')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        switch (data.status) {
          case 'face_scanned':
            if (data.face && data.colors) {
              setScannedFaces(prev => [...prev, { face: data.face, colors: data.colors, confirmed: true }])
            }
            setStatus(data.message || 'Face scanned')
            break
          case 'solution_ready':
            setMoves(data.moves || [])
            setStatus(data.message || 'Solution ready')
            break
          case 'calibration_step':
            setIsCalibrating(true)
            setCalibrationMessage(data.message || '')
            break
          case 'cube_detected':
          case 'no_cube':
          case 'processing':
          case 'solved':
            setStatus(data.message || '')
            break
          default:
            setStatus(data.message || 'Position the cube so all faces are visible')
            break
        }
      }

      ws.onclose = () => {
        attempt++
        setStatus('Connection lost. Retrying...')
        setIsWsOpen(false)
        const delay = Math.min(3000 * 2 ** (attempt - 1), 30000) // exponential backoff max 30s
        setTimeout(connectWebSocket, delay)
      }

      ws.onerror = () => {
        setStatus('Waiting for backend to be available...')
        setIsWsOpen(false)
        const delay = Math.min(3000 * 2 ** (attempt - 1), 30000) // exponential backoff max 30s
        setTimeout(connectWebSocket, delay)
      }
    }

    connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [calibratedColors, backendReady])

  // Convert RGB tuple to CSS rgb() string
  const rgbToCss = (rgb: RGB | null) => {
    if (!rgb) return 'transparent'
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
  }

  if (!backendReady) {
    return <LoadingPage onBackendReady={() => setBackendReady(true)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex">
      <aside className="w-64 bg-gray-800 p-4 border-r border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Settings</h2>
        <VideoInputDropdown selectedDeviceId={selectedDeviceId} onDeviceChange={setSelectedDeviceId} />
        <Calibration
          ws={wsRef.current}
          wsOpen={isWsOpen}
          isCalibrating={isCalibrating}
          calibrationMessage={calibrationMessage}
          detectedColor={''} // moved confirmation dialogs to Calibration component
          expectedColor={''}
          onStartCalibration={() => setIsCalibrating(true)}
          onResetCalibration={() => {
            setIsCalibrating(false)
            setCalibrationMessage('')
          }}
        />
      </aside>
      <main className="flex-1 p-4">
        <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-center">
          Rubik's Cube Solver
        </h1>
        <div className="flex flex-col items-center justify-center gap-8">
          <CameraFeed
            ref={cameraRef}
            ws={wsRef.current}
            wsOpen={isWsOpen}
            deviceId={selectedDeviceId}
          />
          <ScannedFaces scannedFaces={scannedFaces} />
          <section className="w-full max-w-3xl">
            <AlgorithmDisplay moves={moves} currentMove={0} />
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
