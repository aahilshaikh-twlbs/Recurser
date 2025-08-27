'use client'

import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Spinner } from '../components/ui/spinner'
import { Progress } from '../components/ui/progress'

export default function Home() {
  const [activeTab, setActiveTab] = useState('generate')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('Ready to process')
  const [formData, setFormData] = useState({
    prompt: '',
    confidenceThreshold: 85
  })

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.prompt.trim()) {
      setStatus('Please enter a video description')
      return
    }

    setIsLoading(true)
    setStatus('Generating video...')

    try {
              const response = await fetch('http://localhost:8000/api/videos/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: formData.prompt,
            confidence_threshold: formData.confidenceThreshold
          })
        })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Backend error:', errorData)
        throw new Error(errorData.detail || errorData.message || 'Failed to generate video')
      }

      const result = await response.json()
      setStatus(`Video generation started! ${result.message || ''}`)
      
              // Reset form
        setFormData({ prompt: '', confidenceThreshold: 85 })
      
    } catch (error) {
      console.error('Error generating video:', error)
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to generate video'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Upload functionality coming soon...')
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, prompt: e.target.value }))
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Recurser Validator</h1>
                <p className="text-xs text-slate-500 -mt-1">AI Video Generation & Validation</p>
              </div>
              {/* Connection Status */}
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
            AI Video Generation & Validation
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Generate new videos with recursive improvement or validate existing AI-generated content using advanced AI models.
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
                  {/* Video Description */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Video Description
                    </label>
                    <Textarea
                      rows={4}
                      value={formData.prompt}
                      onChange={handlePromptChange}
                      placeholder="Describe the video you want to generate..."
                      className="resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                    <p className="text-sm text-slate-500 text-right">
                      {formData.prompt.length}/1000 characters
                    </p>
                  </div>

                  {/* Confidence Threshold */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Confidence Threshold
                      </label>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-blue-600">{formData.confidenceThreshold}%</span>
                        <div className="text-xs text-slate-500 mt-1">
                          {formData.confidenceThreshold < 70 ? 'Low' : 
                           formData.confidenceThreshold < 90 ? 'Medium' : 'High'} confidence
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
                        <strong>How it works:</strong> First, the AI generates your video. Then, this threshold determines how much analysis and improvement to apply.
                        Higher thresholds mean more refinement until quality standards are met.
                      </p>
                    </div>
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
                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Video File
                    </label>
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all duration-200 group">
                      <div className="space-y-3">
                        <div className="text-5xl group-hover:scale-110 transition-transform duration-200">📹</div>
                        <p className="text-lg font-medium text-slate-800">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-slate-600">MP4, MOV, AVI up to 200MB</p>
                        <div className="pt-2">
                          <Button variant="outline" size="sm" className="border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600">
                            Choose File
                          </Button>
                        </div>
                      </div>
                      <input type="file" className="hidden" accept="video/*" />
                    </div>
                  </div>

                  {/* Original Prompt */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Original Prompt
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Enter the original prompt that was used to generate this video..."
                      className="resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                  </div>

                  {/* Validation Threshold */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Validation Threshold
                      </label>
                      <span className="text-2xl font-bold text-green-600">85%</span>
                    </div>
                    
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue={85}
                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer slider hover:bg-slate-300 transition-colors duration-200"
                      />
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>Validation process:</strong> The AI will analyze your video against the original prompt and provide improvement suggestions.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                    size="lg"
                  >
                    🔍 Validate Video
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Status Section */}
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
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
                  <p className="text-slate-700 font-medium">{status}</p>
                </div>
                {isLoading && (
                  <>
                    <Progress value={75} className="mb-3" />
                    <p className="text-slate-600 text-sm">Please wait while the AI processes your request...</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
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
