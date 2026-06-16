import { create } from 'zustand';
import { Team, DayOfWeek, ShiftType, ScheduleWeek, ScheduleGridRow, Employee } from '@/types';
import { getScheduleData, saveScheduleEntries, deleteScheduleWeek } from '@/app/actions/schedule';
import { getCurrentUser } from '@/app/actions/auth';
import { startOfWeek, format } from 'date-fns';

interface UserProfile {
  email: string;
  name: string;
}

interface ScheduleState {
  currentWeekDate: string; // YYYY-MM-DD (always a Monday)
  activeTab: 'ALL' | 'ALABANG' | 'ZAMBOANGA';
  
  // Data for both teams
  alabangWeek: ScheduleWeek | null;
  zamboangaWeek: ScheduleWeek | null;
  alabangRows: ScheduleGridRow[];
  zamboangaRows: ScheduleGridRow[];
  alabangEmployees: Employee[];
  zamboangaEmployees: Employee[];
  shiftTypes: ShiftType[];
  loading: boolean;
  
  // Unsaved changes tracking: key is "employeeId_dayOfWeek" -> value is shiftTypeId | null
  unsavedChanges: Record<string, string | null>;
  
  activeShiftFilter: string | null;
  setActiveShiftFilter: (filter: string | null) => void;
  
  currentUser: UserProfile | null;
  fetchCurrentUser: () => Promise<void>;
  
  companyName: string;
  setCompanyName: (name: string) => void;
  
  // Actions
  setWeekDate: (dateStr: string) => void;
  setActiveTab: (tab: 'ALL' | 'ALABANG' | 'ZAMBOANGA') => void;
  fetchSchedule: () => Promise<void>;
  updateCell: (employeeId: string, dayOfWeek: DayOfWeek, shiftTypeId: string | null) => void;
  discardChanges: () => void;
  saveChanges: () => Promise<void>;
  hasChanges: () => boolean;
  deleteSchedule: (team: Team) => Promise<void>;
}

// Default current week date as Monday of the current week
const getInitialMonday = () => {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  currentWeekDate: getInitialMonday(),
  activeTab: 'ALABANG',
  companyName: typeof window !== 'undefined' ? localStorage.getItem('companyName') || 'AETAS GLOBAL INNOVATION INC' : 'AETAS GLOBAL INNOVATION INC',
  setCompanyName: (name) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('companyName', name);
    }
    set({ companyName: name });
  },
  alabangWeek: null,
  zamboangaWeek: null,
  alabangRows: [],
  zamboangaRows: [],
  alabangEmployees: [],
  zamboangaEmployees: [],
  shiftTypes: [],
  loading: false,
  unsavedChanges: {},
  activeShiftFilter: null,
  setActiveShiftFilter: (filter) => set({ activeShiftFilter: filter }),
  currentUser: null,
  fetchCurrentUser: async () => {
    const user = await getCurrentUser();
    set({ currentUser: user });
  },

  setWeekDate: (dateStr) => {
    set({ currentWeekDate: dateStr, unsavedChanges: {} });
    get().fetchSchedule();
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  fetchSchedule: async () => {
    const { currentWeekDate } = get();
    set({ loading: true });
    try {
      const [alabangData, zamboangaData] = await Promise.all([
        getScheduleData(currentWeekDate, Team.ALABANG),
        getScheduleData(currentWeekDate, Team.ZAMBOANGA),
      ]);
      
      set({
        alabangWeek: alabangData.week,
        alabangRows: alabangData.rows,
        alabangEmployees: alabangData.employees,
        zamboangaWeek: zamboangaData.week,
        zamboangaRows: zamboangaData.rows,
        zamboangaEmployees: zamboangaData.employees,
        shiftTypes: alabangData.shiftTypes, // shiftTypes are identical across teams
        unsavedChanges: {},
      });
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateCell: (employeeId, dayOfWeek, shiftTypeId) => {
    const key = `${employeeId}_${dayOfWeek}`;
    const { alabangRows, zamboangaRows, unsavedChanges } = get();
    
    // Find employee and their original value in either team
    let row = alabangRows.find((r) => r.employee.id === employeeId);
    if (!row) {
      row = zamboangaRows.find((r) => r.employee.id === employeeId);
    }
    
    const originalValue = row ? row.entries[dayOfWeek]?.shiftTypeId : null;
    const newChanges = { ...unsavedChanges };
    
    if (originalValue === shiftTypeId) {
      delete newChanges[key];
    } else {
      newChanges[key] = shiftTypeId;
    }
    
    set({ unsavedChanges: newChanges });
  },

  discardChanges: () => {
    set({ unsavedChanges: {} });
  },

  saveChanges: async () => {
    const { alabangWeek, zamboangaWeek, alabangRows, zamboangaRows, unsavedChanges, fetchSchedule } = get();
    if (Object.keys(unsavedChanges).length === 0) return;
    
    set({ loading: true });
    try {
      // Split updates by team to save to respective weekId
      const alabangUpdates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }> = [];
      const zamboangaUpdates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }> = [];

      Object.entries(unsavedChanges).forEach(([key, shiftTypeId]) => {
        const [employeeId, dayOfWeek] = key.split('_');
        
        // Find which team the employee belongs to
        const isAlabang = alabangRows.some((r) => r.employee.id === employeeId);
        
        const update = {
          employeeId,
          dayOfWeek: dayOfWeek as DayOfWeek,
          shiftTypeId,
        };

        if (isAlabang) {
          alabangUpdates.push(update);
        } else {
          zamboangaUpdates.push(update);
        }
      });

      // Save entries in parallel for both teams if weeks are initialized
      const savePromises = [];
      
      if (alabangUpdates.length > 0 && alabangWeek) {
        savePromises.push(saveScheduleEntries(alabangWeek.id, alabangUpdates));
      }
      
      if (zamboangaUpdates.length > 0 && zamboangaWeek) {
        savePromises.push(saveScheduleEntries(zamboangaWeek.id, zamboangaUpdates));
      }

      await Promise.all(savePromises);
      await fetchSchedule();
    } catch (error) {
      console.error('Failed to save schedule entries:', error);
      set({ loading: false });
      throw error;
    }
  },

  hasChanges: () => {
    return Object.keys(get().unsavedChanges).length > 0;
  },

  deleteSchedule: async (team) => {
    const { currentWeekDate, fetchSchedule } = get();
    set({ loading: true });
    try {
      await deleteScheduleWeek(currentWeekDate, team);
      set({ unsavedChanges: {} });
      await fetchSchedule();
    } catch (error) {
      console.error('Failed to delete schedule week:', error);
      set({ loading: false });
      throw error;
    }
  },
}));
