'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Sparkles, AlertTriangle, Infinity } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { API_CONFIG, apiRequest } from '@/lib/config'

interface VideoGenerationFormProps {
  onProjectCreated: (project: any) => void
  apiKeys?: {
    geminiKey: string
    twelvelabsKey: string
    indexId: string
  }
  selectedVideo?: {
    id: string
    title: string
    description: string
  }
  autoSubmit?: boolean
}

interface FormData {
  prompt: string
  maxAttempts: '3' | '5' | '10' | 'unlimited'
  projectName: string
}

export default function VideoGenerationForm({ onProjectCreated, apiKeys, selectedVideo, autoSubmit }: VideoGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false)
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues: {
      maxAttempts: '5',
      projectName: selectedVideo ? `Enhance: ${selectedVideo.title}` : `Project ${Date.now()}`,
      prompt: selectedVideo ? `Enhance this video: ${selectedVideo.title}. ${selectedVideo.description}` : ''
    }
  })

  const watchedMaxAttempts = watch('maxAttempts')

  // Auto-submit when selectedVideo is provided
  useEffect(() => {
    if (autoSubmit && selectedVideo && !isGenerating) {
      // Small delay to show the form before submitting
      const timer = setTimeout(() => {
        handleSubmit(onSubmit)()
      }, 500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, selectedVideo?.id])

  const onSubmit = async (data: FormData) => {
    // Check if API keys are provided in custom mode
    if (apiKeys && (!apiKeys.geminiKey || !apiKeys.twelvelabsKey || !apiKeys.indexId)) {
      alert('Please provide all required API keys')
      return
    }

    // Show warning for unlimited iterations
    if (data.maxAttempts === 'unlimited') {
      if (!showUnlimitedWarning) {
        setShowUnlimitedWarning(true)
        return
      }
    }

    setIsGenerating(true)
    
    try {
      const response = await apiRequest(API_CONFIG.endpoints.generateVideo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          confidence_threshold: 0, // No threshold - continue based on iterations
          max_retries: data.maxAttempts === 'unlimited' ? 999 : parseInt(data.maxAttempts),
          index_id: apiKeys?.indexId || API_CONFIG.defaultCredentials.playgroundIndexId,
          twelvelabs_api_key: apiKeys?.twelvelabsKey || API_CONFIG.defaultCredentials.twelvelabsApiKey,
          gemini_api_key: apiKeys?.geminiKey || API_CONFIG.defaultCredentials.geminiApiKey
        })
      })
      
      const result = await response.json()
      console.log('Generate video response:', result)
      
      if (result.success && result.data) {
        onProjectCreated(result.data)
        setShowUnlimitedWarning(false)
      } else {
        throw new Error(result.message || 'Failed to start video generation')
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to start video generation')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Generate AI Video with Recursive Improvement
        </h3>
        <p className="text-sm text-gray-600">
          Describe your video and let our AI continuously improve it
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Project Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            type="text"
            {...register('projectName', { required: 'Project name is required' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {errors.projectName && (
            <p className="mt-1 text-sm text-red-600">{errors.projectName.message}</p>
          )}
        </div>

        {/* Video Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Description <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('prompt', { 
              required: 'Video description is required',
              minLength: { value: 10, message: 'Description must be at least 10 characters' }
            })}
            rows={4}
            placeholder="Describe the video you want to generate..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          {errors.prompt && (
            <p className="mt-1 text-sm text-red-600">{errors.prompt.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Be descriptive for better results
          </p>
        </div>

        {/* Iteration Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Iteration Settings
          </label>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="3"
                  {...register('maxAttempts')}
                  onChange={() => {
                    setValue('maxAttempts', '3')
                    setShowUnlimitedWarning(false)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">3 iterations (Fast)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="5"
                  {...register('maxAttempts')}
                  onChange={() => {
                    setValue('maxAttempts', '5')
                    setShowUnlimitedWarning(false)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">5 iterations (Balanced)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="10"
                  {...register('maxAttempts')}
                  onChange={() => {
                    setValue('maxAttempts', '10')
                    setShowUnlimitedWarning(false)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">10 iterations (Thorough)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="unlimited"
                  {...register('maxAttempts')}
                  onChange={() => setValue('maxAttempts', 'unlimited')}
                  className="mr-2"
                />
                <span className="text-sm font-medium">
                  <Infinity className="w-4 h-4 inline mr-1" />
                  Unlimited (Beta)
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500">
              More iterations = better quality but longer processing time
            </p>
          </div>
        </div>

        {/* Unlimited Warning */}
        {showUnlimitedWarning && watchedMaxAttempts === 'unlimited' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Unlimited Iterations Warning
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  Unlimited iterations will continue refining the video until manually stopped. This can:
                </p>
                <ul className="text-sm text-gray-700 space-y-1 mb-3">
                  <li>• Take significant time (potentially hours)</li>
                  <li>• Consume substantial API credits</li>
                  <li>• Generate many video variations</li>
                  <li>• Incur higher costs</li>
                </ul>
                <p className="text-sm font-medium text-gray-900">
                  Are you sure you want to proceed with unlimited iterations?
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            isGenerating
              ? 'bg-gray-300 cursor-not-allowed'
              : showUnlimitedWarning && watchedMaxAttempts === 'unlimited'
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Generating...</span>
            </>
          ) : showUnlimitedWarning && watchedMaxAttempts === 'unlimited' ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Unlimited Generation</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Start Video Generation</span>
            </>
          )}
        </button>
      </form>

      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-600"
        >
          This may take several minutes. You can monitor progress below once generation starts.
        </motion.div>
      )}
    </div>
  )
}