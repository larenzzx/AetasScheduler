'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, Save, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function UnsavedChangesBanner() {
  const pathname = usePathname();
  const { 
    unsavedChanges, 
    discardChanges, 
    saveChanges, 
    loading,
    setUnsavedChangesBannerHeight
  } = useScheduleStore();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
      const result = await saveChanges(false);
      if (result) {
        if (!result.success) {
          setValidationErrors(result.errors);
          setOverrideOpen(true);
        } else {
          toast.success('Schedule saved successfully!');
          result.warnings.forEach((warn) => {
            toast.warning(warn, { duration: 10000 });
          });
        }
      }
    } catch {
      toast.error('Failed to save schedule. Please try again.');
    }
  };

  const handleOverrideSave = async () => {
    setOverrideOpen(false);
    try {
      const result = await saveChanges(true); // Save with overrideRules = true
      if (result) {
        if (result.success) {
          toast.success('Schedule saved successfully with overrides!');
          result.warnings.forEach((warn) => {
            toast.warning(warn, { duration: 10000 });
          });
        } else {
          result.errors.forEach((err) => {
            toast.error(err, { duration: 10000 });
          });
        }
      }
    } catch {
      toast.error('Failed to save schedule. Please try again.');
    }
  };

  return (
    <>
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

      {/* Override Confirmation Dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white border-slate-200 shadow-xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-slate-800 flex items-center gap-2.5 text-lg font-bold">
              <AlertCircle className="h-5 w-5 text-amber-500 animate-pulse" />
              Scheduling Constraint Violations
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              The following operational rules or constraints are not followed by the unsaved changes:
            </DialogDescription>
          </DialogHeader>

          {/* Violations List */}
          <div className="flex-1 overflow-y-auto my-3 border border-slate-100 rounded-xl bg-slate-50/50 p-4 max-h-[40vh] space-y-3">
            {validationErrors.map((err, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                <span>{err}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex flex-row justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOverrideOpen(false)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel & Adjust
            </Button>
            <Button
              type="button"
              onClick={handleOverrideSave}
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium border-none shadow-md shadow-amber-500/10"
            >
              Override & Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
