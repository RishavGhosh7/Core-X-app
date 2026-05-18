/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f0ff",
          100: "#b3d1ff",
          200: "#80b2ff",
          300: "#4d93ff",
          400: "#1a74ff",
          500: "#0066ff",
          600: "#0052cc",
          700: "#003d99",
          800: "#002966",
          900: "#001433"
        },
        accent: {
          50: "#e6fff5",
          100: "#b3ffe0",
          200: "#80ffcc",
          300: "#4dffb8",
          400: "#1affa3",
          500: "#00e68a",
          600: "#00b36b",
          700: "#00804d",
          800: "#004d2e",
          900: "#001a10"
        },
        gold: {
          50: "#fff9e6",
          100: "#ffedb3",
          200: "#ffe180",
          300: "#ffd54d",
          400: "#ffc91a",
          500: "#ffbd00",
          600: "#cc9700",
          700: "#997200",
          800: "#664c00",
          900: "#332600"
        },
        surface: {
          50: "#f8f9fa",
          100: "#f1f3f5",
          200: "#e9ecef",
          300: "#dee2e6",
          400: "#ced4da",
          500: "#adb5bd",
          600: "#868e96",
          700: "#495057",
          800: "#343a40",
          900: "#212529"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
        elevated: "0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem"
      }
    }
  },
  plugins: []
};
