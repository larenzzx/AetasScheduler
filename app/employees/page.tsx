'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  toggleEmployeeStatus 
} from '@/app/actions/employee';
import { Employee, Team } from '@/types';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  UserCheck, 
  UserX, 
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'ALABANG' | 'ZAMBOANGA'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add Employee states
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newTeam, setNewTeam] = useState<Team>(Team.ALABANG);

  // Edit Employee states
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editTeam, setEditTeam] = useState<Team>(Team.ALABANG);
  const [editIsActive, setEditIsActive] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const emps = await getEmployees();
      setEmployees(emps);
    } catch (error) {
      console.error('Failed to load employee data:', error);
      toast.error('Failed to load employee list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Employee
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    // Client-side validations
    if (!newName.trim()) {
      setAddError('Employee Name is required.');
      return;
    }
    if (!newEmployeeId.trim()) {
      setAddError('Employee ID is required.');
      return;
    }

    setAddLoading(true);
    try {
      const response = await createEmployee({
        name: newName.trim(),
        employeeId: newEmployeeId.trim(),
        team: newTeam,
      });

      if (response.success) {
        toast.success(`Employee ${newName} created successfully!`);
        setAddOpen(false);
        // Reset state
        setNewName('');
        setNewEmployeeId('');
        setNewTeam(Team.ALABANG);
        // Reload list
        loadData();
      } else {
        setAddError(response.error || 'Failed to create employee.');
      }
    } catch (error) {
      console.error('Error in handleCreate:', error);
      setAddError('An unexpected error occurred.');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Dialog
  const openEditDialog = (employee: Employee) => {
    setEditingId(employee.id);
    setEditName(employee.name);
    setEditEmployeeId(employee.employeeId);
    setEditTeam(employee.team);
    setEditIsActive(employee.isActive);
    setEditError(null);
    setEditOpen(true);
  };

  // Handle Update Employee
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);

    // Client-side validations
    if (!editName.trim()) {
      setEditError('Employee Name is required.');
      return;
    }
    if (!editEmployeeId.trim()) {
      setEditError('Employee ID is required.');
      return;
    }

    setEditLoading(true);
    try {
      const response = await updateEmployee(editingId, {
        name: editName.trim(),
        employeeId: editEmployeeId.trim(),
        team: editTeam,
        isActive: editIsActive,
      });

      if (response.success) {
        toast.success(`Employee details updated successfully!`);
        setEditOpen(false);
        loadData();
      } else {
        setEditError(response.error || 'Failed to update employee.');
      }
    } catch (error) {
      console.error('Error in handleUpdate:', error);
      setEditError('An unexpected error occurred.');
    } finally {
      setEditLoading(false);
    }
  };

  // Toggle active status inline (Soft Delete)
  const handleStatusToggle = async (employee: Employee) => {
    const nextStatus = !employee.isActive;
    const actionText = nextStatus ? 'activate' : 'deactivate';

    try {
      const response = await toggleEmployeeStatus(employee.id, nextStatus);
      if (response.success) {
        toast.success(`Successfully ${nextStatus ? 'activated' : 'deactivated'} ${employee.name}`);
        loadData();
      } else {
        toast.error(response.error || `Failed to ${actionText} employee.`);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('An unexpected error occurred.');
    }
  };

  // Filter logic
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      emp.name.toLowerCase().includes(query) || 
      emp.employeeId.toLowerCase().includes(query);
    
    const matchesTeam = teamFilter === 'ALL' || emp.team === teamFilter;
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && emp.isActive) || 
      (statusFilter === 'INACTIVE' && !emp.isActive);

    return matchesSearch && matchesTeam && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Employee Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage profile names, teams, and active statuses.
          </p>
        </div>

        {/* Add Employee Dialog Trigger */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10 font-medium transition-all duration-200">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add Employee
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-slate-800 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-600" />
                  Add New Employee
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Fill in the details to create a new team member.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {addError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200/50">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                {/* Name */}
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Employee ID */}
                <div className="grid gap-2">
                  <label htmlFor="empId" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Employee ID
                  </label>
                  <input
                    id="empId"
                    type="text"
                    required
                    placeholder="e.g. 25"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Team Selection */}
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Team Location
                  </label>
                  <Select 
                    value={newTeam} 
                    onValueChange={(val) => { if (val) setNewTeam(val as Team); }}
                  >
                    <SelectTrigger className="border-slate-200 text-slate-800 w-full">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="ALABANG" className="hover:bg-slate-50">Team Alabang</SelectItem>
                      <SelectItem value="ZAMBOANGA" className="hover:bg-slate-50">Team Zamboanga</SelectItem>
                    </SelectContent>
                  </Select>
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
                    'Add Employee'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team:</span>
            <Select 
              value={teamFilter} 
              onValueChange={(val) => { if (val) setTeamFilter(val as 'ALL' | 'ALABANG' | 'ZAMBOANGA'); }}
            >
              <SelectTrigger className="border-slate-200 text-slate-800 min-w-[130px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL" className="hover:bg-slate-50">All Teams</SelectItem>
                <SelectItem value="ALABANG" className="hover:bg-slate-50">Team Alabang</SelectItem>
                <SelectItem value="ZAMBOANGA" className="hover:bg-slate-50">Team Zamboanga</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
            <Select 
              value={statusFilter} 
              onValueChange={(val) => { if (val) setStatusFilter(val as 'ALL' | 'ACTIVE' | 'INACTIVE'); }}
            >
              <SelectTrigger className="border-slate-200 text-slate-800 min-w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL" className="hover:bg-slate-50">All Status</SelectItem>
                <SelectItem value="ACTIVE" className="hover:bg-slate-50 font-semibold text-emerald-600">Active</SelectItem>
                <SelectItem value="INACTIVE" className="hover:bg-slate-50 font-semibold text-red-500">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Table / Grid Area */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg bg-slate-200" />
          <Skeleton className="h-16 w-full rounded-lg bg-slate-200" />
          <Skeleton className="h-16 w-full rounded-lg bg-slate-200" />
          <Skeleton className="h-16 w-full rounded-lg bg-slate-200" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Employees Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Try adjusting your search query or filter criteria, or add a new employee profile.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop view: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4 w-32">Employee ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredEmployees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors duration-150",
                      !emp.isActive && "bg-slate-50/30 opacity-70"
                    )}
                  >
                    {/* Employee ID */}
                    <td className="px-6 py-4 font-mono font-medium text-slate-600">
                      {emp.employeeId}
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {emp.name}
                    </td>

                    {/* Team */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border",
                        emp.team === 'ALABANG'
                          ? "bg-sky-50 border-sky-200/50 text-sky-700"
                          : "bg-indigo-50 border-indigo-200/50 text-indigo-700"
                      )}>
                        {emp.team}
                      </span>
                    </td>

                    {/* Active Status Badge */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                        emp.isActive 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                          : "bg-red-50 border-red-200 text-red-500"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", emp.isActive ? "bg-emerald-500" : "bg-red-500")} />
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(emp)}
                          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                          Edit
                        </Button>

                        {/* Direct status toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(emp)}
                          className={cn(
                            "h-8 px-2.5",
                            emp.isActive 
                              ? "text-red-500 hover:bg-red-50 hover:text-red-600" 
                              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          )}
                          title={emp.isActive ? 'Deactivate Employee' : 'Activate Employee'}
                        >
                          {emp.isActive ? (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view: Stacked list cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredEmployees.map((emp) => (
              <div 
                key={emp.id} 
                className={cn(
                  "p-4 flex flex-col gap-3",
                  !emp.isActive && "bg-slate-50/40 opacity-70"
                )}
              >
                {/* ID, Team & Status Header */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">ID: {emp.employeeId}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                      emp.team === 'ALABANG'
                        ? "bg-sky-50 border-sky-200/50 text-sky-700"
                        : "bg-indigo-50 border-indigo-200/50 text-indigo-700"
                    )}>
                      {emp.team}
                    </span>
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border",
                      emp.isActive 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : "bg-red-50 border-red-200 text-red-500"
                    )}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-800 text-sm truncate">{emp.name}</span>
                </div>

                {/* Mobile Actions panel */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(emp)}
                    className="h-8 flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 justify-center"
                  >
                    <Edit2 className="h-3 w-3 mr-1 text-slate-500" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusToggle(emp)}
                    className={cn(
                      "h-8 flex-1 justify-center",
                      emp.isActive 
                        ? "border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300" 
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                    )}
                  >
                    {emp.isActive ? (
                      <>
                        <UserX className="h-3 w-3 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3 w-3 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="text-slate-800 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-emerald-600" />
                Edit Employee Details
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Update details or status for the selected employee.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {editError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200/50">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Name */}
              <div className="grid gap-2">
                <label htmlFor="editName" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  id="editName"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Employee ID */}
              <div className="grid gap-2">
                <label htmlFor="editEmpId" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Employee ID
                </label>
                <input
                  id="editEmpId"
                  type="text"
                  required
                  placeholder="e.g. 25"
                  value={editEmployeeId}
                  onChange={(e) => setEditEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Team Selection */}
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Team Location
                </label>
                <Select 
                  value={editTeam} 
                  onValueChange={(val) => { if (val) setEditTeam(val as Team); }}
                >
                  <SelectTrigger className="border-slate-200 text-slate-800 w-full">
                    <SelectValue placeholder="Select Team" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="ALABANG" className="hover:bg-slate-50">Team Alabang</SelectItem>
                    <SelectItem value="ZAMBOANGA" className="hover:bg-slate-50">Team Zamboanga</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Status Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id="editIsActive"
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer">
                  Active Employee Profile
                </label>
              </div>
              <div className="text-[10px] text-slate-400 font-medium -mt-2.5 flex items-start gap-1">
                <HelpCircle className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span>
                  Deactivating an employee soft-deletes them. It retains their historical scheduling entries but hides them from active schedules going forward.
                </span>
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
