'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Upload, Zap, Target, BarChart3, Settings, AlertTriangle, Video, Key, ArrowRight } from 'lucide-react'
import VideoGenerationForm from '@/components/VideoGenerationForm'
import VideoUploadForm from '@/components/VideoUploadForm'
import ProjectStatus from '@/components/ProjectStatus'
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

export default function HomePage() {
  const [mode, setMode] = useState<'playground' | 'custom'>('playground')
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate')
  const [currentProject, setCurrentProject] = useState<any>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
  const [customApiKeys, setCustomApiKeys] = useState({
    geminiKey: '',
    twelvelabsKey: '',
    indexId: ''
  })

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'AI Video Generation',
      description: 'Generate videos using Google Veo with intelligent prompt optimization'
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'Quality Validation',
      description: 'Analyze videos using Marengo 2.7 for AI detection and consistency'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Recursive Improvement',
      description: 'Automatically improve prompts using Pegasus 1.2 for optimal results'
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: 'Unlimited Iterations',
      description: 'Continue refining until you achieve the perfect video (Beta)'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-bold text-gray-900">
          Recurser
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          AI video generation with recursive enhancement. Continuously improve your prompts 
          until optimal quality is achieved. Powered by Google Veo, Marengo 2.7, and Pegasus 1.2.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={`feature-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            className="card text-center space-y-3"
          >
            <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-gray-900">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Mode Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center space-x-4"
      >
        <button
          onClick={() => setMode('playground')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            mode === 'playground' 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Video className="w-4 h-4 inline mr-2" />
          Playground Mode
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            mode === 'custom' 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Key className="w-4 h-4 inline mr-2" />
          Custom Mode (Your API Keys)
        </button>
      </motion.div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {mode === 'playground' ? (
          <div className="space-y-6">
            <div className="card">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Playground Mode
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Explore our collection of pre-generated videos and test the recursive enhancement system.
                  Using our default API keys and sample video index.
                </p>
              </div>
              <PlaygroundView onVideoSelected={setSelectedVideo} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Key Input Section */}
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Enter Your API Keys
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    To generate and upload your own videos, you'll need your own API keys.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gemini API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Your Gemini API key"
                        value={customApiKeys.geminiKey}
                        onChange={(e) => setCustomApiKeys({...customApiKeys, geminiKey: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TwelveLabs API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Your TwelveLabs API key"
                        value={customApiKeys.twelvelabsKey}
                        onChange={(e) => setCustomApiKeys({...customApiKeys, twelvelabsKey: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TwelveLabs Index ID
                      </label>
                      <input
                        type="text"
                        placeholder="Your TwelveLabs Index ID"
                        value={customApiKeys.indexId}
                        onChange={(e) => setCustomApiKeys({...customApiKeys, indexId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Generation/Upload Tabs */}
            <div className="card">
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('generate')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'generate'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Play className="w-4 h-4 inline mr-2" />
                    Generate New Video
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'upload'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload Existing Video
                  </button>
                </nav>
              </div>

              {activeTab === 'generate' ? (
                <VideoGenerationForm 
                  onProjectCreated={setCurrentProject}
                  apiKeys={customApiKeys}
                />
              ) : (
                <VideoUploadForm 
                  onProjectCreated={setCurrentProject}
                  apiKeys={customApiKeys}
                />
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Selected Video for Enhancement */}
      {selectedVideo && mode === 'playground' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card bg-blue-50 border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Selected Video: {selectedVideo.title}</h3>
              <p className="text-sm text-gray-600">Ready for recursive enhancement</p>
            </div>
            <button 
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              onClick={() => {
                // Start enhancement process with selected video
                setMode('custom')
                setActiveTab('generate')
                // TODO: Pass selectedVideo data to generation form
              }}
            >
              <ArrowRight className="w-4 h-4 inline mr-2" />
              Enhance This Video
            </button>
          </div>
        </motion.div>
      ) : null}

      {/* Project Status */}
      {currentProject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ProjectStatus project={currentProject} />
        </motion.div>
      )}

    </div>
  )
}