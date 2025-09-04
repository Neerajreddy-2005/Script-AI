/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'scriptai-blue': '#3B82F6',
        'scriptai-lightblue': '#EFF6FF',
        'scriptai-black': '#111827',
        'scriptai-darkgray': '#6B7280',
        'scriptai-gray': '#F9FAFB',
        'background': '#FFFFFF',
        'foreground': '#111827',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 