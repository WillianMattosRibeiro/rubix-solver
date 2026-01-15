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
  const [calibrationStep, setCalibrationStep] = useState(0)
  const [manualSetMode, setManualSetMode] = useState(false)

  const startCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'start_calibration' }))
      onStartCalibration()
      setCalibrationStep(0)
      setManualSetMode(false)
    }
  }

  const resetCalibration = () => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'reset_calibration' }))
      onResetCalibration()
      setCalibrationStep(0)
      setManualSetMode(false)
    }
  }

  const confirmCalibration = (selectedColor?: string) => {
    if (ws && wsOpen) {
      ws.send(JSON.stringify({ type: 'confirm_calibration', selected_color: selectedColor || calibrationColors[calibrationStep] }))
      setCalibrationStep(prev => Math.min(prev + 1, calibrationColors.length))
      setManualSetMode(false)
    }
  }

  const handleSetManually = () => {
    setManualSetMode(true)
  }

  const handleManualColorSelect = (color: string) => {
    confirmCalibration(color)
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
            {calibrationStep > 0 ? 'Recalibrate' : 'Start Calibration'}
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

  if (calibrationStep >= calibrationColors.length) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Calibration</h2>
        {/* Removed text success, replaced with notification in App.tsx */}
        <button
          onClick={resetCalibration}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          Reset to Default
        </button>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">Calibration</h2>
      <p className="text-lg">{calibrationMessage}</p>
      <div>
        <p>Current Color: {calibrationColors[calibrationStep]}</p>
        <button
          onClick={() => confirmCalibration(calibrationColors[calibrationStep])}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
        >
          Confirm {calibrationColors[calibrationStep]}
        </button>
        <button
          onClick={handleSetManually}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white"
        >
          Set Manually
        </button>
        {manualSetMode && (
          <select
            onChange={(e) => handleManualColorSelect(e.target.value)}
            className="ml-2 p-1 rounded bg-gray-700 text-white"
            defaultValue=""
          >
            <option value="" disabled>Select color</option>
            {calibrationColors.map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        )}
      </div>
    </section>
  )
}

export default Calibration
