'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Clock, 
  Settings,
  ChevronRight,
  X,
  LogOut
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Shift Types', href: '/shift-types', icon: Clock },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#080C1A] text-slate-200 border-r border-[#11B4D4]/20 transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-[#11B4D4]/20 bg-[#080C1A]">
          <Link href="/" onClick={onClose} className="flex items-center gap-3">
            <Image src="/ATS_logo.PNG" alt="ATS Logo" width={40} height={40} className="h-10 w-auto object-contain shrink-0" priority />
            <div className="flex flex-col text-left">
              <span className="font-bold text-sm tracking-wide text-white">AETAS GLOBAL</span>
              <span className="text-[10px] text-[#11B4D4]/60 font-bold tracking-wider uppercase -mt-0.5">Scheduler</span>
            </div>
          </Link>

          {/* Close button for mobile */}
          {onClose && (
            <button 
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-slate-800 text-white shadow-sm" 
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "h-4.5 w-4.5 transition-colors duration-200",
                    isActive ? "text-emerald-500" : "text-slate-500 group-hover:text-slate-400"
                  )} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-emerald-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Profile */}
        <div className="border-t border-[#11B4D4]/20 bg-[#080C1A] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#062E56] text-white font-semibold text-xs border border-[#11B4D4]/30">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">Admin Dashboard</span>
              <span className="text-[10px] text-[#11B4D4]/60">admin@aetasglobal.com</span>
            </div>
          </div>
          <button 
            onClick={() => setLogoutOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#062E56] hover:text-red-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </aside>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-500" />
              Confirm Log Out
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to log out of your session? You will need to log back in to manage schedules.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setLogoutOpen(false)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={() => logout()}
              className="bg-red-600 hover:bg-red-700 text-white border-none shadow-md shadow-red-600/10"
            >
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
