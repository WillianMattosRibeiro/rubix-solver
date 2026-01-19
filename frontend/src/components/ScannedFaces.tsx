import React from 'react'

interface ScannedFace {
  face: string
  colors: string
  confirmed: boolean
}

interface ScannedFacesProps {
  scannedFaces: ScannedFace[]
  onConfirm: (face: string) => void
  onRescan: (face: string) => void
}

const colorMap: Record<string, string> = {
  Y: '#B4A800',
  W: '#C0C0C0',
  R: '#D32F2F',
  G: '#388E3C',
  B: '#1976D2',
  O: '#F57C00',
  U: '#00000000' // Unknown/transparent
}

function ScannedFaces({ scannedFaces, onConfirm, onRescan }: ScannedFacesProps) {

  return (
    <section className="w-full max-w-3xl">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">Scanned Faces</h2>
      <div className="grid grid-cols-3 gap-6">
        {scannedFaces.map(({ face, colors, confirmed }) => (
          <div key={face} className="border border-gray-600 rounded p-2 bg-gray-800">
            <h3 className="text-lg font-semibold mb-2">Face {face.toUpperCase()}</h3>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {colors.split('').map((colorChar, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded border border-gray-700"
                  style={{ backgroundColor: colorMap[colorChar] || 'transparent' }}
                />
              ))}
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => onRescan(face)}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-sm"
              >
                Rescan
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ScannedFaces
