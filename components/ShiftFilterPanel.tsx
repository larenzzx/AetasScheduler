'use client';

import { useScheduleStore } from '@/store/useScheduleStore';
import { cn } from '@/lib/utils';
import { Filter } from 'lucide-react';

export default function ShiftFilterPanel() {
  const { shiftTypes, activeShiftFilter, setActiveShiftFilter } = useScheduleStore();

  const handleToggleFilter = (shiftName: string | null) => {
    if (activeShiftFilter === shiftName) {
      setActiveShiftFilter(null); // Clear filter if toggled again
    } else {
      setActiveShiftFilter(shiftName);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-slate-100 text-[#00EEF5] flex items-center justify-center shrink-0 border border-slate-200">
          <Filter className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Shift Coverage Filter
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            Select a shift to display only scheduled employees and highlight their assignments.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {/* Show All option */}
        <button
          onClick={() => setActiveShiftFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 border",
            activeShiftFilter === null
              ? "bg-[#1023FD] text-white border-transparent shadow-md shadow-[#1023FD]/10"
              : "bg-slate-100 text-slate-300 border-slate-200 hover:bg-slate-200 hover:text-white"
          )}
        >
          All Shifts
        </button>

        {/* Combined Day option */}
        <button
          onClick={() => handleToggleFilter('DAY SHIFT')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 border flex items-center gap-1.5",
            activeShiftFilter === 'DAY SHIFT'
              ? "text-white border-transparent shadow-md"
              : "bg-slate-100 text-slate-300 border-slate-200 hover:bg-slate-200 hover:text-white"
          )}
          style={
            activeShiftFilter === 'DAY SHIFT'
              ? { backgroundColor: '#22C55E', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)' }
              : undefined
          }
        >
          <span 
            className="h-1.5 w-1.5 rounded-full" 
            style={{ backgroundColor: activeShiftFilter === 'DAY SHIFT' ? '#fff' : '#22C55E' }} 
          />
          Day
        </button>

        {/* Dynamic Database Shifts */}
        {shiftTypes.map((shift) => {
          const isActive = activeShiftFilter === shift.name;
          return (
            <button
              key={shift.id}
              onClick={() => handleToggleFilter(shift.name)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 border flex items-center gap-1.5",
                isActive
                  ? "text-white border-transparent shadow-md"
                  : "bg-slate-100 text-slate-300 border-slate-200 hover:bg-slate-200 hover:text-white"
              )}
              style={
                isActive
                  ? { backgroundColor: shift.colorHex, boxShadow: `0 2px 8px ${shift.colorHex}33` }
                  : undefined
              }
            >
              <span 
                className="h-1.5 w-1.5 rounded-full" 
                style={{ backgroundColor: isActive ? '#fff' : shift.colorHex }} 
              />
              {shift.name.replace(' SHIFT', '')}
            </button>
          );
        })}

        {/* Day-Off Option */}
        <button
          onClick={() => handleToggleFilter('DAY-OFF')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 border flex items-center gap-1.5",
            activeShiftFilter === 'DAY-OFF'
              ? "bg-[#EF4444] text-white border-transparent shadow-md shadow-[#EF4444]/10"
              : "bg-slate-100 text-slate-300 border-slate-200 hover:bg-slate-200 hover:text-white"
          )}
        >
          <span 
            className="h-1.5 w-1.5 rounded-full" 
            style={{ backgroundColor: activeShiftFilter === 'DAY-OFF' ? '#fff' : '#EF4444' }} 
          />
          Day-Off
        </button>
      </div>
    </div>
  );
}
