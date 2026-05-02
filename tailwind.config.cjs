module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c1c30",
        mist: "#f1f6ff",
        panel: "#ffffff",
        brand: "#ff6b35",
        accent: "#0a8f94",
      },
      boxShadow: {
        glow: "0 20px 60px rgba(12, 28, 48, 0.18)",
      },
    },
  },
  plugins: [],
}
