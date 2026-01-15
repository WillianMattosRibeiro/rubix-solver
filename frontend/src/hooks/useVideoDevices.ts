import { useState, useEffect } from 'react'

export interface VideoDevice {
  deviceId: string
  label: string
}

export const useVideoDevices = () => {
  const [devices, setDevices] = useState<VideoDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        // Request permission by calling getUserMedia
        await navigator.mediaDevices.getUserMedia({ video: true })
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = deviceList
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 8)}`
          }))
        setDevices(videoDevices)
        setLoading(false)
      } catch (err) {
        console.error('Error enumerating devices:', err)
        setError('Failed to access camera devices. Please check permissions.')
        setLoading(false)
      }
    }

    enumerateDevices()
  }, [])

  return { devices, loading, error }
}