/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef7ee',
          100: '#fdecd3',
          200: '#fad5a5',
          300: '#f6b86d',
          400: '#f19332',
          500: '#ed7712',
          600: '#de5c08',
          700: '#b84409',
          800: '#93360e',
          900: '#772e0f',
        },
        ocean: {
          50: '#f0f9fa',
          100: '#d9f0f2',
          500: '#2a9d8f',
          600: '#238b7e',
          700: '#1f7369',
          900: '#1a3a36',
        },
        cream: {
          50: '#fdfbf7',
          100: '#f9f5ed',
          200: '#f3ebe0',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1a2332',
          card: '#fdfbf7',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 2px 16px -2px rgba(26, 35, 50, 0.08)',
        'card-hover': '0 8px 30px -4px rgba(26, 35, 50, 0.14)',
        float: '0 12px 40px -8px rgba(222, 92, 8, 0.25)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #1a2332 0%, #2a4a42 50%, #1a2332 100%)',
        'warm-gradient': 'linear-gradient(180deg, #fdfbf7 0%, #f9f5ed 100%)',
      },
    },
  },
  plugins: [],
};
