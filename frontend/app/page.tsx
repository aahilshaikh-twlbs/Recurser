'use client'

import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Spinner } from '../components/ui/spinner'
import { Progress } from '../components/ui/progress'

interface VideoData {
  video_id: number
  prompt: string
  status: string
  video_path?: string
  confidence_threshold: number
  progress: number
  generation_id?: string
  error_message?: string
  index_id?: string
  twelvelabs_video_id?: string
  created_at: string
  updated_at: string
  analysis_results?: {
    analysis_type: string
    quality_score: number
    ai_detection_score: number
    created_at: string
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('generate')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('Ready to process')
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentIteration, setCurrentIteration] = useState(0)
  const [maxIterations, setMaxIterations] = useState(5)
  const [formData, setFormData] = useState({
    prompt: '',
    confidenceThreshold: 50,
    maxRetries: 5,
    indexId: '',
    twelvelabsApiKey: ''
  })
  const [uploadData, setUploadData] = useState({
    originalPrompt: '',
    confidenceThreshold: 50,
    indexId: '',
    twelvelabsApiKey: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [progressLogs, setProgressLogs] = useState<string[]>([])

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.prompt.trim()) {
      setStatus('Please enter a video description')
      return
    }

    // Index ID and API Key are now optional - backend has hardcoded fallbacks

    setIsLoading(true)
    setStatus('Starting video generation...')
    setProgress(0)
    setCurrentIteration(0)
    setMaxIterations(formData.maxRetries)

    try {
      const response = await fetch('http://localhost:8000/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formData.prompt,
          confidence_threshold: formData.confidenceThreshold,
          max_retries: formData.maxRetries,
          index_id: formData.indexId,
          twelvelabs_api_key: formData.twelvelabsApiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Backend error:', errorData)
        throw new Error(errorData.detail || errorData.message || 'Failed to generate video')
      }

      const result = await response.json()
      setCurrentVideoId(result.data.video_id)
      setStatus(`Video generation started! ID: ${result.data.video_id}`)
      
      // Start progress tracking
      startProgressTracking(result.data.video_id)
      
    } catch (error) {
      console.error('Error generating video:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to generate video'}`)
      setIsLoading(false)
    }
  }

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setStatus('Please select a video file')
      return
    }

    // Index ID and API Key are now optional - backend has hardcoded fallbacks

    setIsLoading(true)
    setStatus('Uploading video...')
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('original_prompt', uploadData.originalPrompt)
      formData.append('confidence_threshold', uploadData.confidenceThreshold.toString())
      formData.append('index_id', uploadData.indexId)
      formData.append('twelvelabs_api_key', uploadData.twelvelabsApiKey)

      const response = await fetch('http://localhost:8000/api/videos/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || 'Failed to upload video')
      }

      const result = await response.json()
      setCurrentVideoId(result.data.video_id)
      setStatus(`Video uploaded successfully! ID: ${result.data.video_id}`)
      setProgress(100)
      setIsLoading(false)
      
    } catch (error) {
      console.error('Error uploading video:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to upload video'}`)
      setIsLoading(false)
    }
  }

  const handleGradeVideo = async () => {
    if (!currentVideoId || !formData.indexId || !formData.twelvelabsApiKey) {
      setStatus('Please generate or upload a video first')
      return
    }

    setIsLoading(true)
    setStatus('Running AI detection analysis...')
    setProgress(0)

    try {
      const response = await fetch(`http://localhost:8000/api/videos/${currentVideoId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index_id: formData.indexId,
          twelvelabs_api_key: formData.twelvelabsApiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || 'Failed to grade video')
      }

      const result = await response.json()
      setAnalysisResults(result.data)
      setShowAnalysis(true)
      setStatus('AI detection analysis completed!')
      setIsLoading(false)
      
    } catch (error) {
      console.error('Error grading video:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to grade video'}`)
      setIsLoading(false)
    }
  }

  const startProgressTracking = async (videoId: number) => {
    const checkProgress = async () => {
      try {
        // Fetch status and logs in parallel
        const [statusResponse, logsResponse] = await Promise.all([
          fetch(`http://localhost:8000/api/videos/${videoId}/status`),
          fetch(`http://localhost:8000/api/videos/${videoId}/logs`)
        ])
        
        if (statusResponse.ok) {
          const data = await statusResponse.json()
          const videoData = data.data
          
          setProgress(videoData.progress || 0)
          
          // Update progress logs
          if (logsResponse.ok) {
            const logsData = await logsResponse.json()
            if (logsData.success) {
              setProgressLogs(logsData.data.logs)
            }
          }
          
          if (videoData.status === 'generating') {
            setStatus(`Generating video... Progress: ${videoData.progress}%`)
          } else if (videoData.status === 'analyzing') {
            setStatus(`Analyzing video... Progress: ${videoData.progress}%`)
          } else if (videoData.status === 'completed') {
            setStatus(`✅ Video generated successfully!`)
            setIsLoading(false)
            setFormData(prev => ({ ...prev, prompt: '' }))
            setCurrentVideoId(videoId)
            setProgress(100)
          } else if (videoData.status === 'failed') {
            setStatus(`❌ Generation failed: ${videoData.error_message}`)
            setIsLoading(false)
            setCurrentVideoId(null)
            setProgress(0)
          } else {
            // Continue tracking
            setTimeout(checkProgress, 2000)
          }
        }
      } catch (error) {
        console.error('Progress tracking error:', error)
        setTimeout(checkProgress, 5000)
      }
    }
    
    checkProgress()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const getStatusMessage = () => {
    if (isLoading) {
      if (progress < 25) return "Initializing video generation..."
      if (progress < 50) return "Generating video with Veo2..."
      if (progress < 75) return "Uploading to TwelveLabs..."
      if (progress < 100) return "Finalizing..."
      return "Processing..."
    }
    return status
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getQualityLabel = (score: number) => {
    if (score >= 80) return "High Quality"
    if (score >= 60) return "Medium Quality"
    return "Low Quality"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">RV</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Recurser Validator</h1>
                <p className="text-xs text-slate-500 -mt-1">AI Video Generation & Quality Validation</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-sm text-slate-500">
                  {isLoading ? 'Processing...' : 'System Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            AI Video Generation & Quality Validation
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Generate high-quality videos with recursive improvement or validate existing AI-generated content using advanced AI detection models.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex bg-white/60 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-slate-200/50">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 py-4 px-8 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'generate'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              🎬 Generate Video
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 px-8 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              📁 Upload Video
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'generate' && (
            <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎬 Generate New Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateVideo} className="space-y-6">
                  {/* API Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        TwelveLabs Index ID <span className="text-slate-400">(optional)</span>
                      </label>
                      <Input
                        value={formData.indexId}
                        onChange={(e) => setFormData(prev => ({ ...prev, indexId: e.target.value }))}
                        placeholder="Leave empty to use default index"
                        className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        TwelveLabs API Key <span className="text-slate-400">(optional)</span>
                      </label>
                      <Input
                        type="password"
                        value={formData.twelvelabsApiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, twelvelabsApiKey: e.target.value }))}
                        placeholder="Leave empty to use default key"
                        className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                  </div>

                  {/* Video Description */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Video Description
                    </label>
                    <Textarea
                      rows={4}
                      value={formData.prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Describe the video you want to generate..."
                      className="resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                    <p className="text-sm text-slate-500 text-right">
                      {formData.prompt.length}/1000 characters
                    </p>
                  </div>

                  {/* Quality Threshold */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Quality Threshold
                      </label>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-blue-600">{formData.confidenceThreshold}%</span>
                        <div className="text-xs text-slate-500 mt-1">
                          {formData.confidenceThreshold < 50 ? 'Low' : 
                           formData.confidenceThreshold < 80 ? 'Medium' : 'High'} quality
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.confidenceThreshold}
                        onChange={(e) => setFormData(prev => ({ ...prev, confidenceThreshold: parseInt(e.target.value) }))}
                        className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer slider hover:bg-slate-300 transition-colors duration-200"
                      />
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>How it works:</strong> The system will generate your video and then run AI detection analysis. 
                        If the quality score is below this threshold, it will automatically regenerate with an improved prompt.
                      </p>
                    </div>
                  </div>

                  {/* Max Retries */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Maximum Retries
                    </label>
                    <select
                      value={formData.maxRetries}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-blue-400/20"
                    >
                      <option value={1}>1 retry</option>
                      <option value={3}>3 retries</option>
                      <option value={5}>5 retries</option>
                      <option value={10}>10 retries</option>
                      <option value={-1}>Unlimited (Beta)</option>
                    </select>
                    {formData.maxRetries === -1 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <span className="text-yellow-400">⚠️</span>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Unlimited Retries (Beta)</h3>
                            <div className="mt-1 text-sm text-yellow-700">
                              <p>This will keep regenerating until perfect quality is achieved.</p>
                              <p className="font-semibold">Warning: This can take a very long time and consume significant credits!</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.prompt.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" className="text-white" />
                        Generating...
                      </div>
                    ) : (
                      '🚀 Generate Video'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'upload' && (
            <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📁 Upload & Validate Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadVideo} className="space-y-6">
                  {/* API Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        TwelveLabs Index ID <span className="text-slate-400">(optional)</span>
                      </label>
                      <Input
                        value={uploadData.indexId}
                        onChange={(e) => setUploadData(prev => ({ ...prev, indexId: e.target.value }))}
                        placeholder="Leave empty to use default index"
                        className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        TwelveLabs API Key <span className="text-slate-400">(optional)</span>
                      </label>
                      <Input
                        type="password"
                        value={uploadData.twelvelabsApiKey}
                        onChange={(e) => setUploadData(prev => ({ ...prev, twelvelabsApiKey: e.target.value }))}
                        placeholder="Leave empty to use default key"
                        className="border-slate-200 focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Video File
                    </label>
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all duration-200 group">
                      <div className="space-y-3">
                        <div className="text-5xl group-hover:scale-110 transition-transform duration-200">📹</div>
                        <p className="text-lg font-medium text-slate-800">
                          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-sm text-slate-600">MP4, MOV, AVI up to 200MB</p>
                        <div className="pt-2">
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            className="border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                            onClick={() => document.getElementById('file-upload')?.click()}
                          >
                            Choose File
                          </Button>
                        </div>
                      </div>
                      <input 
                        id="file-upload"
                        type="file" 
                        className="hidden" 
                        accept="video/*" 
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  {/* Original Prompt */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Original Prompt (Optional)
                    </label>
                    <Textarea
                      rows={3}
                      value={uploadData.originalPrompt}
                      onChange={(e) => setUploadData(prev => ({ ...prev, originalPrompt: e.target.value }))}
                      placeholder="Enter the original prompt that was used to generate this video..."
                      className="resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !selectedFile}
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" className="text-white" />
                        Uploading...
                      </div>
                    ) : (
                      '📁 Upload Video'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Status Section */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  {isLoading && <Spinner size="sm" className="text-yellow-500" />}
                  <p className="text-slate-700 font-medium">{getStatusMessage()}</p>
                </div>
                {isLoading && (
                  <>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    {currentIteration > 0 && (
                      <p className="text-slate-600 text-sm">
                        Iteration {currentIteration} of {maxIterations} - Quality improvement cycle
                      </p>
                    )}
                    
                    {/* Live Progress Logs */}
                    {progressLogs.length > 0 && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Live Progress Log:</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {progressLogs.map((log, index) => (
                            <div key={index} className="text-xs text-slate-600 font-mono">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Video Player Section */}
          {currentVideoId && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎬 Generated Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    <video 
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                    >
                      <source src={`http://localhost:8000/api/videos/${currentVideoId}/play`} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={handleGradeVideo}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      🔍 Run AI Detection Analysis
                    </Button>
                    <Button 
                      onClick={() => {
                        setCurrentVideoId(null)
                        setProgress(0)
                        setIsLoading(false)
                        setShowAnalysis(false)
                        setAnalysisResults(null)
                      }}
                      variant="outline"
                    >
                      Generate Another Video
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results Section */}
          {showAnalysis && analysisResults && (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔍 AI Detection Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Quality Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h3 className="font-semibold text-slate-700 mb-2">Quality Score</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-3xl font-bold ${getQualityColor(analysisResults.quality_score)}`}>
                          {analysisResults.quality_score.toFixed(1)}%
                        </span>
                        <span className="text-sm text-slate-600">
                          {getQualityLabel(analysisResults.quality_score)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h3 className="font-semibold text-slate-700 mb-2">AI Detection Score</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-3xl font-bold ${getQualityColor(100 - analysisResults.ai_detection_score)}`}>
                          {(100 - analysisResults.ai_detection_score).toFixed(1)}%
                        </span>
                        <span className="text-sm text-slate-600">
                          {analysisResults.ai_detection_score > 50 ? 'Likely AI Generated' : 'Likely Human Created'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700">Detailed Analysis</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <strong>Marengo Search Results:</strong> {analysisResults.search_results?.length || 0} AI indicators found
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Pegasus Analysis:</strong> {analysisResults.analysis_results?.length || 0} detailed analyses completed
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {analysisResults.quality_score < 50 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-yellow-800 mb-2">Recommendations</h3>
                      <p className="text-sm text-yellow-700">
                        The video quality is below the threshold. Consider regenerating with an improved prompt or adjusting the quality threshold.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }
      `}</style>
    </div>
  )
}