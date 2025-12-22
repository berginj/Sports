import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Optional local/dev helpers:
// - VITE_API_BASE_URL: direct Functions host (ex: http://localhost:7071)
// - VITE_DEV_USER_ID / VITE_DEV_USER_EMAIL: inject fallback identity headers in dev proxy
const devUserId = process.env.VITE_DEV_USER_ID || "";
const devUserEmail = process.env.VITE_DEV_USER_EMAIL || "";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
        headers: {
          ...(devUserId ? { "x-user-id": devUserId } : {}),
          ...(devUserEmail ? { "x-user-email": devUserEmail } : {}),
        },
      },
    },
  },
});
