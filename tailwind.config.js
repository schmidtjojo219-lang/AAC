/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gov: {
          50:  "#f0f6fc", 100: "#d9e8f7", 200: "#b3d1ef",
          300: "#80b4e4", 400: "#4a90d4", 500: "#1351B4",
          600: "#0c326f", 700: "#0a2858", 800: "#071d41", 900: "#05142c",
        },
        institucional: {
          fundo: "#F5F7FA", card: "#FFFFFF", borda: "#E2E8F0",
          texto: "#1E293B", textoSecundario: "#64748B",
          sucesso: "#16A34A", alerta: "#CA8A04", perigo: "#DC2626", info: "#0284C7",
        }
      },
      fontFamily: {
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
        institucional: ["Rawline", "Inter", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.05)",
        cardHover: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)"
      },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } }
      },
      animation: {
        spin: "spin 0.8s linear infinite"
      }
    },
  },
  plugins: [],
}