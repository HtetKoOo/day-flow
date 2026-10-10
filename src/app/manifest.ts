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
    background_color: "#f8f7f5",
    theme_color: "#7954b3",
    icons: [
      {
        src: "/icons/dayflow-mark.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/dayflow-mark.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/dayflow-mark.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
