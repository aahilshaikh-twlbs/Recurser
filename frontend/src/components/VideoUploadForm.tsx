'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileVideo, AlertCircle, AlertTriangle, Infinity } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { API_CONFIG, buildApiUrl } from '@/lib/config'

interface VideoUploadFormProps {
  onProjectCreated: (project: any) => void
  apiKeys?: {
    geminiKey: string
    twelvelabsKey: string
    indexId: string
  }
}

interface FormData {
  originalPrompt: string
  maxAttempts: '3' | '5' | '10' | 'unlimited'
  projectName: string
}

export default function VideoUploadForm({ onProjectCreated, apiKeys }: VideoUploadFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false)
  
  // Use useMemo to ensure stable default values
  const defaultValues = useMemo(() => ({
    maxAttempts: '5' as const,
    projectName: `Upload Project ${String(Date.now())}`
  }), [])
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues
  })

  const watchedMaxAttempts = watch('maxAttempts')

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
    
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('original_prompt', data.originalPrompt)
      formData.append('confidence_threshold', '0') // No threshold
      formData.append('max_retries', data.maxAttempts === 'unlimited' ? '999' : data.maxAttempts)
      formData.append('index_id', apiKeys?.indexId || API_CONFIG.defaultCredentials.playgroundIndexId)
      formData.append('twelvelabs_api_key', apiKeys?.twelvelabsKey || API_CONFIG.defaultCredentials.twelvelabsApiKey)
      if (apiKeys?.geminiKey) {
        formData.append('gemini_api_key', apiKeys.geminiKey)
      }
      
      const response = await fetch(buildApiUrl(API_CONFIG.endpoints.uploadVideo), {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Upload video response:', result)
        
        if (result.success && result.data) {
          onProjectCreated(result.data)
          setShowUnlimitedWarning(false)
        } else {
          throw new Error(result.message || 'Upload failed')
        }
      } else {
        const error = await response.json()
        setUploadError(error.detail || error.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Failed to upload video')
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
          Upload Video for Analysis & Improvement
        </h3>
        <p className="text-sm text-gray-600">
          Upload an existing video to analyze and recursively improve it
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

        {/* Video Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Video <span className="text-red-500">*</span>
          </label>
          
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <FileVideo className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              {isDragActive ? (
                <p className="text-primary-600">Drop the video here...</p>
              ) : (
                <>
                  <p className="text-gray-700">Drag & drop a video here, or click to select</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: MP4, AVI, MOV, WMV, FLV, WebM (Max 100MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileVideo className="h-8 w-8 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {`${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-start space-x-2"
            >
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{uploadError}</p>
            </motion.div>
          )}
        </div>

        {/* Original Prompt (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Prompt (Optional)
          </label>
          <textarea
            {...register('originalPrompt')}
            rows={3}
            placeholder="If you know the original prompt used to generate this video..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Helps improve analysis accuracy
          </p>
        </div>

        {/* Iteration Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Improvement Iterations
          </label>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('maxAttempts')}
                  value="3"
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
                  {...register('maxAttempts')}
                  value="5"
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
                  {...register('maxAttempts')}
                  value="10"
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
                  {...register('maxAttempts')}
                  value="unlimited"
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
          disabled={isProcessing || !uploadedFile}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            isProcessing || !uploadedFile
              ? 'bg-gray-300 cursor-not-allowed'
              : showUnlimitedWarning && watchedMaxAttempts === 'unlimited'
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : showUnlimitedWarning && watchedMaxAttempts === 'unlimited' ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Unlimited Processing</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Upload & Analyze Video</span>
            </>
          )}
        </button>
      </form>

      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-gray-600"
        >
          Uploading and analyzing your video. This may take several minutes...
        </motion.div>
      )}
    </div>
  )
}