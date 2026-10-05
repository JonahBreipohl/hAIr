import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hAIr consultation preview",
    short_name: "hAIr",
    description:
      "Private hairstyle visualizations for stylist and client consultations.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe7",
    theme_color: "#f4efe7",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
