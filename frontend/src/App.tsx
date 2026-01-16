import { useState, useEffect, useRef } from 'react'
import CameraFeed, { CameraFeedRef } from './components/CameraFeed'
import AlgorithmDisplay from './components/AlgorithmDisplay'
import CubeFaces from './components/CubeFaces'
import VideoInputDropdown from './components/VideoInputDropdown'
import Calibration from './components/Calibration'

// Type for RGB color tuple
type RGB = [number, number, number]

function App() {
  const [status, setStatus] = useState('Connecting to server...')
  const [moves, setMoves] = useState<string[]>([])
  const [currentMove, setCurrentMove] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [isError, setIsError] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isWsOpen, setIsWsOpen] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [currentFace, setCurrentFace] = useState('')

  // Store calibrated RGB colors for each face
  const [calibratedColors, setCalibratedColors] = useState<Record<string, RGB>>({
    Y: [180, 173, 42],    // Yellow
    W: [130, 125, 130],  // White
    R: [170, 18, 33],      // Red
    G: [4, 97, 21],      // Green
    B: [0, 33, 84],      // Blue
    O: [234, 53, 25]     // Orange
  })

  const [confirmedFaces, setConfirmedFaces] = useState<Record<string, boolean>>({
    Y: false,
    W: false,
    R: false,
    G: false,
    B: false,
    O: false
  })

  const [cubeBbox, setCubeBbox] = useState<[number, number, number, number] | undefined>()
  const [liveInputFace, setLiveInputFace] = useState<string | null>(null)
  const [liveInputColors, setLiveInputColors] = useState<string>('UUUUUUUUU')
  const [isLoading, setIsLoading] = useState(true)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationMessage, setCalibrationMessage] = useState('')
  const [detectedColor, setDetectedColor] = useState<RGB | null>(null)
  const [expectedColor, setExpectedColor] = useState('')
  const [showColorSelector, setShowColorSelector] = useState(false)
  const [selectedColor, setSelectedColor] = useState('Y')

  const wsRef = useRef<WebSocket | null>(null)
  const cameraRef = useRef<CameraFeedRef>(null)

  // WebSocket connection with retry and error handling
  useEffect(() => {
    let attempt = 1
    const maxAttempts = 5
    let ws: WebSocket | null = null

    const connectWebSocket = () => {
      if (attempt > maxAttempts) {
        setStatus('Failed to connect to backend after multiple attempts.')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        return
      }

      ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsWsOpen(true)
        setIsLoading(false)
        setStatus('Place the cube in front of the camera')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.status === 'cube_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'no_cube') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'face_detected') {
          setStatus(data.message)
          if (data.colors) {
            // Use only the center piece color for calibration and face update
            const centerColor = data.colors[4]
            setLiveInputFace(centerColor)
            setLiveInputColors(centerColor.repeat(9)) // replicate center color for face panel
          }
          setIsError(false)
        } else if (data.status === 'face_not_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'processing') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'solving') {
          setStatus(data.message || 'Algorithm generated! Follow the steps to solve the cube.')
          setMoves(data.moves)
          setCurrentMove(data.current_move)
          setWrongMoves(0)
          setIsError(false)
        } else if (data.status === 'error') {
          setWrongMoves(prev => prev + 1)
          if (wrongMoves + 1 >= 3) {
            setStatus('Too many wrong moves. Rotate the cube and try again.')
            setMoves([])
            setCurrentMove(0)
          } else {
            setStatus(`Wrong move (${wrongMoves + 1}/3). Try again.`)
          }
          setIsError(true)
        } else if (data.status === 'solved') {
          setStatus('Cube solved! 🎉')
          setMoves([])
          setCurrentMove(0)
          setIsError(false)
        } else if (data.status === 'calibration_started') {
          setIsCalibrating(true)
          setCalibrationMessage(data.message || 'Calibration started...')
          setDetectedColor(null)
          setExpectedColor('')
          setShowColorSelector(false)
          setSelectedColor('Y')
        } else if (data.status === 'calibration_update') {
          setCalibrationMessage(data.message || '')
          if (data.detectedColor && Array.isArray(data.detectedColor) && data.detectedColor.length === 3) {
            setDetectedColor(data.detectedColor as RGB)
          } else {
            setDetectedColor(null)
          }
          setExpectedColor(data.expectedColor || '')
        } else if (data.status === 'calibration_completed') {
          setCalibrationMessage(data.message || 'Calibration completed.')
          setIsCalibrating(false)
          setDetectedColor(null)
          setExpectedColor('')
          setShowColorSelector(false)
          setSelectedColor('Y')
          // Send calibrated colors to backend
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'calibration_update', colors: calibratedColors }))
          }
        } else if (data.status === 'calibration_reset') {
          setIsCalibrating(false)
          setCalibrationMessage('')
          setDetectedColor(null)
          setExpectedColor('')
          setShowColorSelector(false)
          setSelectedColor('Y')
        } else {
          setStatus(data.message || 'Position the cube so all faces are visible')
          setIsError(false)
        }
      }

      ws.onclose = () => {
        attempt++
        setStatus('Connection lost. Retrying...')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        const delay = Math.min(3000 * 2 ** (attempt - 1), 30000) // exponential backoff max 30s
        setTimeout(connectWebSocket, delay)
      }

      ws.onerror = () => {
        setStatus('Waiting for backend to be available...')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
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
  }, [calibratedColors])

  // Define a fixed cube bounding box for overlay
  useEffect(() => {
    const width = 240
    const height = 240
    const x = 320 - width / 2
    const y = 240 - height / 2
    setCubeBbox([x, y, width, height])
  }, [])

  // Send cubeBbox to backend periodically
  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !cubeBbox) return
    const interval = setInterval(() => {
      wsRef.current?.send(JSON.stringify({ type: 'cube_bbox', bbox: cubeBbox }))
    }, 1000)
    return () => clearInterval(interval)
  }, [cubeBbox])

  // Convert RGB tuple to CSS rgb() string
  const rgbToCss = (rgb: RGB | null) => {
    if (!rgb) return 'transparent'
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
  }

  // Handle confirmation of calibration color
  const handleConfirmColor = () => {
    if (!detectedColor || !currentFace) return
    setCalibratedColors(prev => ({ ...prev, [currentFace]: detectedColor }))
    setConfirmedFaces(prev => ({ ...prev, [currentFace]: true }))
    setIsConfirming(false)
    setShowColorSelector(false)
    setStatus(`Color for face ${currentFace} updated.`)
  }

  // Handle user denying detected color and selecting from dropdown
  const handleSelectColor = () => {
    if (!currentFace) return
    // Map selectedColor to default RGB
    const defaultColors: Record<string, RGB> = {
      Y: [255, 255, 0],
      W: [255, 255, 255],
      R: [255, 0, 0],
      G: [0, 128, 0],
      B: [0, 0, 255],
      O: [255, 165, 0]
    }
    const newColor = detectedColor || defaultColors[selectedColor] || defaultColors['Y']
    setCalibratedColors(prev => ({ ...prev, [currentFace]: newColor }))
    setConfirmedFaces(prev => ({ ...prev, [currentFace]: true }))
    setShowColorSelector(false)
    setIsConfirming(false)
    setStatus(`Color for face ${currentFace} updated.`)
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
          detectedColor={detectedColor ? rgbToCss(detectedColor) : ''}
          expectedColor={expectedColor}
          onStartCalibration={() => setIsCalibrating(true)}
          onResetCalibration={() => {
            setIsCalibrating(false)
            setCalibrationMessage('')
            setDetectedColor(null)
            setExpectedColor('')
            setShowColorSelector(false)
            setSelectedColor('Y')
          }}
        />
      </aside>
      <main className="flex-1 p-4">
        <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-center">
          Rubik's Cube Solver
        </h1>
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
          <div className="flex flex-col items-center">
            <CameraFeed
              ref={cameraRef}
              ws={wsRef.current}
              wsOpen={isWsOpen}
              deviceId={selectedDeviceId}
              cubeBbox={cubeBbox}
              liveInputFace={liveInputFace}
            />

            {isConfirming && !showColorSelector && detectedColor && (
              <div className="flex flex-col items-center mt-4 space-y-2">
                <div className="text-lg font-semibold">Current Face: {currentFace.toUpperCase()}</div>
                <div className="flex items-center space-x-4">
                  <div
                    className="w-8 h-8 rounded border border-gray-400"
                    style={{ backgroundColor: rgbToCss(detectedColor) }}
                  ></div>
                  <span>The color captured is correct?</span>
                  <button
                    onClick={handleConfirmColor}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowColorSelector(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {showColorSelector && (
              <div className="flex flex-col items-center mt-4 space-y-2">
                <label htmlFor="color-select" className="mb-2 font-semibold">
                  Select the correct color for the face:
                </label>
                <select
                  id="color-select"
                  className="text-black px-2 py-1 rounded"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                >
                  <option value="Y">Yellow</option>
                  <option value="W">White</option>
                  <option value="R">Red</option>
                  <option value="G">Green</option>
                  <option value="B">Blue</option>
                  <option value="O">Orange</option>
                </select>
                <div className="flex space-x-4 mt-2">
                  <button
                    onClick={handleSelectColor}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setShowColorSelector(false)
                      setIsConfirming(false)
                      setStatus(`Please rescan the ${currentFace} face.`)
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <AlgorithmDisplay moves={moves} currentMove={currentMove} isError={isError} />
          </div>

          <CubeFaces
            faces={Object.keys(calibratedColors).reduce((acc, face) => {
              acc[face] = rgbToCss(calibratedColors[face])
              return acc
            }, {} as Record<string, string>)}
            confirmedFaces={confirmedFaces}
            liveInputFace={liveInputFace}
            liveInputColors={liveInputColors}
            onConfirm={() => {
              if (liveInputFace) {
                setCalibratedColors(prev => {
                  const newColors = { ...prev }
                  newColors[liveInputFace] = liveInputColors.split('').map(c => {
                    switch (c) {
                      case 'Y': return [255, 255, 0] as RGB
                      case 'W': return [255, 255, 255] as RGB
                      case 'R': return [255, 0, 0] as RGB
                      case 'G': return [0, 128, 0] as RGB
                      case 'B': return [0, 0, 255] as RGB
                      case 'O': return [255, 165, 0] as RGB
                      default: return [0, 0, 0] as RGB
                    }
                  }).flat()
                  return newColors
                })
                setConfirmedFaces(prev => ({ ...prev, [liveInputFace]: true }))
              }
            }}
            onRescan={(face) => setConfirmedFaces(prev => ({ ...prev, [face]: false }))}
            onGetSolution={() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'get_solution' }))
              }
            }}
          />
        </div>
      </main>
    </div>
  )
}

export default App
