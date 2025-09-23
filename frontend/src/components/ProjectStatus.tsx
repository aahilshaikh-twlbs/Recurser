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

interface ProjectStatusProps {
  project: any
}

export default function ProjectStatus({ project: initialProject }: ProjectStatusProps) {
  const [project, setProject] = useState(initialProject)
  const [currentIteration, setCurrentIteration] = useState(String(project?.current_iteration || 1))
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [logs, setLogs] = useState<string[]>([])

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
        setCurrentIteration(parsedProject.current_iteration || 1)
        // Resume polling if not completed
        if (parsedProject.status !== 'completed' && parsedProject.status !== 'failed') {
          setIsPolling(true)
        }
      } catch (error) {
        console.error('Failed to recover project state:', error)
      }
    }
  }, [])

  // Poll for status updates
  useEffect(() => {
    if (!project?.video_id || !isPolling) return

    const pollStatus = async () => {
      try {
        // Fetch status
        const response = await apiRequest(API_CONFIG.endpoints.videoStatus(project.video_id))
        const result = await response.json()
        
        if (result.success && result.data) {
          setProject(result.data)
          setCurrentIteration(result.data.current_iteration || 1)
          
          // Stop polling if completed or failed
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            setIsPolling(false)
          }
        }
        
        // Fetch logs
        const logsResponse = await apiRequest(API_CONFIG.endpoints.videoLogs(project.video_id))
        const logsResult = await logsResponse.json()
        
        if (logsResult.success && logsResult.data) {
          setLogs(logsResult.data.logs || [])
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }

    // Initial poll
    pollStatus()

    // Set up interval for polling
    const interval = setInterval(pollStatus, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [project?.video_id, isPolling])

  const getStatusIcon = (status: string) => {
    const normalizedStatus = (status || '').toLowerCase()
    switch (normalizedStatus) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-600" />
      case 'processing':
        return <Clock className="w-5 h-5 text-primary-600 animate-pulse" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-error-600" />
      default:
        return <Play className="w-5 h-5 text-warning-600" />
    }
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = (status || '').toLowerCase()
    switch (normalizedStatus) {
      case 'completed':
        return 'status-completed'
      case 'processing':
        return 'status-processing'
      case 'failed':
        return 'status-failed'
      default:
        return 'status-pending'
    }
  }

  const formatProgress = () => {
    if (!project.iterations || project.iterations.length === 0) return '0'
    const completed = project.iterations.filter((iter: any) => iter.status === 'completed').length
    return String(Math.round((completed / project.iterations.length) * 100))
  }

  const getCurrentConfidence = () => {
    if (!project.iterations || project.iterations.length === 0) return '0'
    const latest = project.iterations[project.iterations.length - 1]
    return String(latest.confidence_score || 0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Project Status</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          {isExpanded ? 'Show Less' : 'Show Details'}
        </button>
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">
            {String(project.total_iterations || '0')}
          </div>
          <div className="text-sm text-gray-600">Total Iterations</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">
            {String(currentIteration)}
          </div>
          <div className="text-sm text-gray-600">Current Iteration</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-success-600">
            {`${parseFloat(getCurrentConfidence()).toFixed(1)}%`}
          </div>
          <div className="text-sm text-gray-600">Current Confidence</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-warning-600">
            {`${String(project.target_confidence || 85)}%`}
          </div>
          <div className="text-sm text-gray-600">Target Confidence</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">{formatProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-primary-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${formatProgress()}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-3 mb-6">
        {getStatusIcon(project.status)}
        <div>
          <span className={`status-badge ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          <p className="text-sm text-gray-600 mt-1">
            {project.status === 'completed' 
              ? 'Project completed successfully!'
              : project.status === 'processing'
              ? 'Currently processing video...'
              : 'Project is pending or failed'
            }
          </p>
        </div>
      </div>

      {/* Enhanced Process Logs */}
      {logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Live Enhancement Logs
          </h3>
          <div className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {logs.map((log, index) => {
                // Parse log type for better formatting
                const isSuccess = log.includes('✅') || log.includes('SUCCESS')
                const isError = log.includes('❌') || log.includes('ERROR')
                const isWarning = log.includes('⚠️') || log.includes('WARNING')
                const isInfo = log.includes('ℹ️') || log.includes('INFO')
                const isMarengo = log.includes('MarenGO') || log.includes('🔍')
                const isPegasus = log.includes('Pegasus') || log.includes('🧠')
                const isScore = log.includes('Score') || log.includes('📊') || log.includes('🤖')
                
                let bgColor = 'bg-gray-100'
                let textColor = 'text-gray-700'
                let icon = ''
                
                if (isSuccess) {
                  bgColor = 'bg-green-100'
                  textColor = 'text-green-800'
                  icon = '✅'
                } else if (isError) {
                  bgColor = 'bg-red-100'
                  textColor = 'text-red-800'
                  icon = '❌'
                } else if (isWarning) {
                  bgColor = 'bg-yellow-100'
                  textColor = 'text-yellow-800'
                  icon = '⚠️'
                } else if (isMarengo) {
                  bgColor = 'bg-blue-100'
                  textColor = 'text-blue-800'
                  icon = '🔍'
                } else if (isPegasus) {
                  bgColor = 'bg-purple-100'
                  textColor = 'text-purple-800'
                  icon = '🧠'
                } else if (isScore) {
                  bgColor = 'bg-indigo-100'
                  textColor = 'text-indigo-800'
                  icon = '📊'
                }
                
                return (
                  <div key={index} className={`p-2 rounded ${bgColor} ${textColor}`}>
                    <div className="text-xs font-mono flex items-start">
                      <span className="mr-2">{icon}</span>
                      <span className="flex-1">{log}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Expanded Details */}
      {isExpanded && project.iterations && project.iterations.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          <h3 className="font-semibold text-gray-900">Iteration Details</h3>
          
          {project.iterations.map((iteration: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
                    {String(iteration.iteration_number)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Iteration {String(iteration.iteration_number)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {iteration.status === 'uploaded_video' ? 'Uploaded Video' : 'Generated Video'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-primary-600">
                    {`${iteration.confidence_score?.toFixed(1) || '0'}%`}
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
              </div>

              {/* Prompt */}
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">Prompt:</label>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                  {iteration.prompt}
                </p>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Marengo Score:</label>
                  <div className="text-lg font-bold text-blue-600">
                    {`${iteration.marengo_score?.toFixed(1) || '0'}%`}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <span className={`status-badge ${getStatusColor(iteration.status)}`}>
                    {iteration.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                {iteration.video_path && (
                  <>
                    <button className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700">
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </>
                )}
              </div>

              {/* Analysis */}
              {iteration.pegasus_analysis && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <label className="text-sm font-medium text-blue-900">Pegasus Analysis:</label>
                  <p className="text-sm text-blue-800 mt-1">
                    {iteration.pegasus_analysis.length > 200
                      ? `${iteration.pegasus_analysis.substring(0, 200)}...`
                      : iteration.pegasus_analysis
                    }
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : null}

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
                Final confidence: {`${project.final_confidence?.toFixed(1) || '0.0'}%`} | 
                AI Detection Score: {`${project.ai_detection_score?.toFixed(1) || '0.0'}%`}
              </p>
            </div>
          </div>
          
          {/* Video Display */}
          {project.video_path && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Generated Video:</h4>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <video 
                  controls 
                  className="w-full max-w-2xl mx-auto rounded-lg"
                  poster={project.thumbnail_url}
                >
                  <source src={`http://127.0.0.1:8080/${project.video_path.split('/').pop()}`} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              {/* Video Actions */}
              <div className="mt-3 flex space-x-2">
                <a 
                  href={`http://127.0.0.1:8080/${project.video_path.split('/').pop()}`}
                  download
                  className="btn-primary text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </a>
                <button 
                  onClick={() => window.open(`http://127.0.0.1:8080/${project.video_path.split('/').pop()}`, '_blank')}
                  className="btn-secondary text-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Open in New Tab
                </button>
              </div>
            </div>
          )}
          
          {/* Final Prompt */}
          {project.enhanced_prompt && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Final Enhanced Prompt:</h4>
              <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                {project.enhanced_prompt}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
