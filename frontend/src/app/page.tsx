'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Upload, Zap, Target, BarChart3, Settings } from 'lucide-react'
import VideoGenerationForm from '@/components/VideoGenerationForm'
import VideoUploadForm from '@/components/VideoUploadForm'
import ProjectStatus from '@/components/ProjectStatus'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate')
  const [currentProject, setCurrentProject] = useState<any>(null)

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
      description: 'Automatically improve prompts using Pegasus 1.2 until quality threshold is met'
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: 'Smart Optimization',
      description: 'Continuous refinement until optimal video quality is achieved'
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
          Circuit Validator
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          The intelligent AI video generation validator that continuously improves your prompts 
          until peak output quality is achieved. Powered by Google Veo, Marengo 2.7, and Pegasus 1.2.
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
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
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

      {/* Main Action Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
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
          />
        ) : (
          <VideoUploadForm 
            onProjectCreated={setCurrentProject}
          />
        )}
      </motion.div>

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

      {/* How It Works */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="card"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold">
              1
            </div>
            <h3 className="font-semibold text-gray-900">Input & Generate</h3>
            <p className="text-sm text-gray-600">
              Provide your video prompt or upload an existing video. Our system generates 
              or analyzes the content using state-of-the-art AI models.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold">
              2
            </div>
            <h3 className="font-semibold text-gray-900">Analyze & Score</h3>
            <p className="text-sm text-gray-600">
              Marengo 2.7 analyzes video quality, consistency, and AI artifacts. 
              Pegasus 1.2 provides intelligent improvement suggestions.
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold">
              3
            </div>
            <h3 className="font-semibold text-gray-900">Iterate & Improve</h3>
            <p className="text-sm text-gray-600">
              The system automatically refines prompts and regenerates videos until 
              your quality threshold is met, ensuring optimal results.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
