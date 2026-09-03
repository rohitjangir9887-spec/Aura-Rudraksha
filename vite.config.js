import { defineConfig } from "vite";

const isHmrDisabled = process.env.DISABLE_HMR === "true" || process.env.DISABLE_HMR === "1";

export default defineConfig(({ mode }) => ({
  mode: mode || "production",
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode === "development" ? "development" : "production"),
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    hmr: isHmrDisabled ? false : {
      overlay: false,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  esbuild: {
    jsx: "automatic",
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/@tiptap")) {
            return "tiptap";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "framer-motion";
          }
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
            return "firebase";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "lucide";
          }
        }
      },
      onwarn(warning, defaultHandler) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" || warning.message?.includes("use client")) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
}));
