'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Home, RefreshCw } from 'lucide-react'

// Lazy load ProjectStatus component
const ProjectStatus = lazy(() => import('@/components/ProjectStatus'))

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
  </div>
)

export default function StatusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoId = searchParams.get('id')
  const [project, setProject] = useState<any>(null)

  useEffect(() => {
    // Try to get project from sessionStorage first
    const storedProject = sessionStorage.getItem('currentProject')
    if (storedProject) {
      setProject(JSON.parse(storedProject))
      sessionStorage.removeItem('currentProject')
    } else if (videoId) {
      // If we have a video ID but no stored project, create a basic project object
      setProject({
        video_id: videoId,
        status: 'processing',
        prompt: 'Loading...',
        confidence_threshold: '0',
        progress: '0'
      })
    }
  }, [videoId])

  const handleNewEnhancement = () => {
    router.push('/enhance')
  }

  const handleBackToPlayground = () => {
    router.push('/playground')
  }

  if (!project && !videoId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Enhancement in Progress</h2>
          <p className="text-gray-600 mb-6">Start a new enhancement to see the status here.</p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/playground"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Go to Playground
            </Link>
            <Link
              href="/enhance"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Start Enhancement
            </Link>
          </div>
        </div>
      </div>
    )
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
                  Enhancement Status
                </h1>
                <p className="text-sm text-gray-500">
                  Monitor your video enhancement progress
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBackToPlayground}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Playground
              </button>
              <button
                onClick={handleNewEnhancement}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>New Enhancement</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Suspense fallback={<LoadingSpinner />}>
            {project && <ProjectStatus project={project} />}
          </Suspense>
        </motion.div>
      </main>
    </div>
  )
}
