/** @type {import('tailwindcss').Config} */
// Colours are design tokens defined once in src/index.css (:root) as RGB channels,
// so opacity modifiers like bg-accent/10 keep working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('border'),
        'line-input': token('border-input'),
        ink: token('ink'),
        'on-ink': token('on-ink'),
        'on-ink-muted': token('on-ink-muted'),
        text: token('text'),
        muted: token('text-muted'),
        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-soft': token('accent-soft'),
        'accent-text': token('accent-text'),
        danger: token('danger'),
        success: token('success'),
        background: token('bg'),
        foreground: token('text'),
        // Legacy names, kept so older components follow the new palette.
        'scriptai-blue': token('accent'),
        'scriptai-lightblue': token('accent-soft'),
        'scriptai-black': token('text'),
        'scriptai-darkgray': token('text-muted'),
        'scriptai-gray': token('surface'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,13,44,.04), 0 4px 16px rgba(17,13,44,.06)',
        pop: '0 24px 64px -12px rgba(74,47,216,.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .6s cubic-bezier(.2,.8,.2,1) both',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
