'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Sparkles, Target, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'

interface VideoGenerationFormProps {
  onProjectCreated: (project: any) => void
}

interface FormData {
  prompt: string
  confidenceThreshold: number
  maxAttempts: number
  projectName: string
}

export default function VideoGenerationForm({ onProjectCreated }: VideoGenerationFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [promptAnalysis, setPromptAnalysis] = useState<any>(null)
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    defaultValues: {
      confidenceThreshold: 85,
      maxAttempts: 5,
      projectName: `Project ${Date.now()}`
    }
  })

  const watchedPrompt = watch('prompt')

  const analyzePrompt = async () => {
    if (!watchedPrompt || watchedPrompt.length < 10) return
    
    try {
      const response = await fetch('/api/analyze/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: watchedPrompt })
      })
      
      if (response.ok) {
        const data = await response.json()
        setPromptAnalysis(data.data)
      }
    } catch (error) {
      console.error('Failed to analyze prompt:', error)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          project_id: 1, // Placeholder - would come from project creation
          confidence_threshold: data.confidenceThreshold,
          max_attempts: data.maxAttempts
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        onProjectCreated(result.data)
      } else {
        const error = await response.json()
        alert(`Generation failed: ${error.detail}`)
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to start video generation')
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
          Describe your video and let our AI continuously improve it until quality threshold is met
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
            className="input-field"
            placeholder="Enter project name"
          />
          {errors.projectName && (
            <p className="mt-1 text-sm text-red-600">{errors.projectName.message}</p>
          )}
        </div>

        {/* Video Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video Description <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              {...register('prompt', { 
                required: 'Video description is required',
                minLength: { value: 10, message: 'Description must be at least 10 characters' },
                maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
              })}
              rows={4}
              className="input-field pr-20"
              placeholder="Describe the video you want to generate... (e.g., 'A cinematic shot of a majestic lion in the savannah at sunset, with warm golden lighting and dramatic shadows')"
            />
            <button
              type="button"
              onClick={analyzePrompt}
              disabled={!watchedPrompt || watchedPrompt.length < 10}
              className="absolute right-2 top-2 p-2 text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              title="Analyze prompt for improvements"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
          {errors.prompt && (
            <p className="mt-1 text-sm text-red-600">{errors.prompt.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {watchedPrompt?.length || 0}/1000 characters
          </p>
        </div>

        {/* Prompt Analysis */}
        {promptAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <h4 className="font-medium text-blue-900 mb-2">Prompt Analysis</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Length:</span> {promptAnalysis.prompt_length} chars
              </div>
              <div>
                <span className="text-blue-700">Words:</span> {promptAnalysis.word_count}
              </div>
              <div>
                <span className="text-blue-700">Style:</span> {promptAnalysis.has_style_indicators ? '✓' : '✗'}
              </div>
              <div>
                <span className="text-blue-700">Composition:</span> {promptAnalysis.has_composition_indicators ? '✓' : '✗'}
              </div>
            </div>
            {promptAnalysis.suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-blue-700 font-medium mb-1">Suggestions:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {promptAnalysis.suggestions.map((suggestion: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              Confidence Threshold (%)
            </label>
            <input
              type="range"
              {...register('confidenceThreshold', { 
                min: 50, 
                max: 95,
                valueAsNumber: true 
              })}
              min="50"
              max="95"
              step="5"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>50%</span>
              <span className="font-medium">{watch('confidenceThreshold')}%</span>
              <span>95%</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Videos will be refined until this quality level is reached
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Maximum Attempts
            </label>
            <select
              {...register('maxAttempts', { valueAsNumber: true })}
              className="input-field"
            >
              <option value={3}>3 attempts</option>
              <option value={5}>5 attempts</option>
              <option value={7}>7 attempts</option>
              <option value={10}>10 attempts</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Maximum number of refinement iterations
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={isGenerating}
            className="btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 inline mr-2" />
                Start Video Generation
              </>
            )}
          </button>
          {isGenerating && (
            <p className="text-sm text-gray-600 mt-2">
              This may take several minutes. You can monitor progress below.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
