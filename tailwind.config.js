/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        gold: {
          50:  '#fff9db',
          100: '#fff3bf',
          200: '#ffec99',
          300: '#ffe066',
          400: '#ffd43b',
          500: '#fcc419',
          600: '#fab005',
          700: '#f59f00',
          800: '#f08c00',
          900: '#e67700',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      screens: { xs: '375px' },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        glow: '0 0 20px rgba(92,124,250,0.25)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        bounceIn: { '0%': { transform: 'scale(0.9)', opacity: 0 }, '60%': { transform: 'scale(1.03)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
