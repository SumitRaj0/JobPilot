/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup.tsx",
    "./background.ts",
    "./contents/**/*.{tsx,ts}",
    "./components/**/*.{tsx,ts}",
  ],
  prefix: "aiapply-",
  important: true,
  theme: {
    extend: {
      colors: {
        panel: {
          bg: "#080e1a",
          border: "rgba(255,255,255,0.08)",
          accent: "#3b82f6",
          muted: "#64748b",
          glass: "rgba(8, 14, 26, 0.78)",
        },
      },
      borderRadius: {
        panel: "20px",
      },
      boxShadow: {
        panel: "0 28px 56px -16px rgba(0, 8, 24, 0.65)",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
