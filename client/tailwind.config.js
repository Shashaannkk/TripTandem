/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B2545',
          'navy-light': '#163963',
          'navy-dark': '#061529',
          orange: '#FF6B45',
          'orange-hover': '#F25830',
          'orange-light': '#FFF0EC',
          yellow: '#FFC857',
          'yellow-light': '#FFF9EB',
          teal: '#2A9D8F',
          'teal-hover': '#23867A',
          'teal-light': '#E9F6F4',
          sky: '#8EC5E8',
          'sky-light': '#F0F7FC',
          sand: '#F9F7F2',
          'sand-muted': '#EFECE3',
          'sand-border': '#E5E1D5',
        }
      },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(11, 37, 69, 0.04)',
        'card': '0 4px 20px -2px rgba(11, 37, 69, 0.06), 0 2px 6px -1px rgba(11, 37, 69, 0.04)',
        'card-hover': '0 12px 30px -4px rgba(11, 37, 69, 0.12), 0 4px 10px -2px rgba(11, 37, 69, 0.06)',
        'search': '0 8px 30px rgba(11, 37, 69, 0.10)',
        'floating': '0 16px 40px -10px rgba(11, 37, 69, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
