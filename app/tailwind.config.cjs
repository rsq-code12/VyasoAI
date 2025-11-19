module.exports = {
  darkMode: ['class'],
  content: ['index.html', 'src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 
          DEFAULT: '#32F08C', 
          50: '#E8FBF1', 
          100: '#DDF9EA',
          500: '#32F08C',
          600: '#2DD87D',
          700: '#28C06E'
        },
        bg: { 900: '#131415', 800: '#212223' },
        surface: '#212223',
        white: '#FFFFFF',
        muted: '#9AA0A6',
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827'
        }
      },
      ringColor: { DEFAULT: '#32F08C' },
      boxShadow: { 
        soft: '0 6px 20px rgba(0,0,0,0.6)',
        'primary-glow': '0 0 20px rgba(50,240,140,0.3)',
        'premium': '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(50,240,140,0.1)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 1s infinite',
        'pulse-slow': 'pulseSlow 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-2%)' },
          '50%': { transform: 'translateY(0)' }
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      }
    }
  }
}