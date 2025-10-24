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

        // Create new EventSource connection with proper headers
        const streamUrl = '/api/logs/stream'
        console.log('🔌 Connecting to log stream:', streamUrl)
        eventSourceRef.current = new EventSource(streamUrl, {
          withCredentials: false
        })
        
        eventSourceRef.current.onopen = () => {
          console.log('✅ Terminal connected')
          setIsConnected(true)
          setConnectionAttempts(0)
        }

        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // Skip heartbeats in main terminal
            if (data.type === 'ping') return
            
            // Create log entry
            const logEntry: LogEntry = {
              id: `${Date.now()}-${Math.random()}`,
              message: data.log || '',
              timestamp: data.timestamp || new Date().toISOString(),
              type: data.type,
              source: data.source,
              videoId: data.video_id
            }
            
            // Add to main terminal
            setLogs(prev => {
              const newLogs = [...prev, logEntry]
              // Keep only last 500 logs
              return newLogs.slice(-500)
            })
            
            // Check for important events to highlight
            const message = data.log || ''
            let highlight: Highlight | null = null
            
            // Detect iterations
            if (message.includes('Iteration') || message.includes('iteration')) {
              highlight = {
                id: logEntry.id,
                message: `🔄 ${message}`,
                type: 'iteration',
                timestamp: logEntry.timestamp
              }
            }
            // Detect success
            else if (message.includes('SUCCESS') || message.includes('completed') || message.includes('✅')) {
              highlight = {
                id: logEntry.id,
                message: `✅ ${message}`,
                type: 'success',
                timestamp: logEntry.timestamp
              }
            }
            // Detect AI artifacts found
            else if (message.includes('artifact') || message.includes('AI indicator') || message.includes('detected')) {
              highlight = {
                id: logEntry.id,
                message: `⚠️ ${message}`,
                type: 'warning',
                timestamp: logEntry.timestamp
              }
            }
            // Detect quality scores
            else if (message.includes('Quality Score') || message.includes('quality score')) {
              highlight = {
                id: logEntry.id,
                message: `📊 ${message}`,
                type: 'info',
                timestamp: logEntry.timestamp
              }
            }
            // Detect video generation
            else if (message.includes('Generating') || message.includes('generating video')) {
              highlight = {
                id: logEntry.id,
                message: `🎬 ${message}`,
                type: 'info',
                timestamp: logEntry.timestamp
              }
            }
            
            if (highlight) {
              setHighlights(prev => {
                const newHighlights = [...prev, highlight]
                // Keep only last 20 highlights
                return newHighlights.slice(-20)
              })
            }
            
          } catch (error) {
            console.error('Error parsing log:', error)
          }
        }

        eventSourceRef.current.onerror = (event) => {
          console.warn('⚠️ Terminal disconnected', event)
          setIsConnected(false)
          
          // Reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000)
          setConnectionAttempts(prev => prev + 1)
          
          console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${connectionAttempts + 1})...`)
          reconnectTimeout = setTimeout(() => {
            console.log(`🔄 Reconnecting (attempt ${connectionAttempts + 1})...`)
            connectToLogs()
          }, delay)
        }
        
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
