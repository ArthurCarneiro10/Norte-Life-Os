import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Norte · Sistema operacional pessoal",
    short_name: "Norte",
    description: "Viva com direção. Produza com equilíbrio.",
    start_url: "/app",
    display: "standalone",
    background_color: "#FBFAF7",
    theme_color: "#FBFAF7",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
