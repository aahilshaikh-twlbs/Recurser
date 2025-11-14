'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import VideoPlayerEnhanced from './VideoPlayerEnhanced'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Target, 
  BarChart3,
  Download,
  Eye
} from 'lucide-react'
import { API_CONFIG, apiRequest } from '@/lib/config'
import EnhancedTerminal from './EnhancedTerminal'

interface ProjectStatusProps {
  project: any
}

export default function ProjectStatus({ project: initialProject }: ProjectStatusProps) {
  const [project, setProject] = useState(initialProject)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState(true)

  // Persist state to sessionStorage for reload handling
  useEffect(() => {
    if (project?.video_id) {
      // Check if this is a different video than what's stored
      const stored = sessionStorage.getItem('currentProject')
      if (stored) {
        try {
          const storedProject = JSON.parse(stored)
          if (storedProject.video_id !== project.video_id) {
            console.log('🧹 New video detected, clearing old project data')
            sessionStorage.removeItem('currentProject')
          }
        } catch (e) {
          console.warn('Error parsing stored project:', e)
        }
      }
      
      sessionStorage.setItem('currentProject', JSON.stringify(project))
    }
  }, [project])

  // Recovery mechanism for page reloads
  useEffect(() => {
    const savedProject = sessionStorage.getItem('currentProject')
    if (savedProject && !project?.video_id) {
      try {
        const parsedProject = JSON.parse(savedProject)
        setProject(parsedProject)
        // Resume polling if not completed
        if (parsedProject.status !== 'completed' && parsedProject.status !== 'failed') {
          setIsPolling(true)
        }
      } catch (error) {
        console.error('Failed to recover project state:', error)
      }
    }
    
    // If no project but we have a video ID in URL, try to recover
    if (!project?.video_id && !savedProject) {
      const urlParams = new URLSearchParams(window.location.search)
      const videoId = urlParams.get('video_id')
      if (videoId) {
        console.log('Recovering project from URL video_id:', videoId)
        setProject({
          id: parseInt(videoId),
          video_id: parseInt(videoId),
          status: 'pending',
          iteration_count: 0,
          max_iterations: 3 // Default to 3, will be updated from server response
        })
        setIsPolling(true)
      }
    }
  }, [])

  // Test logs endpoint
  useEffect(() => {
    const testLogs = async () => {
      try {
        console.log('Testing logs endpoint...')
        const response = await apiRequest('/api/test-logs')
        const result = await response.json()
        console.log('Test logs response:', result)
      } catch (error) {
        console.error('Test logs failed:', error)
      }
    }
    testLogs()
  }, [])

  // Poll for status updates
  useEffect(() => {
    if (!project?.video_id || !isPolling) return

    let pollCount = 0
    const maxPollAttempts = 3
    let disconnectedBufferTimeout: NodeJS.Timeout | null = null

    const pollStatus = async () => {
      try {
        pollCount++
        
        console.log('Polling for video ID:', project.video_id)
        
        // Fetch status
        const response = await apiRequest(API_CONFIG.endpoints.videoStatus(project.video_id))
        const result = await response.json()
        
        if (result.success && result.data) {
          setProject(result.data)
          setLastUpdateTime(new Date())
          setIsConnected(true)
          pollCount = 0 // Reset on successful poll
          
          // Clear any pending disconnected state
          if (disconnectedBufferTimeout) {
            clearTimeout(disconnectedBufferTimeout)
            disconnectedBufferTimeout = null
          }
          
          // Stop polling if completed or failed, BUT keep polling if completed with 0% confidence (might still be updating)
          if (result.data.status === 'failed') {
            setIsPolling(false)
          } else if (result.data.status === 'completed') {
            // Only stop polling if we have a meaningful confidence score (> 0) or after a reasonable time
            const hasConfidence = result.data.final_confidence > 0 || result.data.current_confidence > 0
            if (hasConfidence) {
              setIsPolling(false)
            }
            // Otherwise keep polling for up to 2 more minutes to catch the confidence update
          }
        } else {
          throw new Error('Invalid response format')
        }
        
        // Fetch logs
        const logsResponse = await apiRequest(API_CONFIG.endpoints.videoLogs(project.video_id))
        const logsResult = await logsResponse.json()

        console.log('Logs response:', logsResult)
        if (logsResult.success && logsResult.data) {
          console.log('Setting logs:', logsResult.data.logs)
          setLogs(logsResult.data.logs || [])
        } else {
          console.log('No logs data in response')
        }
      } catch (error) {
        console.error('Error polling status:', error)
        
        // Only show disconnected after multiple failed attempts AND add a buffer delay
        if (pollCount >= maxPollAttempts) {
          // Add 2 second buffer before showing disconnected status
          if (disconnectedBufferTimeout) {
            clearTimeout(disconnectedBufferTimeout)
          }
          disconnectedBufferTimeout = setTimeout(() => {
            setIsConnected(false)
          }, 2000)
        }
      }
    }

    // Initial poll
    pollStatus()

    // Set up interval for polling - more frequent for better responsiveness
    const interval = setInterval(pollStatus, 1000) // Poll every 1 second for faster video updates

    return () => {
      clearInterval(interval)
      if (disconnectedBufferTimeout) {
        clearTimeout(disconnectedBufferTimeout)
      }
    }
  }, [project?.video_id, isPolling])

  const getStatusMessage = () => {
    if (!project) return "Loading..."
    
    const status = (project.status || '').toLowerCase()
    const progress = project.progress || 0
    
    switch (status) {
      case 'starting':
        return "🚀 Initializing video generation..."
      case 'generating':
        return "🎬 Generating video with AI..."
      case 'uploading':
        return "📤 Uploading video to analysis platform..."
      case 'analyzing':
        return "🔍 Analyzing video for AI indicators..."
      case 'completed':
        return "✅ Video enhancement completed successfully!"
      case 'failed':
        return "❌ Video generation failed"
      default:
        if (progress > 0) {
          return `⚡ Processing... (${progress}%)`
        }
        return "⏳ Starting video enhancement..."
    }
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = (status || '').toLowerCase()
    switch (normalizedStatus) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'generating':
      case 'analyzing':
        return 'text-info bg-info-light'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getLastLogMessage = () => {
    if (logs.length === 0) return "No activity yet..."
    return logs[logs.length - 1]
  }

  const getCurrentStepMessage = () => {
    if (!project) return "Initializing..."
    
    const status = (project.status || '').toLowerCase()
    const iteration = project.iteration_count || 1
    
    switch (status) {
      case 'starting':
        return `Starting video generation (Iteration ${iteration})`
      case 'generating':
        return `Generating video with AI (Iteration ${iteration})`
      case 'uploading':
        return `Uploading to analysis platform (Iteration ${iteration})`
      case 'analyzing':
        return `Analyzing for AI indicators (Iteration ${iteration})`
      case 'completed':
        return `Completed - Final confidence: ${project.final_confidence?.toFixed(1) || '0.0'}%`
      case 'failed':
        return `Failed - Check logs for details`
      default:
        return `Processing (Iteration ${iteration})`
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Enhancement Status</h2>
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'} • 
              Last update: {lastUpdateTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Current Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Step</span>
          <span className="text-sm text-gray-600">
            {project?.iteration_count ? `Iteration ${project.iteration_count}/${project?.max_iterations || 3}` : 'Starting'}
          </span>
        </div>
        <div className="bg-info-light border border-info rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-info rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-info-dark">
              {getCurrentStepMessage()}
            </span>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Live Backend Terminal
          </h3>
        </div>
        <EnhancedTerminal 
          clearOnNewGeneration={true}
          currentVideoId={project?.video_id}
        />
      </div>


      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Technical Details</h3>
          
          {/* Key Metrics */}
          {/* Streamlined Technical Details */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Quality Score - Only show if meaningful */}
            {project?.final_confidence > 0 && (
              <div className="flex-1 min-w-[140px] text-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {project.final_confidence.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 mt-1">Quality Score</div>
              </div>
            )}
            
            {/* Iterations */}
            <div className="flex-1 min-w-[140px] text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-purple-600">
                {project?.iteration_count || project?.current_iteration || 1}/{project?.max_iterations || 3}
              </div>
              <div className="text-xs text-gray-600 mt-1">Iterations</div>
            </div>
            
            {/* Status */}
            <div className="flex-1 min-w-[140px] text-center p-3 bg-white rounded-lg border border-gray-200">
              <div className={`text-xl font-bold ${
                project?.status === 'completed' ? 'text-green-600' :
                project?.status === 'failed' ? 'text-red-600' :
                'text-info'
              }`}>
                {project?.status === 'completed' ? '✅' :
                 project?.status === 'failed' ? '❌' :
                 '⏳'}
              </div>
              <div className="text-xs text-gray-600 mt-1 capitalize">{project?.status || 'Processing'}</div>
            </div>
          </div>
          
          {/* Peak Achievement Message */}
          {project?.status === 'completed' && 
           project?.iteration_count < project?.max_iterations && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                🎯 <strong>Peak quality achieved early!</strong> The enhancement reached optimal quality at iteration {project?.iteration_count || 1} of {project?.max_iterations || 3}.
              </p>
            </div>
          )}

          {/* Video Information */}
          {project?.video_path && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Generated Video</h4>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>File:</strong> {project.video_path.split('/').pop()}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Status:</strong> {project.status}
                </p>
                {project.twelvelabs_video_id && (
                  <p className="text-sm text-gray-600">
                    <strong>TwelveLabs ID:</strong> {project.twelvelabs_video_id}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Prompt */}
          {project?.enhanced_prompt && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Enhanced Prompt</h4>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-sm text-gray-700">
                  {project.enhanced_prompt}
                </p>
              </div>
            </div>
          )}

          {/* Single Quality Score Overview */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Quality Assessment</h4>
            <div className="bg-info-light p-4 rounded-lg border border-info">
              <div className="text-sm text-info-dark">
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📊</div>
                    <div className="flex-1">
                      <p className="font-semibold text-info text-lg">Quality Score</p>
                      <p className="text-gray-600 text-sm">Higher = Better (0-100%)</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-info">
                        {project.final_confidence?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {project.final_confidence >= 90 ? '🎉 Excellent' :
                         project.final_confidence >= 70 ? '🟢 Good' :
                         project.final_confidence >= 50 ? '🟡 Moderate' : '🔴 Needs Improvement'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-info mt-3">
                  <p className="mb-2"><strong>What are AI artifacts?</strong> Visual glitches, unnatural movements, or distortions that reveal a video was AI-generated.</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="bg-green-50 p-2 rounded border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-700">90-100% Excellent</span>
                        <span className="text-green-600">🎯 Goal</span>
                      </div>
                      <div className="text-green-600 mt-1">Looks completely natural. No visible AI artifacts like warping faces, flickering objects, or unnatural motion.</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      <div className="font-semibold text-yellow-700">50-89% Good</div>
                      <div className="text-yellow-600 mt-1">Minor imperfections. May have slight motion blur, minor texture issues, or occasional frame inconsistencies.</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded border border-red-200">
                      <div className="font-semibold text-red-700">0-49% Poor</div>
                      <div className="text-red-600 mt-1">Obviously AI-generated. Visible artifacts like morphing objects, unrealistic physics, or distorted features.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {project?.analysis_results && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Analysis Results</h4>
              <div className="bg-white p-3 rounded-lg border">
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(project.analysis_results, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Final Results */}
      {project.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-success-50 border border-success-200 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-success-600" />
            <div>
              <h3 className="font-semibold text-success-900">Project Completed!</h3>
              <p className="text-sm text-success-700">
                Quality Score: {`${project.final_confidence?.toFixed(1) || '0.0'}%`} (Higher = Better)
              </p>
            </div>
          </div>
          
          {/* Video Display */}
          {(project.video_path || project.twelvelabs_video_id) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Generated Video:</h4>
                {/* Video Actions - Moved to header area for better UX */}
                <div className="flex space-x-2">
                  <a 
                    href={`/api/videos/${project.video_id}/play`}
                    download
                    className="inline-flex items-center px-3 py-2 bg-brand-purple text-white text-sm rounded-lg hover:bg-brand-dark-purple transition-all"
                    title="Download Video"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                  <button 
                    onClick={() => window.open(`/api/videos/${project.video_id}/play`, '_blank')}
                    className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-all"
                    title="Open in New Tab"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Open
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <VideoPlayerEnhanced 
                  videoId={project.video_id}
                  thumbnailUrl={project.thumbnail_url}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}


