# Circuit/Recurser Frontend

Next.js frontend for the Circuit/Recurser Video Generation Validator system.

## Features

- **Simple, Minimal Interface**: Clean UI following PRD requirements
- **Filepath Input**: Direct filepath input for video validation
- **Real-time Validation**: Live feedback during validation process
- **Comprehensive Results**: Detailed analysis and improvement suggestions
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Bun**: Fast package manager and runtime
- **Lucide React**: Beautiful icons

## Setup

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Run Development Server**:
   ```bash
   bun run dev
   ```

The application will start on `http://localhost:3000`

## Usage

1. **Enter Video Filepath**: Provide the full path to your video file
2. **Add Generation Prompt**: Describe the video content and requirements
3. **Set Validation Criteria**: Define objects, style, consistency, and additional requirements
4. **Start Validation**: Click "Start Validation" to begin the analysis
5. **Review Results**: View confidence scores, issues, and improvement suggestions

## Interface Components

### Video Input Section
- Filepath input field
- Generation prompt textarea
- Clear validation and error handling

### Validation Criteria Section
- Required objects (add/remove badges)
- Style specification
- Consistency requirements
- Additional requirements

### Results Display
- Confidence score with target comparison
- Analysis scores (Confidence, AI Detection, Accuracy)
- Issues found and suggested improvements
- Final improved prompt
- Detailed analysis summary

## API Integration

The frontend communicates with the backend via:
- `/api/validate` - POST request for video validation
- Automatic proxy configuration to `http://localhost:5000`

## Styling

- **Design System**: Consistent component library
- **Dark Mode Ready**: CSS variables for theming
- **Responsive**: Mobile-first design approach
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Development

- **Hot Reload**: Fast development with Next.js
- **Type Safety**: Full TypeScript support
- **Component Library**: Reusable UI components
- **Error Boundaries**: Graceful error handling

## Build

```bash
bun run build
bun run start
```

## Project Structure

```
frontend/
├── app/                 # Next.js App Router
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main page
├── components/         # Reusable components
│   └── ui/            # UI component library
├── lib/               # Utility functions
└── public/            # Static assets
```
