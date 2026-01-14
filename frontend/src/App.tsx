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
  const wsRef = useRef<WebSocket | null>(null)
  const cameraRef = useRef<CameraFeedRef>(null)

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setStatus('Place the cube in front of the camera and click Capture Frame')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Received message:', data)
      if (data.status === 'calibrating') {
        setStatus('Calibrating colors...')
        setIsError(false)
      } else if (data.status === 'solving') {
        setStatus('Algorithm generated! Follow the steps to solve the cube.')
        setMoves(data.moves)
        setCurrentMove(data.current_move)
        setWrongMoves(0)
        setIsError(false)
      } else if (data.status === 'error') {
        setWrongMoves(prev => prev + 1)
        if (wrongMoves + 1 >= 3) {
          setStatus('Too many wrong moves. Click Capture Frame again for a new suggestion.')
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
      setStatus('Connection lost. Refresh the page.')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
      setStatus('Failed to connect to server. Make sure the backend is running.')
    }

    return () => {
      ws.close()
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
      <CameraFeed ref={cameraRef} ws={wsRef.current} />
      <button
        onClick={() => cameraRef.current?.capture()}
        disabled={!isConnected}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        Capture Frame
      </button>
      <AlgorithmDisplay moves={moves} currentMove={currentMove} isError={isError} />
    </div>
  )
}

export default App