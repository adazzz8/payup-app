import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://payup.app"),
  title: {
    default: "PayUp",
    template: "%s | PayUp",
  },
  description: "PayUp - אפליקציה פשוטה לניהול חובות, תזכורות ובקשות תשלום.",
  applicationName: "PayUp",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PayUp",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0E9F6E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
