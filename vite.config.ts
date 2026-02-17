import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("@tiptap")) return "vendor-editor";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("framer-motion")) return "vendor-motion";
          // Keep Radix with React to avoid runtime ordering/interoperability issues
          // seen in some hardened browser environments (SES/lockdown).
          if (id.includes("@radix-ui")) return "vendor-react";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("date-fns")) return "vendor-date-fns";
          if (id.includes("prosemirror")) return "vendor-prosemirror";
          if (id.includes("rrule")) return "vendor-rrule";
          if (id.includes("/zod/")) return "vendor-zod";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "vendor-forms";
          if (id.includes("react-day-picker")) return "vendor-day-picker";
          if (id.includes("sonner")) return "vendor-sonner";
          if (id.includes("linkifyjs")) return "vendor-linkifyjs";
          if (
            id.includes("react-router") ||
            id.includes("react-dom") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }
          return "vendor-misc";
        },
      },
    },
  },
}));
