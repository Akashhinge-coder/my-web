import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/frontend/components/shared/ServiceWorker";
import { OfflineBanner } from "@/frontend/components/shared/OfflineBanner";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", axes: ["opsz"] });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["400", "500"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: { default: "MENUARA — Restaurant Management", template: "%s · MENUARA" },
  description: "QR-based ordering, AR food visualization, and complete restaurant management for Indian restaurants.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#C17D3C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
