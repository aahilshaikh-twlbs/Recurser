'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Download, Info, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react'
import { API_CONFIG, apiRequest } from '@/lib/config'

interface Video {
  id: string
  title: string
  description: string
  thumbnail?: string
  duration: number
  confidence_score?: number
  created_at: string
  updated_at?: string
}

export default function PlaygroundView() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScore, setFilterScore] = useState(0)

  useEffect(() => {
    loadPlaygroundVideos()
  }, [])

  const loadPlaygroundVideos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch real videos from the TwelveLabs index
      const response = await apiRequest(
        API_CONFIG.endpoints.listIndexVideos(API_CONFIG.defaultCredentials.playgroundIndexId),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setVideos(result.data.videos || [])
      } else {
        setError('Failed to load videos from index')
        setVideos([])
      }
    } catch (error) {
      console.error('Failed to load playground videos:', error)
      setError(error instanceof Error ? error.message : 'Failed to load videos')
      
      // Fallback to mock data if API fails
      const mockVideos: Video[] = [
        {
          id: '1',
          title: 'Sample Video 1',
          description: 'This is a sample video from the playground index',
          duration: 30,
          confidence_score: 92,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Sample Video 2',
          description: 'Another sample video for testing',
          duration: 45,
          confidence_score: 88,
          created_at: new Date().toISOString()
        }
      ]
      setVideos(mockVideos)
    } finally {
      setLoading(false)
    }
  }

  const refreshVideos = () => {
    loadPlaygroundVideos()
  }

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesScore = !filterScore || (video.confidence_score && video.confidence_score >= filterScore)
    return matchesSearch && matchesScore
  })

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
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
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
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
        <div className="flex items-center space-x-2">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            value={filterScore}
            onChange={(e) => setFilterScore(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={0}>All Scores</option>
            <option value={80}>80+ Score</option>
            <option value={85}>85+ Score</option>
            <option value={90}>90+ Score</option>
            <option value={95}>95+ Score</option>
          </select>
          <button
            onClick={refreshVideos}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh videos"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
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
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedVideo(video)}
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
              {video.confidence_score && (
                <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                  {Math.round(video.confidence_score)}% Score
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {video.description || 'No description available'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{formatDate(video.created_at)}</span>
                <div className="flex space-x-2">
                  <button 
                    className="hover:text-primary-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Play functionality
                    }}
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button 
                    className="hover:text-primary-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Download functionality
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    className="hover:text-primary-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedVideo(video)
                    }}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm || filterScore > 0 
              ? 'No videos found matching your criteria.' 
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
      {videos.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredVideos.length} of {videos.length} videos from index
        </div>
      )}

      {/* Selected Video Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{selectedVideo.title}</h2>
            
            {/* Video Preview */}
            <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-4 relative overflow-hidden">
              {selectedVideo.thumbnail ? (
                <img 
                  src={selectedVideo.thumbnail} 
                  alt={selectedVideo.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-16 h-16 text-white opacity-80" />
                </div>
              )}
            </div>
            
            {/* Video Details */}
            <div className="space-y-3 mb-4">
              <p className="text-gray-600">
                {selectedVideo.description || 'No description available'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium">{formatDuration(selectedVideo.duration)}</span>
                </div>
                {selectedVideo.confidence_score && (
                  <div>
                    <span className="text-gray-500">Confidence Score:</span>
                    <span className="ml-2 font-medium">{Math.round(selectedVideo.confidence_score)}%</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedVideo.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Video ID:</span>
                  <span className="ml-2 font-mono text-xs">{selectedVideo.id.substring(0, 8)}...</span>
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
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Download className="w-4 h-4 inline mr-2" />
                Download Video
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}