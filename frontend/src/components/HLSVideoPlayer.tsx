'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react'

interface HLSVideoPlayerProps {
  videoId: string | number
  className?: string
  poster?: string
  autoPlay?: boolean
}

export default function HLSVideoPlayer({ 
  videoId, 
  className = '', 
  poster,
  autoPlay = false 
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hlsUrl, setHlsUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)

  useEffect(() => {
    const loadVideo = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // First try to get the video stream info
        const response = await fetch(`/api/videos/${videoId}/play`)
        const result = await response.json()

        if (result.success && result.data) {
          if (result.data.local_file_available) {
            // Use direct video file
            if (videoRef.current) {
              videoRef.current.src = `/api/videos/${videoId}/play`
              videoRef.current.load()
            }
          } else if (result.data.twelvelabs_available) {
            // Get HLS stream from TwelveLabs
            const streamResponse = await fetch(`/api/videos/${videoId}/stream`)
            const streamResult = await streamResponse.json()
            
            if (streamResult.success && streamResult.data.hls_url) {
              setHlsUrl(streamResult.data.hls_url)
              
              // Load HLS stream
              if (videoRef.current) {
                videoRef.current.src = streamResult.data.hls_url
                videoRef.current.load()
              }
            } else {
              throw new Error('HLS stream not available')
            }
          } else {
            throw new Error('Video not available')
          }
        } else {
          throw new Error(result.detail || 'Failed to load video')
        }
      } catch (err) {
        console.error('Error loading video:', err)
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setIsLoading(false)
      }
    }

    loadVideo()
  }, [videoId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = () => {
      setError('Video playback error')
      setIsLoading(false)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleError)
    }
  }, [hlsUrl])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Video Unavailable</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        controls={false}
        playsInline
        preload="metadata"
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setError('Video playback error')}
      >
        <source src={hlsUrl || ''} type="application/x-mpegURL" />
        <source src={`/api/videos/${videoId}/play`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          
          <button
            onClick={toggleMute}
            className="text-white hover:text-blue-400 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Play Button Overlay */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </button>
        </div>
      )}
    </div>
  )
}
