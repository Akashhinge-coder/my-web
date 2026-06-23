import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          cyan:  "var(--accent-cyan)",
          blue:  "var(--accent-blue)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        ring: "var(--ring)",
        brand: {
          50:  "#FEF6EC",
          100: "#FDEBD3",
          200: "#FAD4A0",
          300: "#F5B86A",
          400: "#EF9B3A",
          500: "#C17D3C",
          600: "#A66830",
          700: "#865226",
          800: "#693F1E",
          900: "#4E2F16",
          DEFAULT: "#C17D3C",
        },
        surface: {
          DEFAULT: "#FBF8F4",
          secondary: "#F5F0E8",
          tertiary: "#EDE7DB",
        },
        dark: {
          DEFAULT: "#0F0E0D",
          secondary: "#1A1815",
          tertiary: "#252220",
          card: "#1E1C19",
          border: "#2E2B27",
        },
        /* ── Admin Panel Theme ── */
        admin: {
          bg:        "var(--admin-bg)",
          card:      "var(--admin-card)",
          "card-2":  "var(--admin-card-2)",
          border:    "var(--admin-border)",
          "border-2":"var(--admin-border-2)",
        },
        midnight: {
          DEFAULT: "#000000",
          secondary: "#0A0A0A",
          tertiary: "#111111",
          card: "#0D0D0D",
          border: "#1F1F1F",
        },
        ink: {
          DEFAULT: "#1A1816",
          secondary: "#4A443C",
          2: "#4A443C",
          tertiary: "#7A7068",
          3: "#7A7068",
          4: "#A89E92",
          muted: "#A89E92",
        },
        veg: {
          DEFAULT: "#1D8A3A",
          light: "#E8F5EC",
        },
        nonveg: {
          DEFAULT: "#C41C1C",
          light: "#FDECEA",
        },
        vegan: {
          DEFAULT: "#2D7D46",
          light: "#EBF5EE",
        },
        status: {
          pending: "#E89320",
          cooking: "#D4521A",
          served:  "#1D9E75",
          available: "#1D9E75",
          occupied: "#E24B4A",
          reserved: "#534AB7",
          cleaning: "#E89320",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md":"0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        "card-lg":"0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)",
        brand:   "0 4px 14px rgba(193,125,60,0.35)",
        glow:    "0 0 40px rgba(193,125,60,0.15)",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease forwards",
        "slide-up":   "slideUp 0.4s ease forwards",
        "slide-in":   "slideIn 0.3s ease forwards",
        "spin-slow":  "spin 3s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        "brand-gradient": "linear-gradient(135deg, #C17D3C 0%, #E8A85F 50%, #C17D3C 100%)",
        "dark-gradient":  "linear-gradient(180deg, #0F0E0D 0%, #1A1815 100%)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwindcss-animate"),
  ],
};

export default config;
