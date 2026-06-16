'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getShiftTypes, 
  createShiftType, 
  updateShiftType, 
  deleteShiftType, 
  updateShiftSortOrders 
} from '@/app/actions/shift-type';
import { ShiftType } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Clock, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Loader2,
  AlertCircle,
  HelpCircle,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Preset color options for premium look
const PRESET_COLORS = [
  { name: 'Slate/Gray', value: '#94A3B8' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Lavender', value: '#D8B4FE' },
  { name: 'Rose/Red', value: '#EF4444' },
  { name: 'Yellow', value: '#EAB308' },
];

export default function ShiftTypesPage() {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Shift states
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [hasHours, setHasHours] = useState(true);
  const [newStartTime, setNewStartTime] = useState('8:00 AM');
  const [newEndTime, setNewEndTime] = useState('5:00 PM');
  const [newColorHex, setNewColorHex] = useState('#94A3B8');

  // Edit Shift states
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHasHours, setEditHasHours] = useState(true);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editColorHex, setEditColorHex] = useState('');

  // Load shift types
  const loadShifts = useCallback(async () => {
    try {
      const data = await getShiftTypes();
      setShiftTypes(data);
    } catch (error) {
      console.error('Failed to load shift types:', error);
      toast.error('Failed to load shift types.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Handle Create Shift Type
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim()) {
      setAddError('Shift Name is required.');
      return;
    }

    if (hasHours && (!newStartTime.trim() || !newEndTime.trim())) {
      setAddError('Start Time and End Time are required for shifts with fixed hours.');
      return;
    }

    setAddLoading(true);
    try {
      const response = await createShiftType({
        name: newName.trim(),
        startTime: hasHours ? newStartTime.trim() : null,
        endTime: hasHours ? newEndTime.trim() : null,
        colorHex: newColorHex,
      });

      if (response.success) {
        toast.success(`Shift type "${newName.toUpperCase()}" created successfully!`);
        setAddOpen(false);
        // Reset state
        setNewName('');
        setHasHours(true);
        setNewStartTime('8:00 AM');
        setNewEndTime('5:00 PM');
        setNewColorHex('#94A3B8');
        // Reload list
        loadShifts();
      } else {
        setAddError(response.error || 'Failed to create shift type.');
      }
    } catch (error) {
      console.error('Error in handleCreate:', error);
      setAddError('An unexpected error occurred.');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Dialog
  const openEditDialog = (shift: ShiftType) => {
    setEditingId(shift.id);
    setEditName(shift.name);
    setEditHasHours(shift.startTime !== null);
    setEditStartTime(shift.startTime || '8:00 AM');
    setEditEndTime(shift.endTime || '5:00 PM');
    setEditColorHex(shift.colorHex);
    setEditError(null);
    setEditOpen(true);
  };

  // Handle Update Shift Type
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError('Shift Name is required.');
      return;
    }

    if (editHasHours && (!editStartTime.trim() || !editEndTime.trim())) {
      setEditError('Start Time and End Time are required for shifts with fixed hours.');
      return;
    }

    setEditLoading(true);
    try {
      const response = await updateShiftType(editingId, {
        name: editName.trim(),
        startTime: editHasHours ? editStartTime.trim() : null,
        endTime: editHasHours ? editEndTime.trim() : null,
        colorHex: editColorHex,
      });

      if (response.success) {
        toast.success(`Shift type details updated successfully!`);
        setEditOpen(false);
        loadShifts();
      } else {
        setEditError(response.error || 'Failed to update shift type.');
      }
    } catch (error) {
      console.error('Error in handleUpdate:', error);
      setEditError('An unexpected error occurred.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Shift Type
  const handleDelete = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the shift type "${name}"?`);
    if (!confirmDelete) return;

    try {
      const response = await deleteShiftType(id);
      if (response.success) {
        toast.success(`Shift type "${name}" deleted successfully.`);
        loadShifts();
      } else {
        toast.error(response.error || `Failed to delete shift type.`);
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast.error('An unexpected error occurred.');
    }
  };

  // Reorder shift types (Move Up or Down)
  const handleMove = async (index: number, direction: 'UP' | 'DOWN') => {
    const newOrder = [...shiftTypes];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;

    // Swap elements
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    // Optimistically update UI
    setShiftTypes(newOrder);

    // Call server action to persist sorting
    const orderedIds = newOrder.map((s) => s.id);
    const response = await updateShiftSortOrders(orderedIds);
    if (!response.success) {
      toast.error(response.error || 'Failed to update shift ordering.');
      loadShifts(); // Revert to database state on error
    } else {
      toast.success('Shift order updated.');
    }
  };

  // Search filter
  const filteredShifts = shiftTypes.filter((s) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-emerald-600" />
            Shift Type Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage operational shift time ranges, color themes, and display ordering.
          </p>
        </div>

        {/* Add Shift Trigger */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10 font-medium transition-all duration-200">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Shift Type
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  Add Custom Shift Type
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Create a new shift type with custom timings and display colors.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {addError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200/50">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                {/* Shift Name */}
                <div className="grid gap-2">
                  <label htmlFor="shiftName" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Shift Name
                  </label>
                  <input
                    id="shiftName"
                    type="text"
                    required
                    placeholder="e.g. AFTERNOON SHIFT"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                  />
                </div>

                {/* Has Working Hours Checkbox */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    id="hasHours"
                    type="checkbox"
                    checked={hasHours}
                    onChange={(e) => setHasHours(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                  />
                  <label htmlFor="hasHours" className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer">
                    This shift has fixed work hours
                  </label>
                </div>

                {/* Start & End Times */}
                {hasHours && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in-50 duration-200">
                    <div className="grid gap-2">
                      <label htmlFor="startTime" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Start Time
                      </label>
                      <input
                        id="startTime"
                        type="text"
                        required
                        placeholder="e.g. 8:00 AM"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="endTime" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        End Time
                      </label>
                      <input
                        id="endTime"
                        type="text"
                        required
                        placeholder="e.g. 5:00 PM"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Color Selection */}
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Display Color theme
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewColorHex(color.value)}
                        className={cn(
                          "h-8 w-8 rounded-full border flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-105",
                          newColorHex === color.value 
                            ? "border-slate-800 ring-2 ring-emerald-500/30 scale-105" 
                            : "border-black/5"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {newColorHex === color.value && (
                          <span className="block h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 font-mono">Custom Hex:</span>
                    <input
                      type="text"
                      placeholder="#94A3B8"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="rounded border border-slate-200 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono w-24 text-center uppercase"
                    />
                    <div 
                      className="h-5 w-5 rounded border border-black/5" 
                      style={{ backgroundColor: newColorHex }} 
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={addLoading}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10"
                >
                  {addLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add Shift Type'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shift types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Use arrows to sort chronological progression order.</span>
        </div>
      </div>

      {/* Main Grid / Table Area */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg bg-slate-200" />
          <Skeleton className="h-16 w-full rounded-lg bg-slate-200" />
          <Skeleton className="h-16 w-full rounded-lg bg-slate-200" />
          <Skeleton className="h-16 w-full rounded-lg bg-slate-200" />
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-4">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Shift Types Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Try adjusting your search query or add a custom shift type to begin scheduling.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4 w-20 text-center"><Hash className="h-3.5 w-3.5 mx-auto text-slate-400" /></th>
                  <th className="px-6 py-4">Shift Name</th>
                  <th className="px-6 py-4">Working Hours</th>
                  <th className="px-6 py-4">Display Theme</th>
                  <th className="px-6 py-4 text-center w-32">Ordering</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredShifts.map((shift, idx) => {
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      {/* Sort Index */}
                      <td className="px-6 py-4 text-center font-mono font-medium text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span 
                            className="h-2.5 w-2.5 rounded-full border border-black/5" 
                            style={{ backgroundColor: shift.colorHex }} 
                          />
                          <span>{shift.name}</span>
                        </div>
                      </td>

                      {/* Working Hours */}
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {shift.startTime && shift.endTime ? (
                          <span>{shift.startTime} – {shift.endTime}</span>
                        ) : (
                          <span className="text-slate-400 italic">No set working hours</span>
                        )}
                      </td>

                      {/* Display Color Hex */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 uppercase">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-4.5 w-8 rounded border border-black/5 shadow-inner" 
                            style={{ backgroundColor: shift.colorHex }} 
                          />
                          <span>{shift.colorHex}</span>
                        </div>
                      </td>

                      {/* Reorder Buttons */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, 'UP')}
                            className="text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={idx === filteredShifts.length - 1}
                            onClick={() => handleMove(idx, 'DOWN')}
                            className="text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(shift)}
                            className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(shift.id, shift.name)}
                            className="h-8 px-2.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Delete Shift Type"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Shift Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="text-slate-800 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-emerald-600" />
                Edit Shift Type details
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Update shift name, timings, or color mappings.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {editError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200/50">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Shift Name */}
              <div className="grid gap-2">
                <label htmlFor="editShiftName" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Shift Name
                </label>
                <input
                  id="editShiftName"
                  type="text"
                  required
                  placeholder="e.g. AFTERNOON SHIFT"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                />
              </div>

              {/* Has Working Hours Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="editHasHours"
                  type="checkbox"
                  checked={editHasHours}
                  onChange={(e) => setEditHasHours(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                />
                <label htmlFor="editHasHours" className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer">
                  This shift has fixed work hours
                </label>
              </div>

              {/* Start & End Times */}
              {editHasHours && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in-50 duration-200">
                  <div className="grid gap-2">
                    <label htmlFor="editStartTime" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Start Time
                    </label>
                    <input
                      id="editStartTime"
                      type="text"
                      required
                      placeholder="e.g. 8:00 AM"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="editEndTime" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      End Time
                    </label>
                    <input
                      id="editEndTime"
                      type="text"
                      required
                      placeholder="e.g. 5:00 PM"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Color Selection */}
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Display Color theme
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setEditColorHex(color.value)}
                      className={cn(
                        "h-8 w-8 rounded-full border flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-105",
                        editColorHex === color.value 
                          ? "border-slate-800 ring-2 ring-emerald-500/30 scale-105" 
                          : "border-black/5"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {editColorHex === color.value && (
                        <span className="block h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400 font-mono">Custom Hex:</span>
                  <input
                    type="text"
                    placeholder="#94A3B8"
                    value={editColorHex}
                    onChange={(e) => setEditColorHex(e.target.value)}
                    className="rounded border border-slate-200 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono w-24 text-center uppercase"
                  />
                  <div 
                    className="h-5 w-5 rounded border border-black/5" 
                    style={{ backgroundColor: editColorHex }} 
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editLoading}
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
