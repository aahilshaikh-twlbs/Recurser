/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Layout system - built around multiples of 4px
      spacing: {
        // Brand spacers (multiples of 4px)
        'spacer-xs': '20px',   // 5 * 4px
        'spacer-sm': '40px',   // 10 * 4px
        'spacer-md': '64px',   // 16 * 4px
        'spacer-lg': '96px',   // 24 * 4px
      },
      borderRadius: {
        // Border radius: 30% of shortest side
        // Applied via utility classes with aspect-aware calculations
        'brand': '30%',
      },
      fontFamily: {
        sans: ['Milling', 'Inter', 'system-ui', 'sans-serif'],
        'simplex': ['Milling', 'Inter', 'sans-serif'], // Display - uses font-weight 200-300 (occasional use)
        'duplex': ['Milling', 'Inter', 'sans-serif'], // Primary - uses font-weight 400 (99% usage)
        'triplex': ['Milling', 'Inter', 'sans-serif'], // Emphasis - uses font-weight 500-700 (for highlights)
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontWeight: {
        // Map Tailwind font weights to Milling weights
        thin: '200',      // Simplex 0.5mm
        light: '300',      // Simplex 0.75mm
        normal: '400',     // Duplex 1mm (primary - 99% usage)
        medium: '500',    // Triplex 1mm (emphasis)
        semibold: '600',  // Triplex 1.5mm (strong emphasis)
        bold: '700',       // Triplex 2mm (heavy - rarely used)
      },
      fontSize: {
        // Type hierarchy - All using Duplex 1mm (weight 400)
        // Headline 1: 64px/72px, -2% tracking (Desktop)
        'headline-1': ['64px', { lineHeight: '72px', letterSpacing: '-0.02em' }],
        'headline-1-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
        // Large Paragraph: 20px/28px, 0.5% tracking
        'large-paragraph': ['20px', { lineHeight: '28px', letterSpacing: '0.005em' }],
        'large-paragraph-mobile': ['18px', { lineHeight: '26px', letterSpacing: '0.005em' }],
        // Tag: 12px, 20px line height
        'tag': ['12px', { lineHeight: '20px' }],
        // Headline 6: 24px/32px, -1% tracking
        'headline-6': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        'headline-6-mobile': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        // Paragraph: 16px/24px, 1% tracking
        'paragraph': ['16px', { lineHeight: '24px', letterSpacing: '0.01em' }],
        // Small Text: 12px, 20px line height, 2% tracking, ALL CAPS
        'small-text': ['12px', { lineHeight: '20px', letterSpacing: '0.02em' }],
        // Inline Code: 16px/24px, 0% tracking (IBM Plex Mono)
        'inline-code': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
      },
      colors: {
        // Masterbrand - Neutrals
        neutral: {
          chalk: '#F4F3F3',
          fog: '#ECECEC',
          smoke: '#D3D1CF',
          ash: '#8F8984',
          shadow: '#45423F',
          charcoal: '#1D1C1B',
        },
        // Masterbrand - Primary Colors
        brand: {
          // Purple (Pegasus) - Primary brand color
          purple: '#E8A5FF',
          'dark-purple': '#8B6FA0',
          'light-purple': '#F5E5FF',
          // Yellow (Marengo) - Primary brand color
          yellow: '#FFC947',
          'dark-yellow': '#9D7A3A',
          'light-yellow': '#FFE8A5',
          // Green - Lighter variant
          green: '#7FE840', // Lighter, brighter green
          'dark-green': '#4A9E1A', // Lighter dark green
          'light-green': '#CFF5A8', // Lighter light green
          // Supporting colors
          orange: '#FABA17',
          peach: '#FFB592',
          pink: '#FFB0CD',
          'dark-orange': '#7D5D0C',
          'light-orange': '#FDE3A2',
          'dark-peach': '#805849',
          'light-peach': '#FFD3BE',
          'dark-pink': '#806867',
          'light-pink': '#FFDFEB',
        },
        // Product Colors - Search (Pegasus - Purple variants)
        search: {
          purple: '#E8A5FF', // Softer, more rounded purple
          'dark-lavender': '#7B6FA8', // Adjusted dark lavender
          'dark-purple': '#8B6FA0', // Adjusted dark purple
          lavender: '#B8A5FF', // Softer lavender
          'light-lavender': '#E0D9FF', // Adjusted light lavender
          'light-purple': '#F5E5FF', // Softer light purple
        },
        // Product Colors - Generate (Marengo - Yellow/Orange variants)
        generate: {
          orange: '#FFC947', // Brighter, more vibrant yellow-orange
          'dark-peach': '#9D7A5A', // Adjusted dark peach
          'dark-orange': '#9D7A3A', // Adjusted dark orange
          peach: '#FFB87A', // Warmer peach
          'light-peach': '#FFE5C4', // Softer light peach
          'light-orange': '#FFE8A5', // Brighter light orange/yellow
        },
        // Product Colors - Embed (using lighter green, minimal blue)
        embed: {
          green: '#7FE840', // Lighter green
          'dark-green': '#4A9E1A', // Lighter dark green
          'light-green': '#CFF5A8', // Lighter light green
          // Blue kept minimal for specific use cases only
          blue: '#B8A5FF', // Using lavender instead of bright blue
          'dark-blue': '#7B6FA8', // Using dark lavender
          'light-blue': '#E0D9FF', // Using light lavender
        },
        // System Colors - Error
        error: {
          dark: '#9D4228',
          DEFAULT: '#E22E22',
          light: '#FFCCC0',
        },
        // System Colors - Warning
        warning: {
          dark: '#7D5D0C',
          DEFAULT: '#FABA17',
          light: '#FDE3A2',
        },
        // System Colors - Success (lighter green)
        success: {
          dark: '#4A9E1A', // Lighter dark green
          DEFAULT: '#7FE840', // Lighter green
          light: '#CFF5A8', // Lighter light green
        },
        // System Colors - Info (using purple instead of blue)
        info: {
          dark: '#8B6FA0', // dark-purple
          DEFAULT: '#E8A5FF', // purple
          light: '#F5E5FF', // light-purple
        },
        // Legacy support (mapped to purple/yellow instead of green)
        primary: {
          50: '#F5E5FF', // light-purple
          100: '#E8A5FF', // purple
          200: '#B8A5FF', // lavender
          300: '#8B6FA0', // dark-purple
          400: '#FFE8A5', // light-yellow
          500: '#FFC947', // yellow
          600: '#9D7A3A', // dark-yellow
          700: '#1D1C1B', // charcoal
        },
      },
      backgroundImage: {
        // Masterbrand gradients (purple and yellow)
        'gradient-masterbrand': 'linear-gradient(to right, #E8A5FF, #FFDFEB, #FFC947)',
        'gradient-masterbrand-1': 'linear-gradient(to right, #E8A5FF, #FFDFEB, #FFC947)',
        'gradient-masterbrand-2': 'linear-gradient(to right, #FFDFEB, #E8A5FF, #FFE8A5)',
        'gradient-masterbrand-3': 'linear-gradient(to right, #8B6FA0, #E8A5FF, #FFE8A5)',
        'gradient-masterbrand-4': 'linear-gradient(to right, #FFB0CD, #FFE8A5, #E8A5FF)',
        // Masterbrand secondary gradients (purple and yellow)
        'gradient-masterbrand-secondary-1': 'linear-gradient(to right, #F5E5FF, #FFC947, #FFDFEB)',
        'gradient-masterbrand-secondary-2': 'linear-gradient(to right, #8B6FA0, #FFC947, #FFE8A5)',
        'gradient-masterbrand-secondary-3': 'linear-gradient(to right, #FFC947, #F5E5FF, #FFB592)',
        'gradient-masterbrand-secondary-4': 'linear-gradient(to right, #FFE8A5, #FFB592, #F5E5FF)',
        // Masterbrand tertiary gradients (purple/yellow focused)
        'gradient-masterbrand-tertiary-1': 'linear-gradient(to right, #9D7A3A, #FFB592, #FFDFEB)',
        'gradient-masterbrand-tertiary-2': 'linear-gradient(to right, #FFE8A5, #FFB0CD, #F5E5FF)',
        'gradient-masterbrand-tertiary-3': 'linear-gradient(to right, #FFB592, #FFE8A5, #FFB0CD)',
        'gradient-masterbrand-tertiary-4': 'linear-gradient(to right, #805849, #FFB0CD, #F5E5FF)',
        // Search gradients
        'gradient-search-1': 'linear-gradient(to right, #7B6880, #A7ABFF, #FBDFFF)',
        'gradient-search-2': 'linear-gradient(to right, #FBDFFF, #A7ABFF, #E9E8E7)',
        'gradient-search-3': 'linear-gradient(to right, #DBD9FF, #E9E8E7, #FBDFFF)',
        'gradient-search-4': 'linear-gradient(to right, #F6AFFF, #DBD9FF, #A7ABFF)',
        // Search secondary gradients
        'gradient-search-secondary-1': 'linear-gradient(to right, #E9E8E7, #F6AFFF, #A7ABFF)',
        'gradient-search-secondary-2': 'linear-gradient(to right, #8D5867, #F6AFFF, #DBD9FF)',
        'gradient-search-secondary-3': 'linear-gradient(to right, #F6AFFF, #FBDFFF, #A7ABFF)',
        'gradient-search-secondary-4': 'linear-gradient(to right, #FDE0F1, #F6AFFF, #DBD9FF)',
        // Generate gradients
        'gradient-generate-1': 'linear-gradient(to right, #F4A680, #FFD3BE, #FABA17)',
        'gradient-generate-2': 'linear-gradient(to right, #FFD3BE, #FABA17, #E9E8E7)',
        'gradient-generate-3': 'linear-gradient(to right, #F4A680, #FDE3A2, #FABA17)',
        'gradient-generate-4': 'linear-gradient(to right, #805849, #FABA17, #FFD3BE)',
        // Generate secondary gradients
        'gradient-generate-secondary-1': 'linear-gradient(to right, #7D5D0C, #F4A680, #E9E8E7)',
        'gradient-generate-secondary-2': 'linear-gradient(to right, #E9E8E7, #F4A680, #FDE3A2)',
        'gradient-generate-secondary-3': 'linear-gradient(to right, #FDE3A2, #E9E8E7, #FFDFEB)',
        'gradient-generate-secondary-4': 'linear-gradient(to right, #7D6D0C, #F4A680, #FDE3A2)',
        // Embed gradients (lighter green, no blue)
        'gradient-embed-1': 'linear-gradient(to right, #CFF5A8, #E0D9FF, #E9E8E7)',
        'gradient-embed-2': 'linear-gradient(to right, #4A9E1A, #E0D9FF, #CFF5A8)',
        'gradient-embed-3': 'linear-gradient(to right, #E0D9FF, #CFF5A8, #7FE840)',
        'gradient-embed-4': 'linear-gradient(to right, #7FE840, #E0D9FF, #B8A5FF)',
        // Embed secondary gradients (lighter green focused)
        'gradient-embed-secondary-1': 'linear-gradient(to right, #E9E8E7, #7FE840, #B8A5FF)',
        'gradient-embed-secondary-2': 'linear-gradient(to right, #7B6FA8, #7FE840, #E9E8E7)',
        'gradient-embed-secondary-3': 'linear-gradient(to right, #E0D9FF, #E9E8E7, #CFF5A8)',
        'gradient-embed-secondary-4': 'linear-gradient(to right, #7B6FA8, #7FE840, #E0D9FF)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // Grid system plugin for 12-column layout
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Grid columns (12-column system, scales to 6, 4, 3, 2)
        '.grid-12': {
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        },
        '.grid-6': {
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        },
        '.grid-4': {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        },
        '.grid-3': {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        },
        '.grid-2': {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        },
        // Section divisions
        '.section-1-1': {
          gridColumn: 'span 12 / span 12',
        },
        '.section-1-2': {
          gridColumn: 'span 6 / span 6',
        },
        '.section-1-3': {
          gridColumn: 'span 4 / span 4',
        },
        '.section-1-4': {
          gridColumn: 'span 3 / span 3',
        },
        '.section-1-6': {
          gridColumn: 'span 2 / span 2',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}
