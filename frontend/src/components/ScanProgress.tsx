import * as React from 'react'

interface ScanProgressProps {
  scannedFaces: { face: string; confirmed: boolean }[]
}

function ScanProgress({ scannedFaces }: ScanProgressProps) {
  return (
    <section className="w-full max-w-3xl mt-4">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">Scanning Progress</h2>
      <div className="flex space-x-4">
        {scannedFaces.map(({ face, confirmed }) => (
          <div
            key={face}
            className={`px-4 py-2 rounded cursor-default select-none border-2 ${confirmed ? 'border-green-500 bg-green-100 text-green-800' : 'border-gray-600 bg-gray-700 text-gray-300'}`}
            aria-label={`Face ${face} ${confirmed ? 'scanned and confirmed' : 'pending'}`}
            role="status"
          >
            {face.toUpperCase()}
          </div>
        ))}
      </div>
    </section>
  )
}

export default ScanProgress
