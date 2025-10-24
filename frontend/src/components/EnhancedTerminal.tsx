'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react'

interface LogEntry {
  id: string
  message: string
  timestamp: string
  type?: string
  source?: string
  videoId?: string | number
}

interface Highlight {
  id: string
  message: string
  type: 'success' | 'warning' | 'info' | 'iteration'
  timestamp: string
}

export default function EnhancedTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const terminalRef = useRef<HTMLDivElement>(null)
  const highlightsRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null
    
    const connectToLogs = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }

        // Use polling approach for better reliability through Vercel
        console.log('🔌 Starting log polling...')
        
        let lastLogTimestamp = ''
        const pollLogs = async () => {
          try {
            const response = await fetch('/api/recent-logs?limit=100')
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logs) {
                // Process new logs
                const newLogs = data.logs.filter((logData: any) => 
                  logData.timestamp > lastLogTimestamp
                )
                
                if (newLogs.length > 0) {
                  // Update last timestamp
                  const timestamps = newLogs.map((l: any) => l.timestamp).filter(Boolean)
                  if (timestamps.length > 0) {
                    lastLogTimestamp = timestamps.sort().pop() || lastLogTimestamp
                  }
                  
                  // Add logs to display
                  newLogs.forEach((logData: any) => {
                    const logEntry: LogEntry = {
                      id: `${logData.timestamp}-${Math.random()}`,
                      message: logData.log || '',
                      timestamp: logData.timestamp,
                      type: logData.type,
                      source: logData.source,
                      videoId: logData.video_id
                    }
                    
                    setLogs(prev => {
                      const newLogs = [...prev, logEntry]
                      return newLogs.slice(-500)
                    })
                    
                    // Check for highlights
                    const message = logData.log || ''
                    let highlight: Highlight | null = null
                    
                    if (message.includes('Iteration') || message.includes('iteration')) {
                      highlight = { id: logEntry.id, message: `🔄 ${message}`, type: 'iteration', timestamp: logEntry.timestamp }
                    } else if (message.includes('SUCCESS') || message.includes('completed') || message.includes('✅')) {
                      highlight = { id: logEntry.id, message: `✅ ${message}`, type: 'success', timestamp: logEntry.timestamp }
                    } else if (message.includes('artifact') || message.includes('AI indicator')) {
                      highlight = { id: logEntry.id, message: `⚠️ ${message}`, type: 'warning', timestamp: logEntry.timestamp }
                    } else if (message.includes('Quality Score')) {
                      highlight = { id: logEntry.id, message: `📊 ${message}`, type: 'info', timestamp: logEntry.timestamp }
                    }
                    
                    if (highlight) {
                      setHighlights(prev => [...prev, highlight].slice(-20))
                    }
                  })
                }
                setIsConnected(true)
                setConnectionAttempts(0)
              }
            }
          } catch (error) {
            console.error('Log polling error:', error)
            setIsConnected(false)
            setConnectionAttempts(prev => prev + 1)
          }
        }
        
        // Poll every 2 seconds
        const pollInterval = setInterval(pollLogs, 2000)
        
        // Initial poll
        pollLogs()
        
        // Store interval for cleanup
        eventSourceRef.current = { close: () => clearInterval(pollInterval) } as any
        
      } catch (error) {
        console.error('Failed to connect:', error)
        setIsConnected(false)
      }
    }

    // Connect immediately
    connectToLogs()

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  // Auto-scroll highlights
  useEffect(() => {
    if (highlightsRef.current) {
      highlightsRef.current.scrollTop = highlightsRef.current.scrollHeight
    }
  }, [highlights])

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  // Filter out jargon and clean message
  const cleanMessage = (msg: string) => {
    // Remove excessive Unicode escapes
    let cleaned = msg.replace(/\\u[\dA-F]{4}/gi, '')
    // Remove DEBUG messages unless important
    if (cleaned.includes('DEBUG') && !cleaned.includes('Retrieved')) {
      return null
    }
    // Remove HTTP noise
    if (cleaned.includes('HTTP/1.1') || cleaned.includes('HTTP Request')) {
      return null
    }
    // Remove heartbeat messages
    if (cleaned === '💓' || cleaned.includes('Terminal active')) {
      return null
    }
    return cleaned
  }

  return (
    <div className="flex h-full">
      {/* Main Terminal */}
      <div className="flex-1 flex flex-col bg-gray-900 rounded-l-lg">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-tl-lg border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-sm font-mono text-gray-300">Live Backend Terminal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : `Reconnecting... (${connectionAttempts})`}
            </span>
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
          style={{ maxHeight: '400px' }}
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Waiting for logs...
            </div>
          ) : (
            logs.map((log) => {
              const cleaned = cleanMessage(log.message)
              if (!cleaned) return null
              
              return (
                <div key={log.id} className="flex space-x-2 hover:bg-gray-800/50 px-1 py-0.5 rounded">
                  <span className="text-gray-500 flex-shrink-0">
                    [{formatTime(log.timestamp)}]
                  </span>
                  <span className={`
                    ${log.source === 'error' ? 'text-red-400' : ''}
                    ${log.source === 'processing' ? 'text-blue-400' : ''}
                    ${cleaned.includes('SUCCESS') ? 'text-green-400 font-bold' : ''}
                    ${cleaned.includes('ERROR') || cleaned.includes('Failed') ? 'text-red-400' : ''}
                    ${cleaned.includes('WARNING') ? 'text-yellow-400' : ''}
                    ${cleaned.includes('INFO') ? 'text-cyan-400' : ''}
                    ${!log.source ? 'text-gray-300' : 'text-gray-400'}
                  `}>
                    {cleaned}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Highlights Sidebar */}
      <div className="w-80 flex flex-col bg-gray-800 rounded-r-lg border-l border-gray-700">
        {/* Highlights Header */}
        <div className="px-4 py-2 bg-gray-700 rounded-tr-lg border-b border-gray-600">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-200">Important Events</span>
          </div>
        </div>

        {/* Highlights Content */}
        <div 
          ref={highlightsRef}
          className="flex-1 overflow-y-auto p-3 space-y-2"
          style={{ maxHeight: '400px' }}
        >
          {highlights.length === 0 ? (
            <div className="text-gray-500 text-xs text-center py-4">
              Important events will appear here
            </div>
          ) : (
            highlights.map((highlight) => (
              <div 
                key={highlight.id}
                className={`
                  p-2 rounded-lg text-xs border
                  ${highlight.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : ''}
                  ${highlight.type === 'warning' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300' : ''}
                  ${highlight.type === 'info' ? 'bg-blue-900/30 border-blue-700 text-blue-300' : ''}
                  ${highlight.type === 'iteration' ? 'bg-purple-900/30 border-purple-700 text-purple-300' : ''}
                `}
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {highlight.type === 'success' && <CheckCircle className="w-3 h-3" />}
                    {highlight.type === 'warning' && <AlertCircle className="w-3 h-3" />}
                    {highlight.type === 'info' && <Info className="w-3 h-3" />}
                    {highlight.type === 'iteration' && <Zap className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-0.5">
                      {highlight.message.slice(0, 100)}
                      {highlight.message.length > 100 ? '...' : ''}
                    </div>
                    <div className="text-gray-500 text-[10px]">
                      {formatTime(highlight.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
