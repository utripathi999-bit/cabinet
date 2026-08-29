import type { CapacitorConfig } from "@capacitor/cli";

// Cabinet needs a real Next.js server — the daily topic API route, the
// cron endpoint, and Redis-backed caching can't be bundled as static
// files. So this app runs in Capacitor's "remote content" mode: the
// Android shell just loads server.url, same as a browser would.
//
// Swap the URL below for your deployed Vercel URL once it's live. Until
// then this points at a placeholder — update it before running `npx cap
// sync` / opening the Android project.
const config: CapacitorConfig = {
  appId: "com.utripathi999.cabinet",
  appName: "Cabinet",
  webDir: "www",
  server: {
    url: "https://REPLACE-WITH-YOUR-VERCEL-URL.vercel.app",
    cleartext: false,
  },
};

export default config;
