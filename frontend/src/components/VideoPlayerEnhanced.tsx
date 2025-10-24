'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, Download } from 'lucide-react'

// Dynamically import HLS.js
const Hls = typeof window !== 'undefined' ? require('hls.js') : null

interface VideoPlayerEnhancedProps {
  videoId: number
  thumbnailUrl?: string
  className?: string
}

export default function VideoPlayerEnhanced({ videoId, thumbnailUrl, className = '' }: VideoPlayerEnhancedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoType, setVideoType] = useState<'local' | 'hls' | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    let mounted = true

    const initializeVideo = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get video info first
        const infoResponse = await fetch(`/api/videos/${videoId}/info`)
        if (!infoResponse.ok) throw new Error('Failed to get video info')
        
        const info = await infoResponse.json()
        console.log('📋 Video info:', info)
        
        if (info.type === 'local' && info.local_available) {
          // Local MP4 available
          if (mounted) {
            setVideoType('local')
            setVideoUrl(`/api/videos/${videoId}/play`)
            console.log('📹 Using local MP4 for video', videoId)
          }
        } else if (info.type === 'hls' && info.hls_url) {
          // HLS stream available
          if (mounted) {
            setVideoType('hls')
            setVideoUrl(info.hls_url)
            console.log('📡 Using HLS stream for video', videoId)
            console.log('🎬 HLS URL:', info.hls_url)
          }
        } else {
          throw new Error(info.error || 'No video source available')
        }
      } catch (err) {
        console.error('Error initializing video:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load video')
          setIsLoading(false)
        }
      }
    }

    initializeVideo()

    return () => {
      mounted = false
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch (e) {
          console.warn('Error destroying HLS instance:', e)
        }
        hlsRef.current = null
      }
    }
  }, [videoId])

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return

    const video = videoRef.current

    if (videoType === 'hls' && Hls && Hls.isSupported()) {
      // Initialize HLS.js
      console.log('🎬 Initializing HLS.js for', videoUrl)
      
      try {
        const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: Infinity,
        liveDurationInfinity: true,
        enableWebVTT: false,
        enableCEA708Captions: false,
        stretchShortVideoTrack: false,
        forceKeyFrameOnDiscontinuity: true,
        abrEwmaFastLive: 3,
        abrEwmaSlowLive: 9,
        abrEwmaFastVoD: 3,
        abrEwmaSlowVoD: 9,
        abrEwmaDefaultEstimate: 5000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        minAutoBitrate: 0,
        emeEnabled: false,
        widevineLicenseUrl: undefined,
        licenseXhrSetup: undefined,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 64000,
        startLevel: undefined,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 64000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,
        startFragPrefetch: false,
        testBandwidth: true,
        progressive: false
      })

        hlsRef.current = hls
        hls.loadSource(videoUrl)
        hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed successfully')
        setIsLoading(false)
        // Try to autoplay
        video.play().catch((e) => {
          console.log('Autoplay prevented (normal):', e.message)
        })
      })
      
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        console.log('📊 HLS level loaded')
      })
      
      hls.on(Hls.Events.FRAG_LOADED, () => {
        console.log('🧩 HLS fragment loaded')
      })

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error('HLS Error:', event, data)
          
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
                setError(`HLS Error: ${data.details}`)
                hls.destroy()
                break
            }
          }
        })

        return () => {
          hls.destroy()
        }
      } catch (error) {
        console.error('Failed to initialize HLS:', error)
        setError('Failed to initialize HLS player')
        setIsLoading(false)
      }
    } else if (videoType === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('🎬 Using native HLS support')
      video.src = videoUrl
      video.addEventListener('loadedmetadata', () => setIsLoading(false))
      video.addEventListener('error', (e) => {
        console.error('Native HLS error:', e)
        setError('Failed to play HLS stream')
      })
    } else if (videoType === 'hls') {
      // HLS not supported
      console.error('❌ HLS not supported in this browser')
      setError('HLS streaming is not supported in this browser. Please use Chrome, Firefox, or Safari.')
      setIsLoading(false)
    } else if (videoType === 'local') {
      // Local MP4 file
      console.log('🎬 Playing local MP4')
      video.src = videoUrl
      video.addEventListener('loadedmetadata', () => setIsLoading(false))
      video.addEventListener('error', (e) => {
        console.error('Video error:', e)
        setError('Failed to play video')
      })
    }

    // Video event listeners
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoUrl, videoType])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(console.warn)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    if (videoType === 'local' && videoUrl) {
      const a = document.createElement('a')
      a.href = videoUrl
      a.download = `video_${videoId}.mp4`
      a.click()
    } else if (videoType === 'hls' && videoUrl) {
      window.open(videoUrl, '_blank')
    }
  }

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Video Unavailable</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        poster={thumbnailUrl}
        playsInline
        controls={false}
        preload="metadata"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-3" />
            <p className="text-white text-sm">
              {videoType === 'hls' ? 'Loading HLS stream...' : 'Loading video...'}
            </p>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      {!isLoading && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="bg-gray-700 rounded-full h-1 relative">
              <div 
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={togglePlay}
                className="text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button 
                onClick={toggleMute}
                className="text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            <div className="flex items-center space-x-1">
              {videoType && (
                <span className="text-xs text-gray-400 mr-2">
                  {videoType === 'hls' ? '📡 HLS' : '📹 MP4'}
                </span>
              )}
              <button 
                onClick={handleDownload}
                className="text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                title={videoType === 'hls' ? 'Open stream' : 'Download video'}
              >
                <Download size={20} />
              </button>
              <button 
                onClick={toggleFullscreen}
                className="text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
