import { useVideoDevices } from '../hooks/useVideoDevices'

interface VideoInputDropdownProps {
  selectedDeviceId: string
  onDeviceChange: (deviceId: string) => void
}

const VideoInputDropdown = ({ selectedDeviceId, onDeviceChange }: VideoInputDropdownProps) => {
  const { devices, loading, error } = useVideoDevices()

  if (loading) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Video Input</label>
        <div className="text-gray-400">Loading cameras...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Video Input</label>
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <label htmlFor="video-input" className="block text-sm font-medium text-gray-300 mb-2">
        Video Input
      </label>
      <select
        id="video-input"
        value={selectedDeviceId}
        onChange={(e) => onDeviceChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default VideoInputDropdown