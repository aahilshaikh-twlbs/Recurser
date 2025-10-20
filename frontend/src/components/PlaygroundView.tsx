'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Search, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react'
import { getVideosFromIndex } from '@/lib/api'
import { API_CONFIG, apiRequest } from '@/lib/config'
import HLSVideoPlayer from './HLSVideoPlayer'

interface Video {
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

interface PlaygroundViewProps {
  onVideoSelected?: (video: Video) => void
}

export default function PlaygroundView({ onVideoSelected }: PlaygroundViewProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadPlaygroundVideos()
  }, [])

  const loadPlaygroundVideos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch real videos from the TwelveLabs index
      const videos = await getVideosFromIndex(API_CONFIG.defaultCredentials.playgroundIndexId)
      
      if (videos && videos.length > 0) {
        // Ensure all video data is properly typed
        const safeVideos = videos.map((video: any) => ({
          id: String(video.id || ''),
          title: String(video.title || 'Unknown Video'),
          description: String(video.description || 'Video available for recursive enhancement'),
          thumbnail: video.thumbnail || null,
          hls_url: video.hls_url || null,
          duration: Number(video.duration) || 0,
          confidence_score: video.confidence_score ? Number(video.confidence_score) : null,
          created_at: String(video.created_at || ''),
          updated_at: video.updated_at ? String(video.updated_at) : undefined
        }))
        setVideos(safeVideos)
      } else {
        setVideos([])
      }
    } catch (error) {
      console.error('Failed to load playground videos:', error)
      setError(error instanceof Error ? error.message : 'Failed to load videos')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  const refreshVideos = () => {
    loadPlaygroundVideos()
  }

  const filteredVideos = videos.filter(video => {
    return (video.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (video.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  })

  const formatDuration = (seconds: number | string | null | undefined): string => {
    // Handle various input types safely
    const numSeconds = typeof seconds === 'string' ? parseFloat(seconds) : (seconds || 0)
    if (!numSeconds || numSeconds === 0 || isNaN(numSeconds)) return 'N/A'
    const mins = Math.floor(numSeconds / 60)
    const secs = Math.round(numSeconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Unknown'
    }
  }

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
    if (onVideoSelected) {
      onVideoSelected(video)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-600">Loading videos from index...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={refreshVideos}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Refresh videos"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-800">{error}</p>
              <p className="text-xs text-gray-600 mt-1">Showing sample videos instead</p>
            </div>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleVideoSelect(video)}
          >
            {/* Video Thumbnail */}
            <div className="relative h-48 bg-gradient-to-br from-primary-100 to-primary-200">
              {video.thumbnail ? (
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white opacity-80" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.duration)}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                <div className="opacity-0 hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {video.description ? video.description : 'Click to select for recursive enhancement'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{formatDate(video.created_at)}</span>
                <button 
                  className="text-primary-600 hover:text-primary-700 font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onVideoSelected) {
                      onVideoSelected(video)
                    }
                  }}
                >
                  Select for Enhancement
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm 
              ? 'No videos found matching your search.' 
              : 'No videos available in this index yet.'}
          </p>
          {videos.length === 0 && (
            <button
              onClick={refreshVideos}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Retry Loading
            </button>
          )}
        </div>
      )}

      {/* Video Count */}
      {videos.length > 0 ? (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredVideos.length} of {videos.length} videos from index
        </div>
      ) : null}

      {/* Simple Video Selection Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{selectedVideo.title}</h2>
            
            {/* Video Preview */}
            <div className="aspect-video bg-black rounded-lg mb-4 relative overflow-hidden">
              {selectedVideo.hls_url ? (
                <HLSVideoPlayer
                  videoId={selectedVideo.id}
                  className="w-full h-full"
                  poster={selectedVideo.thumbnail}
                />
              ) : selectedVideo.thumbnail ? (
                <img 
                  src={selectedVideo.thumbnail} 
                  alt={selectedVideo.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Play className="w-16 h-16 text-white opacity-80" />
                </div>
              )}
            </div>
            
            {/* Video Details */}
            <div className="space-y-3 mb-6">
              <p className="text-gray-600">
                {selectedVideo.description || 'Video available for recursive enhancement'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium">{formatDuration(selectedVideo.duration)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Added:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedVideo.created_at)}</span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setSelectedVideo(null)}
              >
                Close
              </button>
              <button 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isEnhancing}
                onClick={() => {
                  if (onVideoSelected && !isEnhancing) {
                    setIsEnhancing(true)
                    onVideoSelected(selectedVideo)
                    setSelectedVideo(null)
                  }
                }}
              >
                {isEnhancing ? (
                  <>
                    <div className="w-4 h-4 inline mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Starting Enhancement...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 inline mr-2" />
                    Use for Recursive Enhancement
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}