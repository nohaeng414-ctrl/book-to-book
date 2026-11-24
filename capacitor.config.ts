import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kitabbkitab.app",
  appName: "كتاب بكتاب",
  webDir: "public",
  server: {
    url: "https://book-to-book.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;