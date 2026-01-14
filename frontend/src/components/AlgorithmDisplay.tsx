interface AlgorithmDisplayProps {
  moves: string[]
  currentMove: number
}

const AlgorithmDisplay = ({ moves, currentMove }: AlgorithmDisplayProps) => {
  return (
    <div className="text-center">
      <h2 className="text-2xl mb-4">Algorithm</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {moves.map((move, index) => (
          <span
            key={index}
            className={`px-2 py-1 border rounded ${
              index === currentMove
                ? 'bg-green-600 text-white'
                : index < currentMove
                ? 'bg-gray-600 text-white'
                : 'bg-gray-800 text-white'
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