'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Download, Info, Search, Filter } from 'lucide-react'
import { API_CONFIG, apiRequest } from '@/lib/config'

interface Video {
  id: string
  title: string
  description: string
  thumbnail?: string
  duration: number
  confidence_score?: number
  created_at: string
}

export default function PlaygroundView() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterScore, setFilterScore] = useState(0)

  useEffect(() => {
    loadPlaygroundVideos()
  }, [])

  const loadPlaygroundVideos = async () => {
    try {
      setLoading(true)
      // For now, we'll use mock data. In production, this would fetch from the index
      const mockVideos: Video[] = [
        {
          id: '1',
          title: 'Sunset Timelapse',
          description: 'A beautiful sunset timelapse over mountains',
          duration: 30,
          confidence_score: 92,
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          title: 'Ocean Waves',
          description: 'Calming ocean waves on a beach',
          duration: 45,
          confidence_score: 88,
          created_at: '2024-01-14T15:30:00Z'
        },
        {
          id: '3',
          title: 'City Night Lights',
          description: 'Urban cityscape with vibrant night lights',
          duration: 60,
          confidence_score: 95,
          created_at: '2024-01-13T20:00:00Z'
        },
        {
          id: '4',
          title: 'Forest Walk',
          description: 'POV walking through a dense forest',
          duration: 40,
          confidence_score: 85,
          created_at: '2024-01-12T08:00:00Z'
        }
      ]
      setVideos(mockVideos)
    } catch (error) {
      console.error('Failed to load playground videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          video.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesScore = !filterScore || (video.confidence_score && video.confidence_score >= filterScore)
    return matchesSearch && matchesScore
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
        </div>
      </div>

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
            {/* Video Thumbnail Placeholder */}
            <div className="relative h-48 bg-gradient-to-br from-primary-100 to-primary-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-12 h-12 text-white opacity-80" />
              </div>
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.duration)}
              </div>
              {video.confidence_score && (
                <div className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                  {video.confidence_score}% Score
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{video.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{formatDate(video.created_at)}</span>
                <div className="flex space-x-2">
                  <button className="hover:text-primary-600">
                    <Play className="w-4 h-4" />
                  </button>
                  <button className="hover:text-primary-600">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="hover:text-primary-600">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No videos found matching your criteria.</p>
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
            className="bg-white rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">{selectedVideo.title}</h2>
            <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-4 flex items-center justify-center">
              <Play className="w-16 h-16 text-white opacity-80" />
            </div>
            <p className="text-gray-600 mb-4">{selectedVideo.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>Duration: {formatDuration(selectedVideo.duration)}</span>
              {selectedVideo.confidence_score && (
                <span>Confidence Score: {selectedVideo.confidence_score}%</span>
              )}
              <span>Created: {formatDate(selectedVideo.created_at)}</span>
            </div>
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setSelectedVideo(null)}
              >
                Close
              </button>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Download className="w-4 h-4 inline mr-2" />
                Download
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
