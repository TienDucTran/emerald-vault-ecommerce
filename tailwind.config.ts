import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background — Quartz Black & Deep Emerald (flows.md §3)
        background: {
          DEFAULT: '#0D1117',
          gradient: '#051C12',
        },
        // Surface — Card variants
        surface: {
          DEFAULT: '#161B22',
          emerald: '#12241C',
          emeraldAlt: '#0A2F1D',
        },
        // Accent — Gold (Primary) — #F2CA50 per Figma
        gold: {
          DEFAULT: '#F2CA50',
          champagne: '#F1E5AC',
        },
        // Text
        text: {
          base: '#EAE1D4',      // #EAE1D4 — cream (Figma)
          muted: '#D0C5AF',     // #D0C5AF — parchment (Figma)
          disabled: '#6B7280',
        },
        // Parchment (Figma fill for body/muted text)
        parchment: '#D0C5AF',
        // Status
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
      fontFamily: {
        // Headings — Serif (Cinzel fallback Cormorant Garamond)
        heading: ['Cinzel', 'Cormorant Garamond', 'serif'],
        // Body — Sans-serif (Inter)
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h2: ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h3: ['24px', { lineHeight: '1.3' }],
        h4: ['20px', { lineHeight: '1.4' }],
        'body-lg': ['16px', { lineHeight: '1.6' }],
        body: ['14px', { lineHeight: '1.6' }],
        caption: ['12px', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.7)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
        'gold-glow-lg': '0 0 40px rgba(212, 175, 55, 0.4)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(212, 175, 55, 0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0)' },
          '70%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'slideInLeft': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slideDown': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scaleIn': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'pop': 'pop 300ms ease-out',
        'slideInLeft': 'slideInLeft 300ms ease-out forwards',
        'slideDown': 'slideDown 250ms ease-out forwards',
        'fadeInUp': 'fadeInUp 500ms ease-out forwards',
        'scaleIn': 'scaleIn 400ms ease-out forwards',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #F1E5AC 50%, #D4AF37 100%)',
        'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
      },
    },
  },
  plugins: [],
};

export default config;
