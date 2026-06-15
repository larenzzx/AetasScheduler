'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';
import Link from 'next/link';

interface ResponsiveLayoutShellProps {
  children: React.ReactNode;
}

export default function ResponsiveLayoutShell({ children }: ResponsiveLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Mobile Top Header */}
      <header className="flex md:hidden h-16 w-full items-center justify-between px-6 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none border border-slate-200"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white shadow-md shadow-emerald-950/20 text-xs">
            Æ
          </div>
          <span className="font-semibold text-xs tracking-wider text-slate-800 uppercase">Aetas Global</span>
        </Link>

        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
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
