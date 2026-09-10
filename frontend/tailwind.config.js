/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mira: {
          primary: '#6D28D9',
          secondary: '#8B5CF6',
          light: '#F5F3FF',
          dark: '#1F2937',
          muted: '#6B7280',
          border: '#E5E7EB',
          accent: '#4C1D95'
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
