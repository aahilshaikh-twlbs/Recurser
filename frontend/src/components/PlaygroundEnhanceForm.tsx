'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { AlertCircle, Loader2, Sparkles, Video, ArrowRight } from 'lucide-react'

interface FormData {
  maxAttempts: '3' | '5' | '10' | 'unlimited'
}

interface PlaygroundEnhanceFormProps {
  onProjectCreated: (project: any) => void
  selectedVideo: any
}

export default function PlaygroundEnhanceForm({ 
  onProjectCreated, 
  selectedVideo
}: PlaygroundEnhanceFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const defaultValues = useMemo(() => ({
    maxAttempts: '5' as const
  }), [])

  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues
  })

  const watchedMaxAttempts = watch('maxAttempts')

  useEffect(() => {
    setShowUnlimitedWarning(watchedMaxAttempts === 'unlimited')
  }, [watchedMaxAttempts])

  // Don't auto-submit - let user configure first
  // useEffect(() => {
  //   if (selectedVideo && selectedVideo.id) {
  //     const timer = setTimeout(() => {
  //       handleSubmit(onSubmit)()
  //     }, 500)
  //     return () => clearTimeout(timer)
  //   }
  // }, [selectedVideo])

  const onSubmit = async (data: FormData) => {
    if (!selectedVideo || !selectedVideo.id) {
      setError('No video selected')
      return
    }

    setIsGenerating(true)
    setError(null)
    setIsAnalyzing(true)

    try {
      // For playground videos, we need to analyze them first to generate a prompt
      const videoTitle = String(selectedVideo.title || 'Untitled')
      const videoId = String(selectedVideo.id || 'unknown')
      
      const payload = {
        prompt: `Analyze and enhance this existing video from the playground. Video ID: ${videoId}, Title: ${videoTitle}. This is a pre-existing video that needs recursive improvement.`,
        project_name: `Enhance_${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${String(Date.now())}`,
        confidence_threshold: 50,
        max_retries: data.maxAttempts === 'unlimited' ? 999 : parseInt(data.maxAttempts, 10),
        index_id: '68d0f9e55705aa622335acb0', // Recurser test index for iterations
        video_id: videoId, // Pass the original video ID for analysis
        is_playground_video: true // Flag to indicate this is from playground
      }

      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to start enhancement' }))
        throw new Error(errorData.detail || 'Failed to start enhancement')
      }

      const project = await response.json()
      
      // Call the callback with the created project
      onProjectCreated(project)
    } catch (err) {
      console.error('Enhancement error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsGenerating(false)
      setIsAnalyzing(false)
    }
  }

  if (!selectedVideo) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No video selected for enhancement</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Video Info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <Video className="w-12 h-12 text-primary-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Enhancing: {String(selectedVideo.title || 'Untitled Video')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {String(selectedVideo.description || 'This video will be analyzed and recursively enhanced to improve quality and coherence.')}
            </p>
            {selectedVideo.confidence_score && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Current Quality:</span>
                <span className="text-sm font-semibold text-primary-600">
                  {String(selectedVideo.confidence_score)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Max Attempts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Enhancement Iterations
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="3"
                className="mr-2"
              />
              <span className="text-sm">3 iterations</span>
            </label>
            
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="5"
                className="mr-2"
              />
              <span className="text-sm">5 iterations</span>
            </label>
            
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="10"
                className="mr-2"
              />
              <span className="text-sm">10 iterations</span>
            </label>
            
            <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                {...register('maxAttempts')}
                value="unlimited"
                className="mr-2"
              />
              <span className="text-sm">Unlimited</span>
            </label>
          </div>
        </div>

        {/* Unlimited Warning */}
        {showUnlimitedWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                  Unlimited Iterations Selected
                </h4>
                <p className="text-sm text-yellow-700">
                  The enhancement process will continue until optimal quality is achieved. This may take significant time and resources.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-1">Enhancement Failed</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAnalyzing ? 'Analyzing Video...' : 'Starting Enhancement...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Start Recursive Enhancement</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">
                How Recursive Enhancement Works
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• The video will be analyzed to understand its content</li>
                <li>• Each iteration will improve quality and coherence</li>
                <li>• Progress is tracked with quality scores</li>
                <li>• Enhanced versions are saved to the test index</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
