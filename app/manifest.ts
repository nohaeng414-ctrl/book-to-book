import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "كتاب بكتاب | منصة تبادل الكتب",
    short_name: "كتاب بكتاب",
    description: "اكتشف كتباً جديدة واستبدل كتبك بكل سهولة.",
    start_url: "/",
    display: "standalone",
    lang: "ar",
    background_color: "#F1F5F9",
    theme_color: "#F1F5F9",
   icons: [
  {
    src: "/icon.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/icon.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
],
  };
}
