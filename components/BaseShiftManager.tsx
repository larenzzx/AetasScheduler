'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { updateEmployeeBaseShift } from '@/app/actions/employee';
import { toast } from 'sonner';
import { Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BaseShiftManager() {
  const { 
    alabangEmployees, 
    zamboangaEmployees, 
    shiftTypes, 
    fetchSchedule,
    activeShiftFilter
  } = useScheduleStore();
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateBaseShift = async (employeeId: string, shiftTypeId: string | null) => {
    setUpdatingId(employeeId);
    try {
      const res = await updateEmployeeBaseShift(employeeId, shiftTypeId);
      if (res.success) {
        toast.success('Base shift updated successfully!');
        await fetchSchedule();
      } else {
        toast.error(res.error || 'Failed to update base shift.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred.');
    } finally {
      setUpdatingId(null);
    }
  };

  const allEmployees = [...alabangEmployees, ...zamboangaEmployees];
  allEmployees.sort((a, b) => (parseInt(a.employeeId, 10) || 0) - (parseInt(b.employeeId, 10) || 0));

  const filteredEmployees = allEmployees.filter((emp) => {
    if (!activeShiftFilter) return true;
    if (activeShiftFilter === 'DAY-OFF') {
      return !emp.currentShiftTypeId;
    }
    const currentShift = shiftTypes.find((st) => st.id === emp.currentShiftTypeId);
    if (!currentShift) return false;
    if (activeShiftFilter === 'DAY SHIFT') {
      return currentShift.name.startsWith('DAY SHIFT');
    }
    return currentShift.name === activeShiftFilter;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Award className="h-5 w-5 text-emerald-600" />
          Employee Base Shift Configuration
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Assign default shift templates for each employee. These serve as the baseline for schedule generation.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 w-32">Employee ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Team</th>
              <th className="px-6 py-4">Current Base Shift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                  {activeShiftFilter 
                    ? `No employees are assigned to base shift "${activeShiftFilter}".`
                    : "No active employees found."}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const isUpdating = updatingId === emp.id;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-500">
                      {emp.employeeId}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        {emp.isFixedSchedule && (
                          <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                            Fixed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border",
                        emp.team === 'ALABANG'
                          ? "bg-sky-50 border-sky-200/50 text-sky-700"
                          : "bg-indigo-50 border-indigo-200/50 text-indigo-700"
                      )}>
                        {emp.team}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                           value={emp.currentShiftTypeId || 'NONE'}
                           disabled={isUpdating}
                           onChange={(e) => {
                             const val = e.target.value;
                             handleUpdateBaseShift(emp.id, val === 'NONE' ? null : val);
                           }}
                           className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold cursor-pointer min-w-[200px]"
                        >
                          <option value="NONE">Unassigned (All Day-offs)</option>
                          {shiftTypes.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                        {isUpdating && <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
