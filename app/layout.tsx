import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import UnsavedChangesBanner from "@/components/UnsavedChangesBanner";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Aetas Global - Shift Scheduler",
  description: "Automated Shift Scheduling Management System for Aetas Global Innovation Inc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <div className="relative min-h-screen flex">
          {/* Persistent Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 pl-64 flex flex-col min-h-screen">
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        </div>

        {/* Global Floating Banner for Unsaved Schedule Edits */}
        <UnsavedChangesBanner />

        {/* Premium Sonner Toast Notifications */}
        <Toaster position="top-right" closeButton richColors />
      </body>
    </html>
  );
}
