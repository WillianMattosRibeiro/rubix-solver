import { useState, useEffect, useRef } from 'react'
import CameraFeed, { CameraFeedRef } from './components/CameraFeed'
import AlgorithmDisplay from './components/AlgorithmDisplay'
import CubeFaces from './components/CubeFaces'
import VideoInputDropdown from './components/VideoInputDropdown'

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
  const [cubeFaces, setCubeFaces] = useState<{[key: string]: string}>({
    Y: 'YYYYYYYYY', // Yellow
    W: 'WWWWWWWWW', // White
    R: 'RRRRRRRRR', // Red
    G: 'GGGGGGGGG', // Green
    B: 'BBBBBBBBB', // Blue
    O: 'OOOOOOOOO'  // Orange
  })
  const [confirmedFaces, setConfirmedFaces] = useState<{[key: string]: boolean}>({
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
  const wsRef = useRef<WebSocket | null>(null)
  const cameraRef = useRef<CameraFeedRef>(null)

  // Improved WebSocket connection with event handlers to update loading state
  useEffect(() => {
    if (!wsRef.current) return

    const ws = wsRef.current

    const handleOpen = () => {
      setIsConnected(true)
      setIsWsOpen(true)
      setIsLoading(false)
      setStatus('Place the cube in front of the camera')
    }

    const handleClose = () => {
      setIsConnected(false)
      setIsWsOpen(false)
      setIsLoading(true)
      setStatus('Connection lost. Retrying...')
    }

    const handleError = () => {
      setIsConnected(false)
      setIsWsOpen(false)
      setIsLoading(true)
      setStatus('Waiting for backend to be available...')
    }

    ws.addEventListener('open', handleOpen)
    ws.addEventListener('close', handleClose)
    ws.addEventListener('error', handleError)

    return () => {
      ws.removeEventListener('open', handleOpen)
      ws.removeEventListener('close', handleClose)
      ws.removeEventListener('error', handleError)
    }
  }, [])

  // Connect WebSocket with exponential backoff retry logic
  useEffect(() => {
    let attempt = 1
    const maxAttempts = 5
    const connectWebSocket = () => {
      if (attempt > maxAttempts) {
        setStatus('Failed to connect to backend after multiple attempts.')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        return
      }

      const ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsWsOpen(true)
        setIsLoading(false)
        setStatus('Place the cube in front of the camera')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        if (data.status === 'cube_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'no_cube') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'face_detected') {
          setStatus(data.message)
          if (data.colors) {
            const centerColor = data.colors[4]
            setLiveInputFace(centerColor)
            setLiveInputColors(data.colors)
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
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])


  // Connect WebSocket with retry logic
  useEffect(() => {
    let attempt = 1
    const connectWebSocket = () => {
      if (attempt > 3) {
        setStatus('Failed to connect to backend after 3 attempts.')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        return
      }

      const ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        if (data.status === 'cube_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'no_cube') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'face_detected') {
          setStatus(data.message)
          if (data.colors) {
            const centerColor = data.colors[4]
            setLiveInputFace(centerColor)
            setLiveInputColors(data.colors)
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
        setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = () => {
        setStatus('Waiting for backend to be available...')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Render loading animation if loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
        <svg className="animate-spin h-16 w-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <p className="mt-4 text-xl font-semibold">Connecting to backend...</p>
      </div>
    )
  }

  // Improved WebSocket connection with event handlers to update loading state
  useEffect(() => {
    if (!wsRef.current) return

    const ws = wsRef.current

    const handleOpen = () => {
      setIsConnected(true)
      setIsWsOpen(true)
      setIsLoading(false)
      setStatus('Place the cube in front of the camera')
    }

    const handleClose = () => {
      setIsConnected(false)
      setIsWsOpen(false)
      setIsLoading(true)
      setStatus('Connection lost. Retrying...')
    }

    const handleError = () => {
      setIsConnected(false)
      setIsWsOpen(false)
      setIsLoading(true)
      setStatus('Waiting for backend to be available...')
    }

    ws.addEventListener('open', handleOpen)
    ws.addEventListener('close', handleClose)
    ws.addEventListener('error', handleError)

    return () => {
      ws.removeEventListener('open', handleOpen)
      ws.removeEventListener('close', handleClose)
      ws.removeEventListener('error', handleError)
    }
  }, [])

  // Connect WebSocket with exponential backoff retry logic
  useEffect(() => {
    let attempt = 1
    const maxAttempts = 5
    const connectWebSocket = () => {
      if (attempt > maxAttempts) {
        setStatus('Failed to connect to backend after multiple attempts.')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        return
      }

      const ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsWsOpen(true)
        setIsLoading(false)
        setStatus('Place the cube in front of the camera')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        if (data.status === 'cube_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'no_cube') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'face_detected') {
          setStatus(data.message)
          if (data.colors) {
            const centerColor = data.colors[4]
            setLiveInputFace(centerColor)
            setLiveInputColors(data.colors)
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
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])


  // Connect WebSocket with retry logic
  useEffect(() => {
    let attempt = 1
    const connectWebSocket = () => {
      if (attempt > 3) {
        setStatus('Failed to connect to backend after 3 attempts.')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        return
      }

      const ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        if (data.status === 'cube_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'no_cube') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'face_detected') {
          setStatus(data.message)
          if (data.colors) {
            const centerColor = data.colors[4]
            setLiveInputFace(centerColor)
            setLiveInputColors(data.colors)
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
        setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = () => {
        setStatus('Waiting for backend to be available...')
        setIsConnected(false)
        setIsWsOpen(false)
        setIsLoading(true)
        setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Render loading animation if loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
        <svg className="animate-spin h-16 w-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <p className="mt-4 text-xl font-semibold">Connecting to backend...</p>
      </div>
    )
  }

  // Loading state for backend connection
  useEffect(() => {
    if (isConnected) {
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }
  }, [isConnected])

  // Render loading animation if loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500"></div>
        <p className="mt-4 text-xl">Connecting to backend...</p>
      </div>
    )
  }

  useEffect(() => {
    const connectWebSocket = (attempt = 1) => {
      if (attempt > 3) {
        setStatus('Failed to connect to backend after 3 attempts.')
        setIsConnected(false)
        setIsWsOpen(false)
        return
      }

      const ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setIsWsOpen(true)
        setStatus('Place the cube in front of the camera')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)
        if (data.status === 'cube_detected') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'no_cube') {
          setStatus(data.message)
          setIsError(false)
        } else if (data.status === 'face_detected') {
          setStatus(data.message)
          if (data.colors) {
            // Detect the center piece color
            const centerColor = data.colors[4]
            setLiveInputFace(centerColor)
            setLiveInputColors(data.colors)
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
        } else {
          setStatus(data.message || 'Position the cube so all faces are visible')
          setIsError(false)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        setIsConnected(false)
        setIsWsOpen(false)
        setStatus('Connection lost. Retrying...')
        // Retry connection after 3 seconds
        setTimeout(() => connectWebSocket(attempt + 1), 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        setIsWsOpen(false)
        setStatus('Waiting for backend to be available...')
        // Retry connection after 3 seconds
        setTimeout(() => connectWebSocket(attempt + 1), 3000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex">
      <aside className="w-64 bg-gray-800 p-4 border-r border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Settings</h2>
        <VideoInputDropdown selectedDeviceId={selectedDeviceId} onDeviceChange={setSelectedDeviceId} />
      </aside>
      <main className="flex-1 p-4">
        <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-center">
          Rubik's Cube Solver
        </h1>
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
          <div className="flex flex-col items-center">
            <div className={`mb-6 text-xl text-center ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {status}
            </div>
            <CameraFeed ref={cameraRef} ws={wsRef.current} wsOpen={isWsOpen} deviceId={selectedDeviceId} cubeBbox={cubeBbox} />
            {isConfirming && (
              <div className="flex flex-col items-center mt-4 space-y-2">
                <div className="text-lg font-semibold">Current Face: {currentFace.toUpperCase()}</div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'confirm_face' }))
                        setIsConfirming(false)
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  >
                    Next Face
                  </button>
                  <button
                    onClick={() => {
                      setIsConfirming(false)
                      setStatus(`Please rescan the ${currentFace} face.`)
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
                  >
                    Re-scan This Face
                  </button>
                </div>
              </div>
            )}
            <AlgorithmDisplay moves={moves} currentMove={currentMove} isError={isError} />
          </div>
          <CubeFaces
            faces={cubeFaces}
            confirmedFaces={confirmedFaces}
            liveInputFace={liveInputFace}
            liveInputColors={liveInputColors}
            onConfirm={() => {
              if (liveInputFace) {
                setCubeFaces(prev => ({ ...prev, [liveInputFace]: liveInputColors }))
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