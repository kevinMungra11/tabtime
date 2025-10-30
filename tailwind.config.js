module.exports = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',
    './public/*.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#764ba2'
        }
      },
      boxShadow: {
        card: '0 10px 30px rgba(102, 126, 234, 0.25)'
      }
    }
  },
  plugins: []
};
