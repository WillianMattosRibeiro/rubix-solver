import { useState } from 'react'
import CameraFeed from './components/CameraFeed'
import AlgorithmDisplay from './components/AlgorithmDisplay'

function App() {
  const [status, setStatus] = useState('Show whole cube')
  const [moves, setMoves] = useState<string[]>([])
  const [currentMove, setCurrentMove] = useState(0)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Rubik's Cube Solver</h1>
      <div className="mb-4 text-xl">{status}</div>
      <CameraFeed />
      <AlgorithmDisplay moves={moves} currentMove={currentMove} />
    </div>
  )
}

export default App