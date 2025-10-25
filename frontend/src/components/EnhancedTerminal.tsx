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

interface EnhancedTerminalProps {
  clearOnNewGeneration?: boolean
  currentVideoId?: number
}

export default function EnhancedTerminal({ clearOnNewGeneration = true, currentVideoId }: EnhancedTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [lastVideoId, setLastVideoId] = useState<number | undefined>(currentVideoId)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const highlightsRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear logs when a new video generation starts
  useEffect(() => {
    if (clearOnNewGeneration && currentVideoId !== undefined) {
      if (lastVideoId === undefined) {
        // First time setting video ID
        setLastVideoId(currentVideoId)
      } else if (currentVideoId !== lastVideoId) {
        console.log('🧹 Clearing terminal for new generation:', lastVideoId, '->', currentVideoId)
        
        // 🧹 AGGRESSIVE clearing of ALL terminal data
        setLogs([])
        setHighlights([])
        setLastVideoId(currentVideoId)
        setIsUserScrolling(false) // Reset scroll state
        
        // Reset connection state and force reconnection
        setConnectionAttempts(0)
        setIsConnected(false)
        
        // Clear ALL cached data to force completely fresh start
        if (typeof window !== 'undefined') {
          // Clear all session storage keys
          sessionStorage.clear()
          
          // Also clear any specific keys that might have been missed
          sessionStorage.removeItem('lastLogTimestamp')
          sessionStorage.removeItem('terminalLogs')
          sessionStorage.removeItem('terminalHighlights')
          sessionStorage.removeItem('currentProject')
          
          // Force clear browser cache for API responses
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name))
            })
          }
        }
        
        console.log('🧹 AGGRESSIVELY cleared ALL terminal data for video:', currentVideoId)
      }
    }
  }, [currentVideoId, lastVideoId, clearOnNewGeneration])

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
            const response = await fetch('/api/recent-logs?limit=200', {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            })
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const data = await response.json()
            if (data.success && (data.logs || (data.data && data.data.logs))) {
              const logs = data.logs || data.data.logs
                // Process new logs and filter out noise
                const newLogs = logs.filter((logData: any) => {
                  // Filter by timestamp
                  if (logData.timestamp <= lastLogTimestamp) return false
                  
                  // Filter out noisy messages
                  const message = logData.log || ''
                  const isNoise = 
                    message.includes('GET /api/') ||
                    message.includes('HTTP/1.1" 200') ||
                    message.includes('Not found in database yet') ||
                    message.includes('No database logs found') ||
                    message.includes('Memory logs count: 0') ||
                    message.includes('Returning 0 unique logs') ||
                    message.includes('INFO:app:📊 Video') ||
                    message.includes('INFO:     ') ||
                    message.includes('Waiting for application') ||
                    message.includes('Application startup') ||
                    message.includes('Started server process') ||
                    message.includes('Finished server process') ||
                    message.includes('Shutting down') ||
                    message.includes('Application shutdown') ||
                    message.includes('StatReload detected') ||
                    message.includes('Reloading...') ||
                    message.includes('Server process') ||
                    message.includes('limit=100') ||
                    message.includes('limit=500') ||
                    message.includes('INFO:     13.220.148.244') ||
                    message.includes('INFO:     34.207.234.104') ||
                    message.includes('INFO:     98.92.85.211')
                  
                  return !isNoise
                })
                
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
                      // Keep only last 200 logs (rolling deletion)
                      return newLogs.slice(-200)
                    })
                    
                    // Check for important events (actual analysis results and meaningful progress)
                    const message = logData.log || ''
                    let highlight: Highlight | null = null
                    
                    // Only highlight truly important events
                    if (message.includes('Starting iteration') && message.includes('/')) {
                      highlight = { id: logEntry.id, message: `🔄 ${message}`, type: 'iteration', timestamp: logEntry.timestamp }
                    } else if (message.includes('Quality Score:') && message.includes('%')) {
                      highlight = { id: logEntry.id, message: `📊 ${message}`, type: 'info', timestamp: logEntry.timestamp }
                    } else if (message.includes('SUCCESS') || message.includes('Video passes as real')) {
                      highlight = { id: logEntry.id, message: `✅ ${message}`, type: 'success', timestamp: logEntry.timestamp }
                    } else if (message.includes('AI indicators found') || message.includes('artifacts detected')) {
                      highlight = { id: logEntry.id, message: `⚠️ ${message}`, type: 'warning', timestamp: logEntry.timestamp }
                    } else if (message.includes('Pegasus content analysis') && !message.includes('failed')) {
                      highlight = { id: logEntry.id, message: `🔍 ${message}`, type: 'info', timestamp: logEntry.timestamp }
                    } else if (message.includes('Enhanced prompt generated')) {
                      highlight = { id: logEntry.id, message: `🧠 ${message}`, type: 'info', timestamp: logEntry.timestamp }
                    } else if (message.includes('Target confidence reached') || message.includes('Peak quality achieved')) {
                      highlight = { id: logEntry.id, message: `🎯 ${message}`, type: 'success', timestamp: logEntry.timestamp }
                    } else if (message.includes('Indexing status:')) {
                      highlight = { id: logEntry.id, message: `⏳ ${message}`, type: 'info', timestamp: logEntry.timestamp }
                    }
                    
                    if (highlight) {
                      setHighlights(prev => {
                        // Check for duplicates based on message content (not ID)
                        const isDuplicate = prev.some(h => 
                          h.message === highlight.message || 
                          (h.message.includes('Starting iteration') && highlight.message.includes('Starting iteration'))
                        )
                        
                        if (isDuplicate) {
                          return prev // Don't add duplicate
                        }
                        
                        return [...prev, highlight].slice(-50)
                      })
                    }
                  })
                }
                setIsConnected(true)
                setConnectionAttempts(0)
              } else {
                throw new Error('Invalid response format or no logs available')
              }
          } catch (error) {
            console.error('Log polling error:', error)
            setIsConnected(false)
            setConnectionAttempts(prev => {
              const newAttempts = prev + 1
              // Only log every 5th attempt to reduce noise
              if (newAttempts % 5 === 0) {
                console.warn(`Log polling failed ${newAttempts} times, continuing to retry...`)
              }
              return newAttempts
            })
            // Don't stop polling on errors - keep trying
          }
        }
        
        // Poll every 5 seconds to reduce connection errors
        const pollInterval = setInterval(pollLogs, 5000)
        
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

  // Smart auto-scroll: only scroll if user isn't manually scrolling
  useEffect(() => {
    if (!isUserScrolling && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs, isUserScrolling])

  // Auto-scroll highlights to bottom (always, since it's a smaller area)
  useEffect(() => {
    if (highlightsRef.current) {
      highlightsRef.current.scrollTop = highlightsRef.current.scrollHeight
    }
  }, [highlights])

  // Handle scroll detection
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10 // 10px tolerance
    
    if (!isAtBottom) {
      setIsUserScrolling(true)
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      // Resume auto-scroll after 3 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false)
      }, 3000)
    } else {
      setIsUserScrolling(false)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }

  // Format timestamp to user's local timezone
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString(undefined, { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })
    } catch {
      return new Date().toLocaleTimeString(undefined, { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }

  // Filter out jargon and clean message
  const cleanMessage = (msg: string) => {
    // Remove excessive Unicode escapes
    let cleaned = msg.replace(/\\u[\dA-F]{4}/gi, '')
    
    // Remove repetitive API calls and debug noise
    if (
      cleaned.includes('GET /api/') ||
      cleaned.includes('HTTP/1.1" 200') ||
      cleaned.includes('Not found in database yet') ||
      cleaned.includes('No database logs found') ||
      cleaned.includes('Memory logs count: 0') ||
      cleaned.includes('Returning 0 unique logs') ||
      cleaned.includes('INFO:app:📊 Video') ||
      cleaned.includes('INFO:     ') ||
      cleaned.includes('Waiting for application') ||
      cleaned.includes('Application startup') ||
      cleaned.includes('Started server process') ||
      cleaned.includes('Finished server process') ||
      cleaned.includes('Shutting down') ||
      cleaned.includes('Application shutdown') ||
      cleaned.includes('StatReload detected') ||
      cleaned.includes('Reloading...') ||
      cleaned.includes('Server process') ||
      cleaned.includes('limit=100') ||
      cleaned.includes('limit=500') ||
      cleaned.includes('INFO:     13.220.148.244') ||
      cleaned.includes('INFO:     34.207.234.104') ||
      cleaned.includes('INFO:     98.92.85.211')
    ) {
      return null
    }
    
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
              {isConnected ? 'Connected' : connectionAttempts > 10 ? `Retrying... (${connectionAttempts})` : `Reconnecting... (${connectionAttempts})`}
            </span>
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
          style={{ maxHeight: '400px' }}
          onScroll={handleScroll}
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
