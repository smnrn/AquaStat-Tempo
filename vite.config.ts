import { defineConfig } from "vite"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

const PRE = [
  "react", "react/jsx-runtime", "react-dom", "react-dom/client",
  "recharts", "motion/react", "motion",
  "@radix-ui/react-accordion", "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio", "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox", "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu", "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu", "@radix-ui/react-hover-card",
  "@radix-ui/react-label", "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu", "@radix-ui/react-popover",
  "@radix-ui/react-progress", "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area", "@radix-ui/react-select",
  "@radix-ui/react-separator", "@radix-ui/react-slider",
  "@radix-ui/react-slot", "@radix-ui/react-switch",
  "@radix-ui/react-tabs", "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group", "@radix-ui/react-tooltip",
  "lucide-react", "sonner", "clsx", "tailwind-merge",
  "class-variance-authority", "react-hook-form", "date-fns",
  "react-router", "react-resizable-panels", "embla-carousel-react",
  "vaul", "cmdk", "react-dnd", "react-dnd-html5-backend",
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
  optimizeDeps: {
    include: PRE,
    force: false,
    esbuildOptions: { target: "esnext", logLevel: "silent" },
  },
  server: {
    warmup: { clientFiles: ["./src/main.tsx", "./src/app/App.tsx"] },
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
    hmr: { overlay: true },
  },
  cacheDir: ".vite-cache",
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react/jsx-runtime"],
          recharts: ["recharts"],
          motion: ["motion", "motion/react"],
        },
      },
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
})
