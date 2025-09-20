'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Home } from 'lucide-react'
import PlaygroundView from '@/components/PlaygroundView'

interface VideoData {
  id: string
  title: string
  description: string
  thumbnail?: string | null
  hls_url?: string | null
  duration: number
  confidence_score?: number | null
  created_at: string
  updated_at?: string
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function PlaygroundPage() {
  const router = useRouter()
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)

  const handleEnhanceVideo = () => {
    if (selectedVideo) {
      // Store video in sessionStorage to pass to enhance page
      sessionStorage.setItem('videoToEnhance', JSON.stringify(selectedVideo))
      router.push('/enhance')
    }
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
                  Playground Mode
                </h1>
                <p className="text-sm text-gray-500">
                  Explore sample videos for recursive enhancement
                </p>
              </div>
            </div>
            <Link
              href="/enhance"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Custom Mode →
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
          {/* Video Grid */}
          <div className="card">
            <PlaygroundView onVideoSelected={setSelectedVideo} />
          </div>

          {/* Selected Video */}
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card bg-blue-50 border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedVideo.thumbnail && (
                    <img
                      src={selectedVideo.thumbnail}
                      alt={selectedVideo.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedVideo.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ready for recursive enhancement
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEnhanceVideo}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <span>Enhance This Video</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
