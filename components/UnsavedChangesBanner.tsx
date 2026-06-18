'use client';

import { useScheduleStore } from '@/store/useScheduleStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, Save, RotateCcw, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function UnsavedChangesBanner() {
  const pathname = usePathname();
  const { 
    unsavedChanges, 
    discardChanges, 
    saveChanges, 
    loading,
    setUnsavedChangesBannerHeight
  } = useScheduleStore();

  const changeCount = Object.keys(unsavedChanges).length;
  const isVisible = pathname !== '/login' && changeCount > 0;
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setUnsavedChangesBannerHeight(0);
    }
  }, [isVisible, setUnsavedChangesBannerHeight]);

  useEffect(() => {
    if (!isVisible || !bannerRef.current) return;

    const element = bannerRef.current;
    
    // Set initial height
    const initialHeight = element.getBoundingClientRect().height;
    setUnsavedChangesBannerHeight(initialHeight);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.target.getBoundingClientRect().height;
        setUnsavedChangesBannerHeight(height);
      }
    });

    observer.observe(element);
    return () => {
      observer.unobserve(element);
    };
  }, [isVisible, setUnsavedChangesBannerHeight]);

  if (!isVisible) return null;

  const handleSave = async () => {
    try {
      await saveChanges();
      toast.success('Schedule saved successfully!');
    } catch {
      toast.error('Failed to save schedule. Please try again.');
    }
  };

  return (
    <div ref={bannerRef} className="fixed bottom-6 left-6 md:left-[280px] right-6 z-50 flex flex-col sm:flex-row gap-4 sm:items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Unsaved Changes</p>
          <p className="text-xs text-slate-500">
            You have {changeCount} unsaved change{changeCount > 1 ? 's' : ''} to the schedule grid.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={discardChanges}
          disabled={loading}
          className="border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Discard
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/20 transition-all duration-200"
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
