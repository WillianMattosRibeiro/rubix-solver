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

const calibrationColors = ['Y', 'W', 'R', 'G', 'B', 'O']

function Calibration({ ws, wsOpen, isCalibrating, calibrationMessage, detectedColor, expectedColor, onStartCalibration, onResetCalibration }: CalibrationProps) {

  const startCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'start_calibration' }))
      onStartCalibration()
    }
  }

  const resetCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'reset_calibration' }))
      onResetCalibration()
    }
  }

  const confirmCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'confirm_calibration' }))
    }
  }

  const selectCalibrationColor = (color: string) => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'select_calibration_color', selected_color: color }))
    }
  }

  if (!isCalibrating) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Calibration</h2>
        <div className="space-y-2">
          <button
            onClick={startCalibration}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white mr-2"
          >
            Start Calibration
          </button>
          <button
            onClick={resetCalibration}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Reset to Default
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">Calibration</h2>
      <p className="text-lg">{calibrationMessage}</p>
      <div>
        <p>Expected Color: {expectedColor}</p>
        <p>Detected Color: <span style={{ color: detectedColor }}>{detectedColor}</span></p>
        <button
          onClick={confirmCalibration}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
        >
          Confirm Detected Color
        </button>
        <select
          onChange={(e) => selectCalibrationColor(e.target.value)}
          className="ml-2 p-1 rounded bg-gray-700 text-white"
          defaultValue=""
        >
          <option value="" disabled>Select color manually</option>
          {calibrationColors.map(color => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
      </div>
    </section>
  )
}

export default Calibration
