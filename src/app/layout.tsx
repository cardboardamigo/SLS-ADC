import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import InstallPrompt from "@/components/InstallPrompt";
import NotificationManager from "@/components/NotificationManager";

export const metadata: Metadata = {
  title: "Census Tracker",
  description: "Average Daily Census tracking application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Census Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e3a5f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="safe-area-top safe-area-bottom">
        <AuthProvider>
          {children}
          <InstallPrompt />
          <NotificationManager />
        </AuthProvider>
      </body>
    </html>
  );
}
