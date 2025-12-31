// tailwind.config.js
const plugin = require('tailwindcss/plugin');
const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: 'class',
  content: [
    './tailwindInput/**/*.{html,css,js}',
    './views/**/*.ejs',
    './www/**/*.{html,css,js}'
  ],
  safelist: ['text-xxs', 'text-xxl', 'text-xs', 'text-sm', 'text-md', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'icon-xxs', 'icon-xs', 'icon-sm', 'icon-md', 'icon-lg', 'icon-xl', 'icon-xxl'],
  // './www/**/*.{html,css,js}',
  theme: {
    extend: {
      screens: {
        xxs: '320px',
        xs: '480px',
        // defaults:
        // sm: '640px',
        // md: '768px',
        // lg: '1024px',
        // xl: '1280px',
        // '2xl': '1536px',
      },
      colors: {
        logo: '#fd8805ff',
        primary: '#FF057B',
        light: '#F3F4F5',
        dark: '#181818',
        black: '#000000',
        white: '#FFFFFF',
        transparent: colors.transparent,
        gray: {
          100: '#F5F5F5',
          300: '#D1D5DB',
          500: '#6B7280',
          700: '#374151',
          900: '#111827'
        },
        slate: {
          600: '#475569'
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          800: '#1F2937'
        },
        // Semantic Roles
        success: '#24A148',
        warning: '#D36F00',
        error: '#C6373E',
        info: '#2284C3',

        // Optional: supporting utility sets
        blue: colors.blue,
        zinc: colors.zinc,
        teal: colors.teal
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
        serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        kfi: ['kfi']
      },
      fontSize: {
        'icon-xxs': '0.5rem',
        'icon-xs': '0.75rem',
        'icon-sm': '1rem',
        'icon-md': '1.25rem',
        'icon-lg': '1.5rem',
        'icon-xl': '2rem',
        'icon-xxl': '3rem',
        'xxs': '0.625rem',
        'xs': '0.75rem',
        'sm': '0.875rem',
        'md': '1rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        'xxl': '1.375rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem'
      },
      zIndex: {
        '100': '100',
        '9000': '9000',
        '9100': '9100',
        '9200': '9200',
        '9300': '9300',
        '9999': '9999',
      },
      boxShadow:
      {
        'xs': '0 0 0 1px rgba(0,0,0,0.05)',
      },
      rotate:
      {
        'x-180': 'rotateX(180deg)',
      },
      backfaceVisibility:
      {
        hidden: 'hidden',
      },
      transformStyle:
      {
        'preserve-3d': 'preserve-3d',
      },
      perspective:
      {
        '1000': '1000px',
      },
    }
  },
  variants:
  {
    extend:
    {
      boxShadow: ['dark'],
      rotate: ['hover', 'focus'],
      backfaceVisibility: ['hover', 'focus'],
      transformStyle: ['hover', 'focus'],
    },
  },
  // variants: {
  //   extend: {
  //     translate: ['focus'],
  //     backgroundColor: ['active', 'group-focus'],
  //     textColor: ['active', 'group-focus']
  //   }
  // },
  plugins: [
    plugin(function ({ addUtilities })
    {
      addUtilities({
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0'
        },
        '.focus\\:not-sr-only:focus': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          padding: '1rem',
          margin: '0',
          overflow: 'visible',
          clip: 'auto',
          whiteSpace: 'normal'
        }
      });
    })
  ]
};