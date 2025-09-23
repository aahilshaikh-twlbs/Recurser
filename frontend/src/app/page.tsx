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
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-primary-600">Recurser</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Generate and enhance AI videos through recursive prompt optimization.
              Achieve higher quality with each iteration using cutting-edge AI models.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href="/playground"
                className="group px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Video className="w-5 h-5" />
                <span className="font-semibold">Explore Playground</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/enhance"
                className="group px-6 py-3 bg-white text-gray-900 rounded-lg border-2 border-gray-300 hover:border-primary-600 transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Start Enhancing</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Features Section - Compact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Three powerful steps to create perfect AI videos
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={`feature-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="bg-white rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group border border-gray-200"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-primary-100 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      {feature.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-20"></div>
        </div>
      </div>
    </div>
  )
}