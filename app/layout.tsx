import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/AuthGate";
import { SongDataProvider } from "@/components/SongDataProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "뭐 부를까?",
  description: "우리만의 플레이리스트",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "뭐 부를까?",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#101019",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko-KR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthGate><SongDataProvider>{children}</SongDataProvider></AuthGate>
      </body>
    </html>
  );
}
