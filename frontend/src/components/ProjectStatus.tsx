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
  const [currentIteration, setCurrentIteration] = useState(project?.current_iteration || 1)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPolling, setIsPolling] = useState(true)

  // Poll for status updates
  useEffect(() => {
    if (!project?.video_id || !isPolling) return

    const pollStatus = async () => {
      try {
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
    switch (status.toLowerCase()) {
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
    switch (status.toLowerCase()) {
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
            {`${project.target_confidence || 85}%`}
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
                Final confidence: {`${project.final_confidence?.toFixed(1)}%`} | 
                Best prompt: {project.best_prompt?.substring(0, 100)}...
              </p>
            </div>
          </div>
          
          {project.final_video_path && (
            <div className="mt-3 flex space-x-2">
              <button className="btn-primary text-sm">
                <Download className="w-4 h-4 mr-2" />
                Download Final Video
              </button>
              <button className="btn-secondary text-sm">
                <Eye className="w-4 h-4 mr-2" />
                View Final Video
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
