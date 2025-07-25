import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// Conditional tempo import
let tempo: any = () => ({});
if (process.env.TEMPO === "true") {
  try {
    const tempoModule = await import("tempo-devtools/dist/vite");
    tempo = tempoModule.tempo;
  } catch (error) {
    console.warn("Tempo plugin not available:", error);
  }
}

const conditionalPlugins: [string, Record<string, any>][] = [];

// @ts-ignore
if (process.env.TEMPO === "true") {
  conditionalPlugins.push(["tempo-devtools/swc", {}]);
}

// https://vitejs.dev/config/
export default defineConfig({
  base:
    process.env.NODE_ENV === "development"
      ? "/"
      : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.tsx"],
  },
  plugins: [
    react({
      plugins: conditionalPlugins,
    }),
    ...(process.env.TEMPO === "true" ? [tempo()] : []),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    allowedHosts: ["e0fe102a-7315-4e87-bb71-9528ed6b8054.canvases.tempo.build"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
