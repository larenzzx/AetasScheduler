'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Pencil, 
  Loader2, 
  Users,
  Search,
  Briefcase,
  UserX,
  TrendingUp,
  AlertCircle,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment,
  assignEmployeesToDepartment,
  moveEmployeeToDepartment
} from '@/app/actions/department';
import { getJobRoles } from '@/app/actions/job-role';
import { getEmployees } from '@/app/actions/employee';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
  departmentId: string | null;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  team: string;
  isActive: boolean;
  employmentType: string;
  department: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<'ALL' | 'ACTIVE' | 'EMPTY'>('ALL');

  // New Department Modal
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // Rename Department Modal
  const [renameDeptOpen, setRenameDeptOpen] = useState(false);
  const [deptToRename, setDeptToRename] = useState<Department | null>(null);
  const [renameDeptName, setRenameDeptName] = useState('');

  // Delete Department Modal
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false);

  // Manage Department Members Modal
  const [assignDept, setAssignDept] = useState<Department | null>(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Roster View Details Modal
  const [viewRosterDept, setViewRosterDept] = useState<Department | null>(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [depts, roles, emps] = await Promise.all([
        getDepartments(),
        getJobRoles(),
        getEmployees(),
      ]);
      setDepartments(depts);
      setJobRoles(roles);
      setEmployees(emps as unknown as Employee[]);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load departments and roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Department Actions
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDeptLoading(true);
    try {
      const res = await createDepartment(newDeptName);
      if (res.success) {
        toast.success('Department created successfully!');
        setNewDeptName('');
        setAddDeptOpen(false);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to create department.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleOpenRename = (dept: Department) => {
    setDeptToRename(dept);
    setRenameDeptName(dept.name.replace(/_/g, ' '));
    setRenameDeptOpen(true);
  };

  const handleRenameDeptSubmit = async () => {
    if (!deptToRename || !renameDeptName.trim()) return;
    setDeptLoading(true);
    try {
      const res = await updateDepartment(deptToRename.id, renameDeptName);
      if (res.success) {
        toast.success('Department renamed successfully!');
        setRenameDeptOpen(false);
        setDeptToRename(null);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to rename department.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleDeleteDeptConfirm = async () => {
    if (!deptToDelete) return;
    setDeleteDeptLoading(true);
    try {
      const res = await deleteDepartment(deptToDelete.id);
      if (res.success) {
        toast.success('Department deleted successfully!');
        setDeleteDeptOpen(false);
        setDeptToDelete(null);
        // Reset modal view states if active
        if (viewRosterDept?.id === deptToDelete.id) {
          setViewRosterDept(null);
        }
        await loadData();
      } else {
        toast.error(res.error || 'Failed to delete department.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setDeleteDeptLoading(false);
    }
  };

  const handleOpenAssign = (dept: Department) => {
    setAssignDept(dept);
    const currentIds = employees
      .filter((emp) => emp.department?.toUpperCase() === dept.name?.toUpperCase())
      .map((emp) => emp.id);
    setSelectedEmpIds(currentIds);
    setEmpSearchQuery('');
  };

  const handleSaveAssign = async () => {
    if (!assignDept) return;
    setAssignLoading(true);
    try {
      const res = await assignEmployeesToDepartment(assignDept.name, selectedEmpIds);
      if (res.success) {
        toast.success(`Assigned employees to ${assignDept.name.replace(/_/g, ' ')} successfully!`);
        setAssignDept(null);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to assign employees.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  // Helper to format names nicely
  const formatDeptName = (name: string) => {
    return name
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filtered departments for cards grid
  const filteredDepartments = useMemo(() => {
    let result = departments;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    }
    
    if (sizeFilter !== 'ALL') {
      result = result.filter((d) => {
        const count = employees.filter(
          (emp) => emp.department?.toUpperCase() === d.name?.toUpperCase()
        ).length;
        return sizeFilter === 'EMPTY' ? count === 0 : count > 0;
      });
    }
    
    return result;
  }, [departments, employees, searchQuery, sizeFilter]);

  // Statistics calculation for Dashboard summary
  const stats = useMemo(() => {
    const totalDeptCount = departments.length;
    const assignedEmployees = employees.filter(
      (emp) => emp.department && emp.department !== 'Unassigned' && departments.some(d => d.name.toUpperCase() === emp.department.toUpperCase())
    );
    const totalAssigned = assignedEmployees.length;
    const avgDensity = totalDeptCount ? Math.round((totalAssigned / totalDeptCount) * 10) / 10 : 0;
    const unassignedCount = employees.length - totalAssigned;

    return {
      totalDeptCount,
      totalAssigned,
      avgDensity,
      unassignedCount
    };
  }, [departments, employees]);

  // Employees in active viewing roster
  const rosterEmployees = useMemo(() => {
    if (!viewRosterDept) return [];
    return employees.filter(
      (emp) => emp.department?.toUpperCase() === viewRosterDept.name?.toUpperCase()
    );
  }, [employees, viewRosterDept]);

  // Filtered employees inside the viewing roster modal
  const filteredRoster = useMemo(() => {
    const query = rosterSearchQuery.toLowerCase().trim();
    if (!query) return rosterEmployees;
    return rosterEmployees.filter(
      (emp) => 
        emp.name.toLowerCase().includes(query) || 
        emp.employeeId.toLowerCase().includes(query) ||
        emp.employmentType.toLowerCase().includes(query)
    );
  }, [rosterEmployees, rosterSearchQuery]);

  // Active roles list & counts inside the viewing roster modal
  const activeRolesBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    rosterEmployees.forEach((emp) => {
      const r = emp.employmentType;
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [rosterEmployees]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Departments & Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage company divisions, assign employees, and track workforce roles.
          </p>
        </div>

        {/* Add Department Trigger */}
        <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
          <Button 
            onClick={() => setAddDeptOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10 font-medium transition-all duration-200"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Department
          </Button>
          <DialogContent className="sm:max-w-[425px] bg-[#062E56] border-slate-200 text-white rounded-2xl">
            <form onSubmit={handleCreateDept}>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2 font-heading">
                  <Building2 className="h-5 w-5 text-[#11B4D4]" />
                  Add New Department
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter the name of the new department to organize your workforce.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Department Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. CUSTOMER_SUCCESS, LOGISTICS"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00EEF5]"
                    disabled={deptLoading}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDeptOpen(false)}
                  disabled={deptLoading}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={deptLoading || !newDeptName.trim()}
                  className="bg-[#1023FD] hover:bg-[#11B4D4] text-white border-none shadow-md shadow-[#1023FD]/20"
                >
                  {deptLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : 'Create Department'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Depts */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Divisions</span>
            <h3 className="text-lg font-bold text-white leading-tight">{stats.totalDeptCount}</h3>
          </div>
        </div>

        {/* Card 2: Assigned Workforce */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Members</span>
            <h3 className="text-lg font-bold text-white leading-tight">{stats.totalAssigned}</h3>
          </div>
        </div>

        {/* Card 3: Density */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#11B4D4]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg density</span>
            <h3 className="text-lg font-bold text-white leading-tight">{stats.avgDensity} / dept</h3>
          </div>
        </div>

        {/* Card 4: Unassigned */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unassigned Pool</span>
            <h3 className="text-lg font-bold text-white leading-tight">{stats.unassignedCount}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search departments by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-[#080C1A] text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 self-end md:self-auto bg-[#080C1A] border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setSizeFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              sizeFilter === 'ALL'
                ? 'bg-slate-100 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Divisions
          </button>
          <button
            onClick={() => setSizeFilter('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              sizeFilter === 'ACTIVE'
                ? 'bg-slate-100 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            With Personnel
          </button>
          <button
            onClick={() => setSizeFilter('EMPTY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              sizeFilter === 'EMPTY'
                ? 'bg-slate-100 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Empty Only
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm gap-3">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Directory...</span>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-16 bg-[#062E56]/20 rounded-2xl border border-dashed border-[#11B4D4]/15 text-slate-400 space-y-2">
          <Building2 className="h-10 w-10 text-slate-500 mx-auto opacity-40" />
          <p className="text-sm">No departments found matching your criteria.</p>
          <p className="text-xs text-slate-500">Try adjusting your search query or creating a new department above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => {
            const deptEmployees = employees.filter(
              (emp) => emp.department?.toUpperCase() === dept.name?.toUpperCase()
            );
            const deptRoles = jobRoles.filter((r) => r.departmentId === dept.id);
            const deptRoleNames = Array.from(new Set([
              ...deptRoles.map(r => r.name.toUpperCase()),
              ...deptEmployees.map(e => e.employmentType.toUpperCase())
            ]));

            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl hover:border-[#11B4D4] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
              >
                {/* Visual Accent glow line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1023FD] to-[#00EEF5]"></div>
                
                <div className="space-y-4">
                  {/* Top line with Icon & Action Dropdown */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#11B4D4]/10 border border-[#11B4D4]/20 flex items-center justify-center text-[#00EEF5] shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <h3 className="text-sm font-bold text-white tracking-wide font-heading">
                          {formatDeptName(dept.name)}
                        </h3>
                        <span className="text-[9px] text-[#11B4D4] font-bold tracking-wider uppercase">
                          Code: {dept.name}
                        </span>
                      </div>
                    </div>

                    {/* Quick actions inline */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenRename(dept)}
                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg"
                        title="Rename Division"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setDeptToDelete(dept);
                          setDeleteDeptOpen(true);
                        }}
                        className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                        title="Delete Division"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Division Stats overview */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#080C1A]/40 p-2.5 rounded-xl border border-[#11B4D4]/5 flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#00EEF5] shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Headcount</span>
                        <span className="text-xs font-extrabold text-white leading-none mt-1">{deptEmployees.length}</span>
                      </div>
                    </div>
                    <div className="bg-[#080C1A]/40 p-2.5 rounded-xl border border-[#11B4D4]/5 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-[#11B4D4] shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Roles</span>
                        <span className="text-xs font-extrabold text-white leading-none mt-1">{deptRoleNames.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Overlapping Personnel Avatar Group */}
                  <div className="space-y-2 pt-1 text-left">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Assigned Personnel</span>
                    {deptEmployees.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic bg-[#080C1A]/20 py-2 px-3 rounded-lg border border-dashed border-slate-700/50">
                        No personnel assigned yet
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex -space-x-2 overflow-hidden">
                          {deptEmployees.slice(0, 5).map((emp) => {
                            const isAlabang = emp.team === 'ALABANG';
                            return (
                              <div
                                key={emp.id}
                                className={`h-7 w-7 rounded-full border-2 border-[#062E56] flex items-center justify-center text-[10px] font-bold text-white shrink-0 uppercase select-none ${
                                  isAlabang 
                                    ? 'bg-gradient-to-tr from-sky-600 to-sky-400' 
                                    : 'bg-gradient-to-tr from-indigo-600 to-indigo-400'
                                }`}
                                title={`${emp.name} (${emp.team})`}
                              >
                                {emp.name.substring(0, 2)}
                              </div>
                            );
                          })}
                          {deptEmployees.length > 5 && (
                            <div className="h-7 w-7 rounded-full border-2 border-[#062E56] bg-slate-800 flex items-center justify-center text-[9px] font-bold text-[#00EEF5] shrink-0 select-none">
                              +{deptEmployees.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {deptEmployees.length === 1 ? '1 member assigned' : `${deptEmployees.length} members`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Associated Roles Cloud */}
                  <div className="space-y-2 pt-1 text-left">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block">Division Roles</span>
                    <div className="flex flex-wrap gap-1 max-h-[55px] overflow-y-auto pr-1 scrollbar-thin">
                      {deptRoleNames.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic">None active</span>
                      ) : (
                        deptRoleNames.map((roleName) => (
                          <span
                            key={roleName}
                            className="text-[9px] bg-[#11B4D4]/5 border border-[#11B4D4]/10 text-white px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider"
                          >
                            {roleName.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center gap-2 border-t border-slate-200/10 pt-4 mt-5">
                  <Button
                    size="sm"
                    onClick={() => handleOpenAssign(dept)}
                    className="flex-1 bg-[#1023FD] hover:bg-[#11B4D4] text-white border-none shadow-md shadow-[#1023FD]/10 text-xs font-semibold rounded-lg h-9 transition-all duration-200"
                  >
                    <Users className="mr-1 h-3.5 w-3.5" />
                    Manage Members
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setViewRosterDept(dept);
                      setRosterSearchQuery('');
                    }}
                    className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold rounded-lg h-9 px-3"
                  >
                    View Roster
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Roster View Details Modal */}
      <Dialog open={viewRosterDept !== null} onOpenChange={(open) => { if (!open) setViewRosterDept(null); }}>
        <DialogContent className="sm:max-w-[600px] bg-[#062E56] border-[#11B4D4]/30 text-white rounded-2xl shadow-2xl backdrop-blur-md">
          {viewRosterDept && (
            <>
              <DialogHeader className="flex flex-row justify-between items-start gap-4">
                <div className="space-y-1 text-left">
                  <DialogTitle className="text-xl font-bold font-heading text-white flex items-center gap-2">
                    <Building2 className="h-5.5 w-5.5 text-[#11B4D4]" />
                    {formatDeptName(viewRosterDept.name)} Division
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Roster pool, role distribution, and member settings.
                  </DialogDescription>
                </div>
                <div className="bg-[#080C1A]/60 px-3 py-1 rounded-lg border border-[#11B4D4]/10 text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mt-1">
                  ID: {viewRosterDept.id.substring(0, 8)}
                </div>
              </DialogHeader>

              {/* Roster stats bar */}
              <div className="grid grid-cols-3 gap-3 my-2">
                <div className="bg-[#080C1A]/40 p-2.5 rounded-xl border border-slate-200/10 text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Total</span>
                  <span className="text-base font-extrabold text-white">{rosterEmployees.length}</span>
                </div>
                <div className="bg-[#080C1A]/40 p-2.5 rounded-xl border border-slate-200/10 text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold text-sky-400">Alabang</span>
                  <span className="text-base font-extrabold text-white">{rosterEmployees.filter(e => e.team === 'ALABANG').length}</span>
                </div>
                <div className="bg-[#080C1A]/40 p-2.5 rounded-xl border border-slate-200/10 text-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold text-indigo-400">Zamboanga</span>
                  <span className="text-base font-extrabold text-white">{rosterEmployees.filter(e => e.team === 'ZAMBOANGA').length}</span>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="space-y-2 text-left">
                <span className="text-xs font-bold text-[#11B4D4] uppercase tracking-wider block">Role Distribution</span>
                {rosterEmployees.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No roles configured.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activeRolesBreakdown.map(([role, count]) => (
                      <div
                        key={role}
                        className="bg-[#080C1A]/60 px-3 py-1.5 rounded-lg border border-slate-200/10 text-xs text-white uppercase font-semibold flex items-center gap-2"
                      >
                        <span>{role.replace(/_/g, ' ')}</span>
                        <span className="bg-[#11B4D4]/20 text-[#00EEF5] text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-[#11B4D4]/30">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search & List */}
              <div className="space-y-3 pt-2 text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-[#11B4D4] uppercase tracking-wider block">Assigned Directory ({rosterEmployees.length})</span>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search roster..."
                      value={rosterSearchQuery}
                      onChange={(e) => setRosterSearchQuery(e.target.value)}
                      className="w-full h-7 rounded-lg border border-slate-200 bg-[#080C1A] pl-8 pr-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="h-[200px] overflow-y-auto rounded-xl border border-slate-200/10 bg-slate-100 p-2 space-y-1.5 scrollbar-thin">
                  {filteredRoster.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-500 italic">
                      {rosterEmployees.length === 0 ? 'No members assigned.' : 'No personnel matches filter search.'}
                    </div>
                  ) : (
                    filteredRoster.map((emp) => {
                      const isAlabang = emp.team === 'ALABANG';
                      return (
                        <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#080C1A]/50 border border-slate-200/10">
                          <div className="flex items-center gap-2.5">
                            {/* Avatar bubble */}
                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 uppercase ${
                              isAlabang ? 'bg-sky-500/10 text-sky-400 border border-sky-400/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-400/20'
                            }`}>
                              {emp.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold text-white">{emp.name}</span>
                              <span className="text-[9px] text-slate-400 font-semibold uppercase">ID: #{emp.employeeId} • {emp.team}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider">
                              {emp.employmentType.replace(/_/g, ' ')}
                            </span>
                            
                            {/* Reassign select dropdown */}
                            <div className="flex items-center gap-1.5">
                              <ArrowRightLeft className="h-3 w-3 text-slate-500" />
                              <select
                                value={emp.department}
                                onChange={async (e) => {
                                  const targetDept = e.target.value;
                                  if (!targetDept || targetDept === emp.department) return;
                                  
                                  toast.loading(`Moving ${emp.name} to ${targetDept.replace(/_/g, ' ')}...`, { id: 'reassign-emp' });
                                  try {
                                    const res = await moveEmployeeToDepartment(emp.id, targetDept);
                                    if (res.success) {
                                      toast.success(`Moved ${emp.name} to ${targetDept.replace(/_/g, ' ')}!`, { id: 'reassign-emp' });
                                      await loadData();
                                    } else {
                                      toast.error(res.error || 'Failed to move employee.', { id: 'reassign-emp' });
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    toast.error('An unexpected error occurred.', { id: 'reassign-emp' });
                                  }
                                }}
                                className="bg-[#080C1A] text-white border border-[#11B4D4]/30 rounded-lg px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#00EEF5] cursor-pointer"
                                title="Reassign Employee Division"
                              >
                                {departments.map((d) => (
                                  <option key={d.id} value={d.name}>
                                    {d.name.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4 pt-3 border-t border-slate-200/10">
                <Button
                  onClick={() => setViewRosterDept(null)}
                  className="bg-[#1023FD] hover:bg-[#11B4D4] text-white text-xs font-semibold rounded-lg h-9 px-5 border-none"
                >
                  Close Directory
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Department Modal */}
      <Dialog open={renameDeptOpen} onOpenChange={setRenameDeptOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#062E56] border-slate-200 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 font-heading">
              <Pencil className="h-5 w-5 text-[#11B4D4]" />
              Rename Department
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Change the display and reference name for this department.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="renameName" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Department Name
              </label>
              <input
                id="renameName"
                type="text"
                value={renameDeptName}
                onChange={(e) => setRenameDeptName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00EEF5]"
                disabled={deptLoading}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setRenameDeptOpen(false);
                setDeptToRename(null);
              }}
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameDeptSubmit}
              disabled={deptLoading || !renameDeptName.trim()}
              className="bg-[#1023FD] hover:bg-[#11B4D4] text-white border-none shadow-md shadow-[#1023FD]/20 font-semibold"
            >
              {deptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Department Members Modal (Dual-pane layout) */}
      <Dialog open={assignDept !== null} onOpenChange={(open) => { if (!open) setAssignDept(null); }}>
        <DialogContent className="sm:max-w-[650px] bg-[#062E56] border-[#11B4D4]/30 text-white rounded-2xl shadow-2xl backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-white flex items-center gap-2">
              <Users className="h-5.5 w-5.5 text-[#11B4D4]" />
              Manage Department Members
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Move employees freely in and out of <strong className="text-white">{assignDept && formatDeptName(assignDept.name)}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
            {/* Left Column: Current Members */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">
                Current Members ({selectedEmpIds.length})
              </span>
              <div className="h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3 space-y-2 scrollbar-thin">
                {selectedEmpIds.length === 0 ? (
                  <div className="text-center py-20 text-xs text-slate-500 italic">
                    No members in this department yet.
                  </div>
                ) : (
                  employees
                    .filter((emp) => selectedEmpIds.includes(emp.id))
                    .map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#080C1A]/50 border border-slate-100/10">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white">{emp.name}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">{emp.employmentType.replace(/_/g, ' ')}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleEmployeeSelection(emp.id)}
                          className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded-md"
                          title="Remove Member"
                        >
                          ✕
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Right Column: Add Personnel */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">
                Add Workforce
              </span>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search personnel..."
                    value={empSearchQuery}
                    onChange={(e) => setEmpSearchQuery(e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-[#080C1A]/80 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div className="h-[238px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3 space-y-2 scrollbar-thin">
                  {(() => {
                    const query = empSearchQuery.toLowerCase().trim();
                    const filtered = employees.filter(
                      (emp) => 
                        !selectedEmpIds.includes(emp.id) && 
                        (emp.name.toLowerCase().includes(query) || emp.employeeId.includes(query))
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20 text-xs text-slate-500 italic">
                          No personnel available to add.
                        </div>
                      );
                    }

                    return filtered.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#080C1A]/30 border border-slate-100/10 hover:bg-[#080C1A]/50 transition-colors">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white">{emp.name}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {emp.employmentType.replace(/_/g, ' ')} {emp.department ? `(${emp.department.replace(/_/g, ' ')})` : ''}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleEmployeeSelection(emp.id)}
                          className="h-6 w-6 p-0 text-emerald-400 hover:bg-emerald-500/10 hover:text-[#00EEF5] rounded-md"
                          title="Add Member"
                        >
                          ＋
                        </Button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end border-t border-[#11B4D4]/10 pt-4">
            <Button
              variant="outline"
              onClick={() => setAssignDept(null)}
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssign}
              disabled={assignLoading}
              className="bg-[#1023FD] hover:bg-[#11B4D4] text-white border-none shadow-md shadow-[#1023FD]/20 font-semibold"
            >
              {assignLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirmation Modal */}
      <Dialog open={deleteDeptOpen} onOpenChange={setDeleteDeptOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#062E56] border-slate-200 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 font-heading">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Department
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete <strong className="text-white">{deptToDelete && formatDeptName(deptToDelete.name)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-[#080C1A]/50 p-3.5 border border-[#11B4D4]/10 text-xs text-slate-300 leading-relaxed mt-2 flex items-start gap-2 text-left">
            <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>
              Employees currently assigned to this department will be automatically reassigned to the default <strong>Operations</strong> pool.
            </span>
          </div>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDeptOpen(false);
                setDeptToDelete(null);
              }}
              disabled={deleteDeptLoading}
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteDeptConfirm}
              disabled={deleteDeptLoading}
              className="bg-red-600 hover:bg-red-700 text-white border-none shadow-md shadow-red-600/10 font-semibold"
            >
              {deleteDeptLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete Department'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
