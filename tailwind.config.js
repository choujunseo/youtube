/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'modal-backdrop-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bottom-sheet-in': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'top-sheet-in': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gauge-celebrate': {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.035)' },
          '70%': { transform: 'scale(1.01)' },
        },
      },
      animation: {
        'modal-backdrop-in': 'modal-backdrop-in 0.2s ease-out forwards',
        'bottom-sheet-in': 'bottom-sheet-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'top-sheet-in': 'top-sheet-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'gauge-celebrate': 'gauge-celebrate 0.75s cubic-bezier(0.34, 1.3, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

