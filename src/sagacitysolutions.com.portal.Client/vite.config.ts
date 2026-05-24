import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /auth/* and /api/* to the BFF so the browser never needs to
    // know the BFF port — useful when both run on the same host.
    proxy: {
      "/auth": "http://localhost:5000",
      "/api": "http://localhost:5000",
    },
  },
});
