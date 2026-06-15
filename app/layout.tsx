import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ResponsiveLayoutShell from "@/components/ResponsiveLayoutShell";
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
        {/* Responsive Layout Shell with sidebar toggle */}
        <ResponsiveLayoutShell>
          {children}
        </ResponsiveLayoutShell>

        {/* Global Floating Banner for Unsaved Schedule Edits */}
        <UnsavedChangesBanner />

        {/* Premium Sonner Toast Notifications */}
        <Toaster position="top-right" closeButton richColors />
      </body>
    </html>
  );
}
