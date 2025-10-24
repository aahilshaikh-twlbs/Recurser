'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import HLS.js only on client side
const Hls = typeof window !== 'undefined' ? require('hls.js') : null

interface VideoPlayerProps {
  videoId: number
  thumbnailUrl?: string
  className?: string
}

export default function VideoPlayer({ videoId, thumbnailUrl, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isHLS, setIsHLS] = useState(false)
  const hlsRef = useRef<any>(null)

  useEffect(() => {
    const loadVideo = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch video info from backend
        const response = await fetch(`/api/videos/${videoId}/play`)
        
        if (response.headers.get('content-type')?.includes('video')) {
          // Direct video file response
          setVideoUrl(`/api/videos/${videoId}/play`)
          setIsHLS(false)
        } else {
          // JSON response with HLS info
          const data = await response.json()
          
          if (data.success && data.type === 'hls' && data.hls_url) {
            setVideoUrl(data.hls_url)
            setIsHLS(true)
          } else if (!response.ok) {
            throw new Error(data.detail || 'Failed to load video')
          }
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
    if (!videoUrl || !videoRef.current) return

    if (isHLS && Hls && Hls.isSupported()) {
      // Use HLS.js for HLS streams
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      })

      hlsRef.current = hls
      hls.loadSource(videoUrl)
      hls.attachMedia(videoRef.current)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play().catch(() => {
          // User interaction required, that's okay
        })
      })

      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error encountered, trying to recover')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error encountered, trying to recover')
              hls.recoverMediaError()
              break
            default:
              console.error('Fatal error, cannot recover')
              setError('Failed to load video stream')
              hls.destroy()
              break
          }
        }
      })

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
      }
    } else if (isHLS && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = videoUrl
    } else if (!isHLS) {
      // Regular MP4 video
      videoRef.current.src = videoUrl
    }
  }, [videoUrl, isHLS])

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center aspect-video ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Video Unavailable</h3>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        poster={thumbnailUrl}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={(e) => {
          console.error('Video error:', e)
          setError('Video playback error')
        }}
      >
        {!isHLS && videoUrl && (
          <source src={videoUrl} type="video/mp4" />
        )}
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
    </div>
  )
}
