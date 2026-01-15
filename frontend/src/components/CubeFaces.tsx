interface CubeFacesProps {
  faces: {[key: string]: string}
  confirmedFaces: {[key: string]: boolean}
  liveInputFace?: string | null
  liveInputColors?: string
  onConfirm: () => void
  onRescan: (faceName: string) => void
  onGetSolution: () => void
}

const colorMap = {
  R: 'bg-red-500',
  G: 'bg-green-500',
  B: 'bg-blue-500',
  O: 'bg-orange-500',
  Y: 'bg-yellow-500',
  W: 'bg-white'
}

const faceLabels = {
  Y: 'yellow',
  W: 'white',
  R: 'red',
  G: 'green',
  B: 'blue',
  O: 'orange'
}

const CubeFaces = ({ faces, confirmedFaces, onConfirm, onRescan, onGetSolution }: CubeFacesProps) => {
  const renderFace = (faceName: string, colors: string) => {
    const isConfirmed = confirmedFaces && confirmedFaces[faceName] ? true : false
    const faceColors = faces && faces[faceName] ? faces[faceName] : 'UUUUUUUUU'
    const label = faceLabels[faceName.toUpperCase()] || faceName
    return (
      <div key={faceName} className="mb-4">
        <h3 className="flex items-center justify-center text-center text-sm font-semibold mb-2 capitalize">
          {label}
          {!isConfirmed ? (
            <span className="ml-2 text-yellow-400" title="Pending">&#x23F3;</span> /* Hourglass pending */
          ) : (
            <span className="ml-2 text-green-400" title="Confirmed">&#x2714;</span> /* Check mark confirmed */
          )}
        </h3>
        <div className="grid grid-cols-3 gap-1 w-20 h-20 mx-auto">
          {faceColors.split('').map((color, index) => (
            <div
              key={index}
              className={`w-full h-full border border-gray-600 ${colorMap[color as keyof typeof colorMap] || 'bg-gray-500'}`}
            />
          ))}
        </div>
        <div className="flex justify-center mt-2 space-x-2">
          <button
            onClick={() => onConfirm(faceName)}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
          >
            Confirm
          </button>
          <button
            onClick={() => onRescan(faceName)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
          >
            Re-Scan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-center">Cube Faces</h2>
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(faces).map(([faceName, colors]) => renderFace(faceName, colors))}
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={onGetSolution}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Get the Solution
        </button>
      </div>
    </div>
  )
}

export default CubeFaces
