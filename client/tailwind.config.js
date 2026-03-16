/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF7F2',
        dark: {
          DEFAULT: '#1A1210',
          secondary: '#2D2016',
        },
        text: {
          primary: '#2D2016',
          muted: '#8B7355',
        },
        accent: {
          DEFAULT: '#C4956A',
          hover: '#B8845A',
          light: '#D4A87A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          border: '#E8E0D4',
        },
        success: '#16A34A',
        error: '#DC2626',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out 1s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
