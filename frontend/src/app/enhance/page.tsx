'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, Key, Upload, Play, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import VideoGenerationForm from '@/components/VideoGenerationForm'
import VideoUploadForm from '@/components/VideoUploadForm'
import PlaygroundEnhanceForm from '@/components/PlaygroundEnhanceForm'
import { apiRequest } from '@/lib/api'

export default function EnhancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate')
  const [videoToEnhance, setVideoToEnhance] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check backend connectivity
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await apiRequest('/health')
        if (response && response.status === 'healthy') {
          setBackendStatus('online')
        } else {
          setBackendStatus('offline')
        }
      } catch (error) {
        console.error('Backend connectivity check failed:', error)
        setBackendStatus('offline')
      }
    }

    checkBackend()
    // Check again every 30 seconds
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  // Check for video passed from playground
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVideo = sessionStorage.getItem('videoToEnhance')
      if (storedVideo) {
        try {
          setVideoToEnhance(JSON.parse(storedVideo))
          sessionStorage.removeItem('videoToEnhance')
        } catch (e) {
          console.error('Failed to parse video data:', e)
        }
      }
    }
  }, [])

  const handleProjectCreated = (project: any) => {
    // Store project in sessionStorage and navigate to status page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentProject', JSON.stringify(project))
      router.push(`/status?id=${project.video_id}`)
    }
  }

  // Prevent SSR issues
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  // Check if this is a playground video enhancement
  const isPlaygroundVideo = videoToEnhance && videoToEnhance.id && !videoToEnhance.isNewVideo

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <Home className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isPlaygroundVideo ? 'Recursive Enhancement' : 'Enhancement Studio'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isPlaygroundVideo 
                    ? 'Improving existing video through recursive refinement'
                    : 'Generate or upload videos for recursive improvement'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Backend Status Indicator */}
              <div className="flex items-center space-x-2">
                {backendStatus === 'checking' && (
                  <>
                    <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                    <span className="text-sm text-gray-500">Checking backend...</span>
                  </>
                )}
                {backendStatus === 'online' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Backend Online</span>
                  </>
                )}
                {backendStatus === 'offline' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">Backend Offline</span>
                  </>
                )}
              </div>
              <Link
                href="/playground"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Playground
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Backend Offline Warning */}
          {backendStatus === 'offline' && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Backend Server Offline
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    The backend server is currently unavailable. Video generation and upload features will not work until the backend is running. 
                    Please ensure the backend server is started at the configured endpoint.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {isPlaygroundVideo ? (
            // Show specialized form for playground videos
            <div className="card">
              <PlaygroundEnhanceForm
                onProjectCreated={handleProjectCreated}
                selectedVideo={videoToEnhance}
              />
            </div>
          ) : (
            // Show regular tabs for generate/upload
            <div className="card">
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('generate')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === 'generate'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>Generate New Video</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === 'upload'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Existing Video</span>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {activeTab === 'generate' ? (
                  <VideoGenerationForm
                    onProjectCreated={handleProjectCreated}
                    selectedVideo={videoToEnhance}
                    autoSubmit={!!videoToEnhance}
                  />
                ) : (
                  <VideoUploadForm
                    onProjectCreated={handleProjectCreated}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}