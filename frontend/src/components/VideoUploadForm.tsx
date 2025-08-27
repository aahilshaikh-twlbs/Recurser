'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileVideo, Target, RefreshCw, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'

interface VideoUploadFormProps {
  onProjectCreated: (project: any) => void
}

interface FormData {
  originalPrompt: string
  confidenceThreshold: number
  maxAttempts: number
  projectName: string
}

export default function VideoUploadForm({ onProjectCreated }: VideoUploadFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    defaultValues: {
      confidenceThreshold: 85,
      maxAttempts: 5,
      projectName: `Upload Project ${Date.now()}`
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadError(null)
    const file = acceptedFiles[0]
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setUploadError('Please upload a valid video file')
        return
      }
      
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setUploadError('File size must be less than 100MB')
        return
      }
      
      setUploadedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
    },
    multiple: false
  })

  const onSubmit = async (data: FormData) => {
    if (!uploadedFile) {
      setUploadError('Please upload a video file')
      return
    }
    
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('project_id', '1') // Placeholder
      formData.append('original_prompt', data.originalPrompt)
      formData.append('confidence_threshold', data.confidenceThreshold.toString())
      formData.append('max_attempts', data.maxAttempts.toString())
      
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        onProjectCreated(result.data)
      } else {
        const error = await response.json()
        setUploadError(error.detail || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Failed to upload video')
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setUploadError(null)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Existing Video for Analysis & Improvement
        </h3>
        <p className="text-sm text-gray-600">
          Upload a video and let our AI analyze it, then improve it through recursive generation
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

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File <span className="text-red-500">*</span>
          </label>
          
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop the video here' : 'Drag & drop a video file'}
                </p>
                <p className="text-sm text-gray-600">
                  or click to browse files
                </p>
                <p className="text-xs text-gray-500">
                  Supports MP4, AVI, MOV, WMV, FLV, WebM (max 100MB)
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileVideo className="h-8 w-8 text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          )}
          
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-red-600 text-sm mt-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{uploadError}</span>
            </motion.div>
          )}
        </div>

        {/* Original Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Prompt Used <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('originalPrompt', { 
              required: 'Original prompt is required',
              minLength: { value: 10, message: 'Prompt must be at least 10 characters' }
            })}
            rows={3}
            className="input-field"
            placeholder="Describe the prompt that was used to generate this video (or your intended description if it's a real video)"
          />
          {errors.originalPrompt && (
            <p className="mt-1 text-sm text-red-600">{errors.originalPrompt.message}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            This helps our AI understand what the video should contain for better analysis
          </p>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              Target Confidence (%)
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
              Maximum Refinement Attempts
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
              Maximum number of improvement iterations
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={isProcessing || !uploadedFile}
            className="btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 inline mr-2 animate-spin" />
                Processing Video...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 inline mr-2" />
                Start Video Analysis & Improvement
              </>
            )}
          </button>
          {isProcessing && (
            <p className="text-sm text-gray-600 mt-2">
              Analyzing your video and preparing improvement pipeline...
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
