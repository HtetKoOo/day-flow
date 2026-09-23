import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DayFlow — Plan tomorrow tonight",
    short_name: "DayFlow",
    description: "A calm, tomorrow-first personal planner.",
    start_url: "/planner",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#334d43",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
