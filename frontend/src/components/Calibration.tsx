import { useState } from 'react'

interface CalibrationProps {
  ws: WebSocket | null
  wsOpen: boolean
  isCalibrating: boolean
  calibrationMessage: string
  detectedColor: string
  expectedColor: string
  onStartCalibration: () => void
  onResetCalibration: () => void
}

function Calibration({ ws, wsOpen, isCalibrating, calibrationMessage, detectedColor, expectedColor, onStartCalibration, onResetCalibration }: CalibrationProps) {

  const startCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'start_calibration' }))
      onStartCalibration()
    }
  }

  const calibrateSpecificColor = (color: string) => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'calibrate_specific_color', color }))
      onStartCalibration()
    }
  }

  const resetCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'reset_calibration' }))
      onResetCalibration()
    }
  }

  const confirmCalibration = (selectedColor?: string) => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'confirm_calibration', selected_color: selectedColor }))
    }
  }

  const selectColor = (color: string) => {
    confirmCalibration(color)
  }

  // This would be called from App when WS message received
  // For now, assume App handles the WS messages and updates state

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">Calibration</h2>
      {!isCalibrating ? (
        <div className="space-y-2">
          <button
            onClick={startCalibration}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white mr-2"
          >
            Start Calibration
          </button>
          <button
            onClick={() => calibrateSpecificColor('Y')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Calibrate Yellow
          </button>
          <button
            onClick={() => calibrateSpecificColor('W')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Calibrate White
          </button>
          <button
            onClick={() => calibrateSpecificColor('R')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Calibrate Red
          </button>
          <button
            onClick={() => calibrateSpecificColor('G')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Calibrate Green
          </button>
          <button
            onClick={() => calibrateSpecificColor('B')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Calibrate Blue
          </button>
          <button
            onClick={() => calibrateSpecificColor('O')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Calibrate Orange
          </button>
          <button
            onClick={resetCalibration}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Reset to Default
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-lg">{calibrationMessage}</p>
          {detectedColor && (
            <div>
              <p>Detected: {detectedColor}, Expected: {expectedColor}</p>
              <button
                onClick={() => confirmCalibration()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
              >
                Confirm {detectedColor}
              </button>
              <div className="mt-2">
                <p>Select correct color:</p>
                {['Y', 'W', 'R', 'G', 'B', 'O'].map(color => (
                  <button
                    key={color}
                    onClick={() => selectColor(color)}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white mr-1"
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Calibration