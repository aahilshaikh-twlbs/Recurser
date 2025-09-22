# Frontend Setup Guide

## 🎯 Overview

This guide provides detailed instructions for setting up the Recurser frontend, a modern React/Next.js application with real-time video enhancement monitoring.

## 📋 Prerequisites

- **Node.js 18+** (recommended: 20.x)
- **npm** or **yarn** package manager
- **Git** for version control
- **Backend API** running (see [Backend Setup Guide](./BACKEND_SETUP.md))

## 🚀 Quick Setup

### 1. Clone and Navigate

```bash
git clone https://github.com/aahilshaikh-twlbs/Recurser.git
cd Recurser/frontend
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or with yarn
yarn install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit with your backend URL
nano .env.local
```

**Required Environment Variables:**

```env
# Backend API URL
BACKEND_URL=http://localhost:8000

# For production deployment
# BACKEND_URL=https://your-backend-domain.com
```

### 4. Start Development Server

```bash
# Development mode with hot reload
npm run dev

# Or with yarn
yarn dev
```

### 5. Access Application

- **Local Development**: http://localhost:3000
- **Network Access**: http://your-ip:3000

## 📦 Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "framer-motion": "^10.0.0",
    "lucide-react": "^0.300.0",
    "tailwindcss": "^3.0.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "eslint": "^8.0.0",
    "postcss": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── enhance/           # Video enhancement page
│   │   │   └── page.tsx
│   │   ├── playground/        # Video playground
│   │   │   └── page.tsx
│   │   ├── status/            # Project status page
│   │   │   └── page.tsx
│   │   ├── api/               # API routes
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   ├── index/
│   │   │   │   └── [indexId]/
│   │   │   │       └── videos/
│   │   │   │           └── route.ts
│   │   │   └── videos/
│   │   │       ├── generate/
│   │   │       │   └── route.ts
│   │   │       └── upload/
│   │   │           └── route.ts
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ProjectStatus.tsx  # Real-time status display
│   │   ├── VideoGenerationForm.tsx
│   │   ├── VideoUploadForm.tsx
│   │   ├── PlaygroundView.tsx
│   │   ├── PlaygroundEnhanceForm.tsx
│   │   └── ui/                # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   └── lib/                   # Utilities and configuration
│       ├── api.ts            # API client functions
│       ├── config.ts         # Configuration constants
│       └── utils.ts          # Utility functions
├── public/                    # Static assets
├── components/                # Additional components
├── .next/                     # Next.js build output
├── node_modules/              # Dependencies
├── package.json               # Package configuration
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── .env.local                # Environment variables
```

## 🎨 Component Architecture

### Core Components

#### 1. ProjectStatus Component

Real-time status display with live updates:

```tsx
interface ProjectStatusProps {
  project: {
    video_id: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    current_iteration: number;
    current_confidence: number;
    ai_detection_score: number;
    iterations: Iteration[];
  };
}

export default function ProjectStatus({ project }: ProjectStatusProps) {
  // Real-time polling and status display
}
```

**Features:**
- Real-time progress updates
- Live processing logs
- AI detection scores
- Iteration history
- Expandable details

#### 2. VideoGenerationForm Component

```tsx
interface VideoGenerationFormProps {
  onGenerate: (data: GenerationRequest) => void;
}

export default function VideoGenerationForm({ onGenerate }: VideoGenerationFormProps) {
  // Video generation form with validation
}
```

**Features:**
- Prompt input with validation
- Index selection
- Iteration configuration
- Real-time feedback

#### 3. PlaygroundView Component

```tsx
interface PlaygroundViewProps {
  videos: Video[];
  onEnhance: (video: Video) => void;
}

export default function PlaygroundView({ videos, onEnhance }: PlaygroundViewProps) {
  // Video grid with enhancement options
}
```

**Features:**
- Video grid display
- Search and filter
- Enhancement actions
- Video preview

### API Integration

#### API Client (`src/lib/api.ts`)

```typescript
// API request wrapper with error handling
export async function apiRequest(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  return response.json();
}

// Health check
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout('/api/health', { timeout: 5000 });
    return response.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Video operations
export async function generateVideo(data: GenerationRequest) {
  return apiRequest('/api/videos/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVideoStatus(videoId: number) {
  return apiRequest(`/api/videos/${videoId}/status`);
}

export async function getVideoLogs(videoId: number) {
  return apiRequest(`/api/videos/${videoId}/logs`);
}
```

## 🎨 Styling and UI

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
}
```

### Custom CSS Classes

```css
/* globals.css */
.status-badge {
  @apply px-2 py-1 rounded-full text-xs font-medium;
}

.status-pending {
  @apply bg-warning-50 text-warning-700 border border-warning-200;
}

.status-processing {
  @apply bg-primary-50 text-primary-700 border border-primary-200;
}

.status-completed {
  @apply bg-success-50 text-success-700 border border-success-200;
}

.status-failed {
  @apply bg-error-50 text-error-700 border border-error-200;
}
```

## 🔧 Configuration

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['deuqpmn4rs7j5.cloudfront.net'],
  },
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**:
   ```
   BACKEND_URL=https://your-backend-domain.com
   ```

3. **Deploy**:
   - Vercel automatically deploys on git push
   - Custom domain can be configured

### Option 2: Netlify

1. **Build Configuration**:
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   ```

2. **Environment Variables**:
   - Set in Netlify dashboard
   - `BACKEND_URL=https://your-backend-domain.com`

### Option 3: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

Build and run:

```bash
# Build image
docker build -t recurser-frontend .

# Run container
docker run -p 3000:3000 --env-file .env.local recurser-frontend
```

### Option 4: Static Export

```bash
# Build static export
npm run build
npm run export

# Serve static files
npx serve out
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Manual Testing

1. **Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Video Generation**:
   - Navigate to http://localhost:3000/enhance
   - Fill out generation form
   - Submit and monitor progress

3. **Playground**:
   - Navigate to http://localhost:3000/playground
   - View available videos
   - Test enhancement functionality

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Errors

**Error**: `Module not found: Can't resolve 'framer-motion'`

**Solution**:
```bash
npm install framer-motion
```

#### 2. API Connection Issues

**Error**: `Failed to fetch` or `CORS error`

**Solution**:
1. Check `BACKEND_URL` in `.env.local`
2. Ensure backend is running
3. Check CORS configuration in backend

#### 3. TypeScript Errors

**Error**: `Property 'status' does not exist on type 'Response'`

**Solution**:
```bash
# Update TypeScript types
npm install --save-dev @types/node @types/react @types/react-dom
```

#### 4. Styling Issues

**Error**: Tailwind classes not working

**Solution**:
1. Check `tailwind.config.js` configuration
2. Ensure classes are in content paths
3. Restart development server

#### 5. Hot Reload Issues

**Error**: Changes not reflecting

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Debug Mode

Enable detailed logging:

```typescript
// In your component
console.log('Debug info:', { data, status, error });
```

### Browser DevTools

1. **Network Tab**: Check API requests
2. **Console Tab**: View errors and logs
3. **React DevTools**: Inspect component state
4. **Performance Tab**: Monitor performance

## 📊 Performance Optimization

### Code Splitting

```typescript
// Lazy load components
import dynamic from 'next/dynamic';

const ProjectStatus = dynamic(() => import('./ProjectStatus'), {
  loading: () => <div>Loading...</div>,
});
```

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/video-thumbnail.jpg"
  alt="Video thumbnail"
  width={300}
  height={200}
  priority
/>
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npm run analyze
```

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Update all dependencies
npm update

# Update specific package
npm install package-name@latest

# Check for outdated packages
npm outdated
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Type checking
npm run type-check
```

### Performance Monitoring

```bash
# Bundle analyzer
npm run analyze

# Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

## 📞 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review browser console for errors
3. Verify backend connectivity
4. Check environment variables
5. Create GitHub issue with detailed information

---

## 📄 Next Steps

After frontend setup:

1. [API Documentation](./API_DOCUMENTATION.md)
2. [Deployment Guide](./DEPLOYMENT_GUIDE.md)
3. [Testing Guide](./TESTING_GUIDE.md)
