import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vision — Personal Life OS",
    short_name: "Vision",
    description:
      "Gewohnheiten, Ziele und Fitness — echte, messbare Fortschritte.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
