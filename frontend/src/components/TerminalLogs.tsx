'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface TerminalLogsProps {
  className?: string
}

export default function TerminalLogs({ className = '' }: TerminalLogsProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connectToLogs = () => {
      try {
        eventSource = new EventSource('/api/logs/stream')
        
        eventSource.onopen = () => {
          console.log('Connected to log stream')
          setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.log) {
              setLogs(prev => {
                const newLogs = [...prev, data.log]
                // Keep only last 100 logs to prevent memory issues
                return newLogs.slice(-100)
              })
            }
          } catch (error) {
            console.error('Error parsing log data:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('Log stream error:', error)
          setIsConnected(false)
          // Try to reconnect after 3 seconds
          setTimeout(() => {
            if (eventSource) {
              eventSource.close()
            }
            connectToLogs()
          }, 3000)
        }
      } catch (error) {
        console.error('Failed to connect to log stream:', error)
        setIsConnected(false)
      }
    }

    connectToLogs()

    return () => {
      if (eventSource) {
        eventSource.close()
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

  const formatLogLine = (log: string) => {
    const isSuccess = log.includes('✅') || log.includes('SUCCESS')
    const isError = log.includes('❌') || log.includes('ERROR')
    const isWarning = log.includes('⚠️') || log.includes('WARNING')
    const isInfo = log.includes('ℹ️') || log.includes('INFO')
    const isMarengo = log.includes('MarenGO') || log.includes('🔍')
    const isPegasus = log.includes('Pegasus') || log.includes('🧠')
    const isScore = log.includes('Score') || log.includes('📊') || log.includes('🤖')
    
    let textColor = 'text-gray-300'
    let icon = ''
    
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
    }
    
    return { textColor, icon }
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
              {logs.slice(-50).map((log, index) => {
                const { textColor, icon } = formatLogLine(log)
                return (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className={`${textColor} flex-1`}>
                      {icon && <span className="mr-1">{icon}</span>}
                      {log}
                    </span>
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
