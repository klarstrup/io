import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "io input/output",
    short_name: "io",
    description: "A simple input/output app",
    start_url: "/diary",
    display: "standalone",
    background_color: "#000",
    theme_color: "#ff0",
    icons: [{ src: "/apple-icon", sizes: "512x512", type: "image/png" }],
  };
}
