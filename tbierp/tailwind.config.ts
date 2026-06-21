module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sfPro: ['SF Pro', 'sans-serif'],
      },
      fontWeight: {
        590: '590', // Make sure your font supports this weight
      },
      lineHeight: {
        '100': '1', // 100%
      },
      letterSpacing: {
        '-2p': '-0.02em', // -2%
      },
    },
  },
  
  plugins: [
     
  ],
};
