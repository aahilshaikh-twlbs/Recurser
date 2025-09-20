'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Home, Key, Upload, Play } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import form components with SSR disabled to avoid prerendering issues
const VideoGenerationForm = dynamic(
  () => import('@/components/VideoGenerationForm'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }
)

const VideoUploadForm = dynamic(
  () => import('@/components/VideoUploadForm'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }
)

export default function EnhancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate')
  const [videoToEnhance, setVideoToEnhance] = useState<any>(null)
  const [customApiKeys, setCustomApiKeys] = useState({
    geminiKey: '',
    twelvelabsKey: '',
    indexId: ''
  })

  // Check for video passed from playground
  useEffect(() => {
    const storedVideo = sessionStorage.getItem('videoToEnhance')
    if (storedVideo) {
      setVideoToEnhance(JSON.parse(storedVideo))
      sessionStorage.removeItem('videoToEnhance')
    }
  }, [])

  const handleProjectCreated = (project: any) => {
    // Store project in sessionStorage and navigate to status page
    sessionStorage.setItem('currentProject', JSON.stringify(project))
    router.push(`/status?id=${project.video_id}`)
  }

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
                  Enhancement Studio
                </h1>
                <p className="text-sm text-gray-500">
                  Generate or upload videos for recursive improvement
                </p>
              </div>
            </div>
            <Link
              href="/playground"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Playground
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* API Key Configuration */}
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <Key className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  API Configuration
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your API keys to generate and upload your own videos
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="password"
                    placeholder="Gemini API Key"
                    value={customApiKeys.geminiKey}
                    onChange={(e) => setCustomApiKeys({...customApiKeys, geminiKey: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="password"
                    placeholder="TwelveLabs API Key"
                    value={customApiKeys.twelvelabsKey}
                    onChange={(e) => setCustomApiKeys({...customApiKeys, twelvelabsKey: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  <input
                    type="text"
                    placeholder="TwelveLabs Index ID"
                    value={customApiKeys.indexId}
                    onChange={(e) => setCustomApiKeys({...customApiKeys, indexId: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
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
                  apiKeys={customApiKeys}
                  selectedVideo={videoToEnhance}
                  autoSubmit={Boolean(videoToEnhance)}
                />
              ) : (
                <VideoUploadForm
                  onProjectCreated={handleProjectCreated}
                  apiKeys={customApiKeys}
                />
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
