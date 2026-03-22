import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import OfflineBanner from "@/components/layout/OfflineBanner";
import UpdateNotifier from "@/components/UpdateNotifier";
import { SyncProvider } from "@/context/SyncContext";
import { ToastContainer } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Despatch Tracker",
  description: "Track unscanned tyre slips for dispatch inspection at ATT",
  manifest: "./manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Despatch Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="./icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50">
        <SyncProvider>
          <OfflineBanner />
          <ToastContainer />
          <UpdateNotifier />
          <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
            {children}
          </main>
          <BottomNav />
        </SyncProvider>
      </body>
    </html>
  );
}
