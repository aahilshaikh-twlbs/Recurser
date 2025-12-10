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

  const handleEnhanceVideo = (video: VideoData) => {
    if (video) {
      // Ensure all properties are safe strings before storing
      const safeVideo = {
        id: String(video.id || ''),
        title: String(video.title || 'Untitled'),
        description: String(video.description || ''),
        thumbnail: video.thumbnail || null,
        hls_url: video.hls_url || null,
        duration: Number(video.duration) || 0,
        confidence_score: video.confidence_score ? Number(video.confidence_score) : null,
        created_at: String(video.created_at || ''),
        updated_at: video.updated_at ? String(video.updated_at) : undefined
      }
      // Store video in sessionStorage to pass to enhance page
      sessionStorage.setItem('videoToEnhance', JSON.stringify(safeVideo))
      router.push('/enhance')
    }
  }

  const handleVideoSelected = (video: VideoData) => {
    // Automatically start enhancement when video is selected from modal
    handleEnhanceVideo(video)
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
                <h1 className="text-xl text-gray-900">
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
            <PlaygroundView onVideoSelected={handleVideoSelected} />
          </div>

        </motion.div>
      </main>
    </div>
  )
}
