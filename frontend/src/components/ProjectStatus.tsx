'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
import TerminalLogs from './TerminalLogs'
import HLSVideoPlayer from './HLSVideoPlayer'

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
          
          // Stop polling if completed or failed
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            setIsPolling(false)
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
        
        // Only show disconnected after multiple failed attempts
        if (pollCount >= maxPollAttempts) {
          setIsConnected(false)
        }
      }
    }

    // Initial poll
    pollStatus()

    // Set up interval for polling - more frequent for better responsiveness
    const interval = setInterval(pollStatus, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
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
        return 'text-blue-600 bg-blue-100'
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">
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
        <TerminalLogs className="min-h-[200px]" />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {project?.final_confidence?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-xs text-gray-600">Quality Score</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {project?.final_confidence?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-xs text-gray-600">Final Confidence</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {project?.iteration_count || 1}
              </div>
              <div className="text-xs text-gray-600">Iterations</div>
            </div>
            
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {project?.max_iterations || 3}
              </div>
              <div className="text-xs text-gray-600">Max Iterations</div>
            </div>
          </div>

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
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <div className="bg-white p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📊</div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-700 text-lg">Quality Score</p>
                      <p className="text-gray-600 text-sm">Higher = Better (0-100%)</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-700">
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
                <div className="text-xs text-blue-600 mt-3">
                  <p><strong>How it works:</strong> Analyzes AI artifacts, motion quality, and visual coherence to determine overall video quality.</p>
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
              <h4 className="font-medium text-gray-900 mb-2">Generated Video:</h4>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <video 
                  controls 
                  className="w-full max-w-2xl mx-auto rounded-lg"
                  poster={project.thumbnail_url}
                >
                  <source src={`/api/videos/${project.video_id}/play`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              {/* Video Actions */}
              <div className="mt-3 flex space-x-2">
                <a 
                  href={`/api/videos/${project.video_id}/download`}
                  download
                  className="btn-primary text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </a>
                <button 
                  onClick={() => window.open(`/api/videos/${project.video_id}/play`, '_blank')}
                  className="btn-secondary text-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Open in New Tab
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

