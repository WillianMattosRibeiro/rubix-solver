import { useState, useEffect, useRef } from 'react'
import CameraFeed, { CameraFeedRef } from './components/CameraFeed'
import AlgorithmDisplay from './components/AlgorithmDisplay'

function App() {
  const [status, setStatus] = useState('Connecting to server...')
  const [moves, setMoves] = useState<string[]>([])
  const [currentMove, setCurrentMove] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [isError, setIsError] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isWsOpen, setIsWsOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const cameraRef = useRef<CameraFeedRef>(null)

  useEffect(() => {
    const connectWebSocket = () => {
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
        // Retry connection after 2 seconds
        setTimeout(connectWebSocket, 2000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        setIsWsOpen(false)
        setStatus('Waiting for backend to be available...')
        // Retry connection after 2 seconds
        setTimeout(connectWebSocket, 2000)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        Rubik's Cube Solver
      </h1>
      <div className={`mb-6 text-xl text-center ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
        {status}
      </div>
      <CameraFeed ref={cameraRef} ws={wsRef.current} wsOpen={isWsOpen} />
      <AlgorithmDisplay moves={moves} currentMove={currentMove} isError={isError} />
    </div>
  )
}

export default App