/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Cyberpunk neon palette
        neon: {
          cyan: '#00F0FF',
          magenta: '#FF00E5',
          lime: '#B6FF00',
          amber: '#FFB800',
          violet: '#8A2BE2',
          rose: '#FF2D6F',
        },
        // Dark base surfaces
        surface: {
          950: '#05060A',
          900: '#0A0B12',
          850: '#0F1119',
          800: '#141721',
          750: '#1A1E2B',
          700: '#222636',
          600: '#2D3344',
        },
        // Semantic cyberpunk ramps
        primary: {
          DEFAULT: '#00F0FF',
          50: '#E5FEFF',
          100: '#B0FBFF',
          200: '#7AF7FF',
          300: '#3DF4FF',
          400: '#12E8FF',
          500: '#00F0FF',
          600: '#00B8D4',
          700: '#00889C',
          800: '#005A6B',
          900: '#00343D',
        },
        secondary: {
          DEFAULT: '#FF00E5',
          50: '#FFE5FB',
          100: '#FFB0F0',
          200: '#FF7AE3',
          300: '#FF3DD8',
          400: '#FF12E9',
          500: '#FF00E5',
          600: '#CC00B7',
          700: '#990088',
          800: '#66005A',
          900: '#330033',
        },
        accent: {
          DEFAULT: '#B6FF00',
          50: '#F5FFEB',
          100: '#E5FFC4',
          200: '#D5FF9E',
          300: '#C5FF77',
          400: '#B6FF33',
          500: '#B6FF00',
          600: '#8FCC00',
          700: '#6B9900',
          800: '#476600',
          900: '#243300',
        },
        success: {
          DEFAULT: '#00FF9C',
          50: '#E5FFF5',
          500: '#00FF9C',
          600: '#00CC7D',
          700: '#00995E',
        },
        warning: {
          DEFAULT: '#FFB800',
          50: '#FFF8E5',
          500: '#FFB800',
          600: '#CC9300',
          700: '#996E00',
        },
        error: {
          DEFAULT: '#FF2D6F',
          50: '#FFE5EC',
          500: '#FF2D6F',
          600: '#CC2458',
          700: '#991A42',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Inter', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(0, 240, 255, 0.5), 0 0 24px rgba(0, 240, 255, 0.25)',
        'neon-magenta': '0 0 12px rgba(255, 0, 229, 0.5), 0 0 24px rgba(255, 0, 229, 0.25)',
        'neon-lime': '0 0 12px rgba(182, 255, 0, 0.5), 0 0 24px rgba(182, 255, 0, 0.25)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.45)',
      },
      backgroundImage: {
        'cyber-grid':
          "linear-gradient(rgba(0,240,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
