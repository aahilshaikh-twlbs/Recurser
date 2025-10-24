'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface TerminalLogsProps {
  className?: string
}

interface LogEntry {
  id: string
  message: string
  timestamp: string
  videoId?: number
  source?: string
}

export default function TerminalLogs({ className = '' }: TerminalLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectAttempts = 0
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connectToLogs = () => {
      try {
        // Always use absolute URL to ensure connection
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        eventSource = new EventSource(`${baseUrl}/api/logs/stream`)
        
        eventSource.onopen = () => {
          console.log('✅ Connected to log stream')
          setIsConnected(true)
          reconnectAttempts = 0 // Reset attempts on successful connection
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.log) {
              setLogs(prev => {
                const logEntry = {
                  id: `${data.timestamp}-${Math.random()}`,
                  message: data.log,
                  timestamp: data.timestamp,
                  videoId: data.video_id,
                  source: data.source || 'video'
                }
                const newLogs = [...prev, logEntry]
                // Keep only last 200 logs to prevent memory issues
                return newLogs.slice(-200)
              })
            }
          } catch (error) {
            console.error('Error parsing log data:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('⚠️ Log stream disconnected, reconnecting...', error)
          setIsConnected(false)
          
          if (eventSource) {
            eventSource.close()
          }
          
          // Progressive backoff: 1s, 2s, 3s, then stay at 3s
          const delay = Math.min((reconnectAttempts + 1) * 1000, 3000)
          reconnectAttempts++
          
          reconnectTimeout = setTimeout(() => {
            console.log(`🔄 Reconnect attempt ${reconnectAttempts}...`)
            connectToLogs()
          }, delay)
        }
      } catch (error) {
        console.error('Failed to connect to log stream:', error)
        setIsConnected(false)
        
        // Retry connection after delay
        reconnectTimeout = setTimeout(() => {
          connectToLogs()
        }, 2000)
      }
    }

    // Start connection immediately
    connectToLogs()

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const clearLogs = () => {
    setLogs([])
  }

  const formatLogLine = (log: LogEntry) => {
    const message = log.message
    const source = log.source || 'unknown'
    const isSuccess = message.includes('✅') || message.includes('SUCCESS')
    const isError = message.includes('❌') || message.includes('ERROR')
    const isWarning = message.includes('⚠️') || message.includes('WARNING')
    const isInfo = message.includes('ℹ️') || message.includes('INFO')
    const isMarengo = message.includes('MarenGO') || message.includes('🔍')
    const isPegasus = message.includes('Pegasus') || message.includes('🧠')
    const isScore = message.includes('Score') || message.includes('📊') || message.includes('🤖')
    const isHeartbeat = source === 'heartbeat'
    const isBackendTerminal = source === 'backend_terminal'
    const isVideoProcessing = source === 'video_processing'
    
    let textColor = 'text-gray-300'
    let icon = ''
    let sourceColor = 'text-gray-500'
    
    if (isSuccess) {
      textColor = 'text-green-400'
      icon = '✅'
    } else if (isError) {
      textColor = 'text-red-400'
      icon = '❌'
    } else if (isWarning) {
      textColor = 'text-yellow-400'
      icon = '⚠️'
    } else if (isMarengo) {
      textColor = 'text-blue-400'
      icon = '🔍'
    } else if (isPegasus) {
      textColor = 'text-purple-400'
      icon = '🧠'
    } else if (isScore) {
      textColor = 'text-indigo-400'
      icon = '📊'
    } else if (isHeartbeat) {
      textColor = 'text-cyan-400'
      icon = '💓'
    } else if (isBackendTerminal) {
      textColor = 'text-white'
      sourceColor = 'text-blue-400'
    } else if (isVideoProcessing) {
      textColor = 'text-green-300'
      sourceColor = 'text-green-400'
    }
    
    return { textColor, icon, sourceColor }
  }

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-gray-300 text-sm font-medium">Backend Terminal</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={logContainerRef}
        className={`font-mono text-sm overflow-y-auto ${
          isExpanded ? 'h-96' : 'h-48'
        }`}
      >
        <div className="p-3">
          <div className="text-green-400 text-xs mb-2 border-b border-gray-700 pb-1">
            ~/recurser-backend$ tail -f server.log
          </div>
          {logs.length > 0 ? (
            <div className="space-y-1">
              {logs.slice(-50).map((log) => {
                const { textColor, icon, sourceColor } = formatLogLine(log)
                return (
                  <div key={log.id} className="flex items-start space-x-2">
                    <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className={`${textColor} flex-1`}>
                      {icon && <span className="mr-1">{icon}</span>}
                      {log.message}
                    </span>
                    <div className="flex items-center space-x-1 text-xs">
                      {log.videoId && (
                        <span className="text-gray-500">
                          [V{log.videoId}]
                        </span>
                      )}
                      <span className={`${sourceColor} font-mono`}>
                        [{log.source || 'unknown'}]
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              {isConnected ? 'Waiting for logs...' : 'Connecting to log stream...'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
