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
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        'simplex': ['var(--font-nunito)', 'sans-serif'], // Display - uses font-weight 700
        'duplex': ['var(--font-nunito)', 'sans-serif'], // Primary - uses font-weight 400
        'triplex': ['var(--font-nunito)', 'sans-serif'], // Emphasis - uses font-weight 500
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      fontSize: {
        // Headline 1: 64px/72px, -2% tracking
        'headline-1': ['64px', { lineHeight: '72px', letterSpacing: '-0.02em' }],
        // Large Paragraph: 20px/28px, 0.5% tracking
        'large-paragraph': ['20px', { lineHeight: '28px', letterSpacing: '0.005em' }],
        // Tag: 12px, 20px line height
        'tag': ['12px', { lineHeight: '20px' }],
        // Headline 6: 24px/32px, -1% tracking
        'headline-6': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
        // Paragraph: 16px/24px, 1% tracking
        'paragraph': ['16px', { lineHeight: '24px', letterSpacing: '0.01em' }],
        // Small Text: 12px, 20px line height, 2% tracking
        'small-text': ['12px', { lineHeight: '20px', letterSpacing: '0.02em' }],
        // Inline Code: 16px/24px, 0% tracking
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
          green: '#60E218',
          orange: '#FABA17',
          peach: '#FFB592',
          pink: '#FFB0CD',
          // Tonal variations
          'dark-green': '#30710E',
          'light-green': '#BFF3A4',
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
        // Product Colors - Embed
        embed: {
          blue: '#6CD6FD',
          'dark-green': '#30710E',
          'dark-blue': '#388B7F',
          green: '#60E218',
          'light-green': '#BFF3A4',
          'light-blue': '#C4EEFE',
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
        // System Colors - Success
        success: {
          dark: '#30710E',
          DEFAULT: '#60E21B',
          light: '#BFF3A4',
        },
        // System Colors - Info
        info: {
          dark: '#36687F',
          DEFAULT: '#6CD6FD',
          light: '#C4EEFE',
        },
        // Legacy support (mapped to new system)
        primary: {
          50: '#BFF3A4',
          500: '#60E218',
          600: '#30710E',
          700: '#1D1C1B',
        },
      },
      backgroundImage: {
        // Masterbrand gradients
        'gradient-masterbrand': 'linear-gradient(to right, #60E21B, #FFDFEB, #FABA17)',
        'gradient-masterbrand-1': 'linear-gradient(to right, #60E21B, #FFDFEB, #FABA17)',
        'gradient-masterbrand-2': 'linear-gradient(to right, #FFDFEB, #60E21B, #FFD3BE)',
        'gradient-masterbrand-3': 'linear-gradient(to right, #805867, #60E21B, #FDE3A2)',
        'gradient-masterbrand-4': 'linear-gradient(to right, #FFB0CD, #FFD3BE, #60E21B)',
        // Masterbrand secondary gradients
        'gradient-masterbrand-secondary-1': 'linear-gradient(to right, #BFF3A4, #FABA17, #FFDFEB)',
        'gradient-masterbrand-secondary-2': 'linear-gradient(to right, #307108, #FABA17, #FFD3BE)',
        'gradient-masterbrand-secondary-3': 'linear-gradient(to right, #FABA17, #BFF3A4, #FFB592)',
        'gradient-masterbrand-secondary-4': 'linear-gradient(to right, #FDE3A2, #FFB592, #BFF3A4)',
        // Masterbrand tertiary gradients
        'gradient-masterbrand-tertiary-1': 'linear-gradient(to right, #7D5D0C, #FFB592, #FFDFEB)',
        'gradient-masterbrand-tertiary-2': 'linear-gradient(to right, #FFD3BE, #FFB0CD, #FDE3A2)',
        'gradient-masterbrand-tertiary-3': 'linear-gradient(to right, #FFB592, #FDE3A2, #FFB0CD)',
        'gradient-masterbrand-tertiary-4': 'linear-gradient(to right, #805849, #FFB0CD, #BFF3A4)',
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
        // Embed gradients
        'gradient-embed-1': 'linear-gradient(to right, #BFF3A4, #6CD5FD, #E9E8E7)',
        'gradient-embed-2': 'linear-gradient(to right, #307108, #6CD5FD, #BFF3A4)',
        'gradient-embed-3': 'linear-gradient(to right, #6CD5FD, #BFF3A4, #60E21B)',
        'gradient-embed-4': 'linear-gradient(to right, #60E21B, #C4EEFE, #6CD5FD)',
        // Embed secondary gradients
        'gradient-embed-secondary-1': 'linear-gradient(to right, #E9E8E7, #60E21B, #6CD5FD)',
        'gradient-embed-secondary-2': 'linear-gradient(to right, #366B7F, #60E21B, #E9E8E7)',
        'gradient-embed-secondary-3': 'linear-gradient(to right, #C4EEFE, #E9E8E7, #BFF3A4)',
        'gradient-embed-secondary-4': 'linear-gradient(to right, #366B7F, #60E21B, #C4EEFE)',
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
