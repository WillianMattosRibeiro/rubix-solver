import React, { useEffect, useState } from 'react'

interface LoadingPageProps {
  onBackendReady: () => void
}

const MAX_RETRIES = 10
const RETRY_DELAY_MS = 5000

const LoadingPage = ({ onBackendReady }: LoadingPageProps) => {
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (retryCount >= MAX_RETRIES) {
      setError(true)
      return
    }

    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/health')
        if (response.ok) {
          onBackendReady()
        } else {
          throw new Error('Backend not ready')
        }
      } catch {
        setTimeout(() => setRetryCount(retryCount + 1), RETRY_DELAY_MS)
      }
    }

    checkBackend()
  }, [retryCount, onBackendReady])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white font-sans">
      <div className="mb-8">
        <svg
          className="animate-spin h-24 w-24 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth={2} fill="#F59E0B" />
          <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth={2} fill="#EF4444" />
          <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth={2} fill="#3B82F6" />
          <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth={2} fill="#10B981" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold mb-4">Rubik's Cube Solver</h1>
      {error ? (
        <p className="text-red-500">Unable to connect to backend after multiple attempts. Please refresh the page.</p>
      ) : (
        <p className="text-lg">Connecting to backend... (Attempt {retryCount + 1} of {MAX_RETRIES})</p>
      )}
    </div>
  )
}

export default LoadingPage
