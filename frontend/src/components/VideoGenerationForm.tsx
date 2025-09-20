import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { AlertCircle, Loader2, Sparkles, Video } from 'lucide-react'

interface FormData {
  prompt: string
  maxAttempts: '3' | '5' | '10' | 'unlimited'
}

interface VideoGenerationFormProps {
  onProjectCreated: (project: any) => void
  selectedVideo?: any
  autoSubmit?: boolean
}

export default function VideoGenerationForm({ 
  onProjectCreated, 
  selectedVideo, 
  autoSubmit 
}: VideoGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false)

  const defaultValues = useMemo(() => {
    const values: FormData = {
      maxAttempts: '5',
      prompt: ''
    }
    
    if (selectedVideo && selectedVideo.title) {
      const title = String(selectedVideo.title || 'Untitled')
      const description = String(selectedVideo.description || '')
      values.prompt = `Enhance this video: ${title}. ${description}`.trim()
    }
    
    return values
  }, [selectedVideo])

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues,
    mode: 'onSubmit'
  })

  const watchedMaxAttempts = watch('maxAttempts')

  useEffect(() => {
    if (watchedMaxAttempts) {
      setShowUnlimitedWarning(watchedMaxAttempts === 'unlimited')
    }
  }, [watchedMaxAttempts])

  // Auto-submit if requested
  useEffect(() => {
    if (autoSubmit && selectedVideo) {
      const timer = setTimeout(() => {
        handleSubmit(onSubmit)()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoSubmit, selectedVideo, handleSubmit])

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true)
    setError(null)

    try {
      // Prepare the request payload
      const payload = {
        prompt: data.prompt,
        project_name: `Enhancement_${String(Date.now())}`, // Auto-generated project name
        confidence_threshold: 50, // Default threshold
        max_retries: data.maxAttempts === 'unlimited' ? 999 : parseInt(data.maxAttempts, 10),
        index_id: '68bb521dc600d3d8baf629a4' // Recurser test index for iterations
      }

      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to generate video' }))
        throw new Error(errorData.detail || 'Failed to generate video')
      }

      const project = await response.json()
      
      // Call the callback with the created project
      onProjectCreated(project)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Video Description/Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Description
            <span className="text-red-500 ml-1">*</span>
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
        </div>

        {/* Max Attempts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Enhancement Attempts
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="3"
                className="mr-2"
              />
              <span className="text-sm">3 attempts</span>
            </label>
            
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="5"
                className="mr-2"
              />
              <span className="text-sm">5 attempts</span>
            </label>
            
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="10"
                className="mr-2"
              />
              <span className="text-sm">10 attempts</span>
            </label>
            
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="unlimited"
                onChange={() => setValue('maxAttempts', 'unlimited')}
                className="mr-2"
              />
              <span className="text-sm">Unlimited</span>
            </label>
          </div>
        </div>

        {/* Warning for unlimited attempts */}
        {showUnlimitedWarning && watchedMaxAttempts === 'unlimited' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Warning: Unlimited attempts selected</p>
                <p>This will continue generating videos until the confidence threshold is met, which may take a long time and consume significant API credits.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">Generation Failed</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating Video...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Start Video Generation</span>
            </>
          )}
        </button>
      </form>

      {/* Status Message */}
      {isGenerating && (
        <div className="text-center text-sm text-gray-600 mt-4">
          <p>Your video is being generated. This may take a few minutes...</p>
          <p className="mt-2">You'll be redirected to the status page once generation begins.</p>
        </div>
      )}
    </div>
  )
}