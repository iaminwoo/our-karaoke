import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "뭐 부를까?",
    short_name: "뭐 부를까?",
    description: "우리만의 플레이리스트",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101019",
    theme_color: "#101019",
    lang: "ko-KR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
