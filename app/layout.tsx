import type { Metadata } from "next";

import "./globals.css";
import { cn } from "@/lib/utils";
import ResponsiveLayoutShell from "@/components/ResponsiveLayoutShell";
import UnsavedChangesBanner from "@/components/UnsavedChangesBanner";
import { Toaster } from "@/components/ui/sonner";

import { Inter, Outfit } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Aetas Global - Shift Scheduler",
  description: "Automated Shift Scheduling Management System for Aetas Global Innovation Inc.",
  icons: {
    icon: "/ATS_logo.PNG",
    shortcut: "/ATS_logo.PNG",
    apple: "/ATS_logo.PNG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans dark", inter.variable, outfit.variable)}>
      <body className="antialiased bg-background text-foreground min-h-screen">
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
