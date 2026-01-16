interface AlgorithmDisplayProps {
  moves: string[]
  currentMove: number
}

const AlgorithmDisplay = ({ moves, currentMove }: AlgorithmDisplayProps) => {
  if (moves.length === 0) return null

  return (
    <div className="mt-8 text-center">
      <h2 className="text-3xl font-semibold mb-6 text-gray-200">Solution Steps</h2>
      <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
        {moves.map((move, index) => (
          <span
            key={index}
            className={`px-4 py-2 rounded-lg font-mono text-lg transition-all duration-200 ${
              index === currentMove
                ? 'bg-green-500 text-white shadow-green-500/50 shadow-lg'
                : index < currentMove
                ? 'bg-gray-600 text-gray-300'
                : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
            }`}
          >
            {move}
          </span>
        ))}
      </div>
    </div>
  )
}

export default AlgorithmDisplay