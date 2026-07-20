import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || `http://127.0.0.1:${env.VITE_API_PORT || env.PORT || 3000}`;
  return {
    base: "/design/",
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: apiUrl,
          changeOrigin: true,
        },
        "/ws": {
          target: apiUrl,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
