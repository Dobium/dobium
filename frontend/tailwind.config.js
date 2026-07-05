/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dobium: {
          bg: '#020617',
          panel: '#0f172a',
          border: '#334155',
          text: '#f8fafc',
          'text-secondary': '#94a3b8',
          accent: '#d4af37',
          'accent-hover': '#e4bd3f',
        }
      },
      fontFamily: {
        serif: ['"Hanken Grotesk"', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '3px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
        '3xl': '12px',
      },
    },
  },
  plugins: [],
}
