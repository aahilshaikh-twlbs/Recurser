import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, Upload, FileVideo, Loader2, X, Info } from 'lucide-react'

interface FormData {
  originalPrompt?: string
  maxAttempts: '3' | '5' | '10' | 'unlimited'
}

interface VideoUploadFormProps {
  onProjectCreated: (project: any) => void
}

export default function VideoUploadForm({ onProjectCreated }: VideoUploadFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUnlimitedWarning, setShowUnlimitedWarning] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues: {
      maxAttempts: '5'
    }
  })

  const watchedMaxAttempts = watch('maxAttempts')

  useEffect(() => {
    if (watchedMaxAttempts) {
      setShowUnlimitedWarning(watchedMaxAttempts === 'unlimited')
    }
  }, [watchedMaxAttempts])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      // Validate file size (max 500MB)
      if (file.size > 500 * 1024 * 1024) {
        setUploadError('File size must be less than 500MB')
        return
      }
      setUploadedFile(file)
      setUploadError(null)
      // File uploaded successfully
    }
  }, [setValue])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    },
    maxFiles: 1
  })

  const removeFile = () => {
    setUploadedFile(null)
    setUploadError(null)
  }

  const onSubmit = async (data: FormData) => {
    if (!uploadedFile) {
      setUploadError('Please upload a video file')
      return
    }

    setIsProcessing(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('original_prompt', 'Auto-analyzed by Pegasus AI')
      formData.append('confidence_threshold', '50') // Default threshold
      formData.append('max_retries', data.maxAttempts === 'unlimited' ? '999' : data.maxAttempts)
      formData.append('index_id', '68d0f9e55705aa622335acb0') // Recurser test index for iterations

      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to upload video' }))
        throw new Error(errorData.detail || 'Failed to upload video')
      }

      const result = await response.json()
      console.log('Upload result:', result)
      
      // Create project object with video_id for status page
      const project = {
        video_id: result.data?.video_id || result.video_id,
        status: 'processing',
        prompt: result.data?.original_prompt || 'Auto-analyzed by Pegasus AI',
        ...result.data
      }
      
      console.log('Created project:', project)
      onProjectCreated(project)
      
      // Immediate redirect to status page - don't wait
      const videoId = project.video_id
      if (videoId) {
        console.log('Redirecting to status page for video:', videoId)
        // Use router.push for immediate navigation
        window.location.href = `/status?id=${videoId}`
      } else {
        console.error('No video_id in response:', result)
        throw new Error('Upload succeeded but no video ID returned')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsProcessing(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File
            <span className="text-red-500 ml-1">*</span>
          </label>
          
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <FileVideo className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">
                {isDragActive 
                  ? 'Drop the video here...' 
                  : 'Drag & drop a video here, or click to browse'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: MP4, AVI, MOV, MKV, WebM (max 500MB)
              </p>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileVideo className="w-8 h-8 text-primary-600" />
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
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-2 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}
        </div>

        {/* AI Analysis Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Automatic Video Analysis</p>
              <p>Our AI will automatically analyze your video content using Pegasus video-to-text technology. No need to provide the original prompt!</p>
            </div>
          </div>
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
        {watchedMaxAttempts === 'unlimited' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Warning: Unlimited attempts selected</p>
                <p>This will continue enhancing until the confidence threshold is met, which may take a long time.</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !uploadedFile}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            isProcessing || !uploadedFile
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing Video...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Upload & Start Enhancement</span>
            </>
          )}
        </button>
      </form>

      {/* Status Message */}
      {isProcessing && (
        <div className="text-center text-sm text-gray-600 mt-4">
          <p>Your video is being uploaded and processed...</p>
          <p className="mt-2">You'll be redirected to the status page once processing begins.</p>
        </div>
      )}
    </div>
  )
}