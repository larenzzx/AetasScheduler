'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface ResponsiveLayoutShellProps {
  children: React.ReactNode;
}

export default function ResponsiveLayoutShell({ children }: ResponsiveLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile Top Header */}
      <header className="flex md:hidden h-20 w-full items-center justify-between px-6 border-b border-[#11B4D4]/20 bg-[#080C1A] sticky top-0 z-30 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-[#11B4D4] hover:bg-[#062E56] hover:text-white focus:outline-none border border-[#11B4D4]/20"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <Link href="/" className="flex items-center gap-2">
          <Image src="/ATS_logo.PNG" alt="ATS Logo" width={32} height={32} className="h-8 w-auto object-contain shrink-0" priority />
          <div className="flex flex-col text-left leading-tight">
            <span className="font-bold text-xs tracking-wide text-white">AETAS GLOBAL</span>
            <span className="text-[9px] text-[#11B4D4]/60 font-bold tracking-wider uppercase -mt-0.5">Scheduler</span>
          </div>
        </Link>

        <div className="h-8 w-8 rounded-full bg-[#062E56] border border-[#11B4D4]/30 flex items-center justify-center text-[10px] font-bold text-white">
          AD
        </div>
      </header>

      {/* Sidebar - Toggleable Drawer on Mobile, Fixed on Desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        <main className="flex-1 p-4 md:p-8 pb-36">
          {children}
        </main>
      </div>
    </div>
  );
}
