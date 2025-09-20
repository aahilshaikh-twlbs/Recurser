'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Play, 
  Zap, 
  Target, 
  BarChart3, 
  ArrowRight,
  Video,
  Upload,
  Sparkles
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

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
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-primary-600">Recurser</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Generate and enhance AI videos through recursive prompt optimization.
              Achieve higher quality with each iteration using cutting-edge AI models.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/playground"
                className="group px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Video className="w-5 h-5" />
                <span className="font-semibold">Explore Playground</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/enhance"
                className="group px-8 py-4 bg-white text-gray-900 rounded-lg border-2 border-gray-300 hover:border-primary-600 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Start Enhancing</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-20"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600">
            Three powerful steps to create perfect AI videos
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={`feature-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              className="card hover:shadow-xl transition-shadow cursor-pointer group"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Playground Card */}
          <Link href="/playground" className="group">
            <div className="card hover:shadow-xl transition-all hover:-translate-y-1 h-full">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Play className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    Playground Mode
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Explore our collection of pre-generated videos. Test the recursive enhancement
                    system with sample content using our default API keys.
                  </p>
                  <div className="flex items-center text-primary-600 font-medium">
                    <span>Browse Videos</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Custom Mode Card */}
          <Link href="/enhance" className="group">
            <div className="card hover:shadow-xl transition-all hover:-translate-y-1 h-full">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    Custom Enhancement
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Generate new videos or upload existing ones. Use your own API keys to create
                    and enhance videos with full control.
                  </p>
                  <div className="flex items-center text-primary-600 font-medium">
                    <span>Start Creating</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}