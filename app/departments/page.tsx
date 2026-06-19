'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Pencil, 
  Loader2, 
  HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '@/app/actions/department';
import { 
  getJobRoles, 
  createJobRole, 
  updateJobRole, 
  deleteJobRole 
} from '@/app/actions/job-role';
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

  // New Department
  const [newDeptName, setNewDeptName] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // New Role per department
  const [newRoleNames, setNewRoleNames] = useState<Record<string, string>>({});
  const [roleLoading, setRoleLoading] = useState(false);

  // Editing Department name
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

  // Editing Job Role name
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');

  // Modals for deletes
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false);

  const [deleteRoleOpen, setDeleteRoleOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<JobRole | null>(null);
  const [deleteRoleLoading, setDeleteRoleLoading] = useState(false);

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

  // Department CRUD handlers
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setDeptLoading(true);
    try {
      const res = await createDepartment(newDeptName);
      if (res.success) {
        toast.success('Department created successfully!');
        setNewDeptName('');
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

  const handleUpdateDept = async (id: string) => {
    if (!editingDeptName.trim()) return;
    setDeptLoading(true);
    try {
      const res = await updateDepartment(id, editingDeptName);
      if (res.success) {
        toast.success('Department updated successfully!');
        setEditingDeptId(null);
        setEditingDeptName('');
        await loadData();
      } else {
        toast.error(res.error || 'Failed to update department.');
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

  // Job Role CRUD handlers
  const handleCreateRole = async (deptId: string) => {
    const roleName = newRoleNames[deptId] || '';
    if (!roleName.trim()) return;
    setRoleLoading(true);
    try {
      const res = await createJobRole(roleName, deptId);
      if (res.success) {
        toast.success('Job role created successfully!');
        setNewRoleNames(prev => ({ ...prev, [deptId]: '' }));
        await loadData();
      } else {
        toast.error(res.error || 'Failed to create job role.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleUpdateRole = async (id: string, currentDeptId: string | null) => {
    if (!editingRoleName.trim()) return;
    setRoleLoading(true);
    try {
      const res = await updateJobRole(id, editingRoleName, currentDeptId);
      if (res.success) {
        toast.success('Job role updated successfully!');
        setEditingRoleId(null);
        setEditingRoleName('');
        await loadData();
      } else {
        toast.error(res.error || 'Failed to update job role.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteRoleConfirm = async () => {
    if (!roleToDelete) return;
    setDeleteRoleLoading(true);
    try {
      const res = await deleteJobRole(roleToDelete.id);
      if (res.success) {
        toast.success('Job role deleted successfully!');
        setDeleteRoleOpen(false);
        setRoleToDelete(null);
        await loadData();
      } else {
        toast.error(res.error || 'Failed to delete job role.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setDeleteRoleLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#11B4D4]" />
            Departments & Roles Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage company departments and their associated job roles.
          </p>
        </div>
      </div>

      {/* Add Department Form card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-600" />
          Add New Department
        </h2>
        <form onSubmit={handleCreateDept} className="flex gap-3">
          <input
            type="text"
            required
            placeholder="E.g. QA, CUSTOMER_SUPPORT"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            disabled={deptLoading}
          />
          <Button
            type="submit"
            disabled={deptLoading || !newDeptName.trim()}
            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
          >
            {deptLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Department'
            )}
          </Button>
        </form>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
          No departments configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {departments.map((dept) => {
            const deptRoles = jobRoles.filter((r) => r.departmentId === dept.id);
            return (
              <div 
                key={dept.id} 
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Department Card Header */}
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    {editingDeptId === dept.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingDeptName}
                          onChange={(e) => setEditingDeptName(e.target.value)}
                          className="flex-1 h-8 px-2.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          disabled={deptLoading}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDept(dept.id)}
                          disabled={deptLoading || !editingDeptName.trim() || editingDeptName.trim().toUpperCase().replace(/\s+/g, '_') === dept.name}
                          className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDeptId(null);
                            setEditingDeptName('');
                          }}
                          disabled={deptLoading}
                          className="h-7 border-slate-200 text-slate-500 text-[11px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4.5 w-4.5 text-slate-500" />
                          <h3 className="text-sm font-bold text-slate-800 tracking-wide">
                            {dept.name.replace(/_/g, ' ')}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDeptId(dept.id);
                              setEditingDeptName(dept.name.replace(/_/g, ' '));
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-200/50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDeptToDelete(dept);
                              setDeleteDeptOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Department Card Body: Roles list */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Roles in this department
                      </span>
                      {deptRoles.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2">
                          No roles added yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {deptRoles.map((role) => {
                            const roleEmployees = employees.filter(
                              (emp) => emp.department === dept.name && emp.employmentType === role.name
                            );
                            return (
                              <div 
                                key={role.id} 
                                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-55 transition-all space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  {editingRoleId === role.id ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <input
                                        type="text"
                                        value={editingRoleName}
                                        onChange={(e) => setEditingRoleName(e.target.value)}
                                        className="flex-1 h-7 px-2.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none"
                                        disabled={roleLoading}
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateRole(role.id, role.departmentId)}
                                        disabled={roleLoading || !editingRoleName.trim() || editingRoleName.trim().toUpperCase().replace(/\s+/g, '_') === role.name}
                                        className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingRoleId(null);
                                          setEditingRoleName('');
                                        }}
                                        disabled={roleLoading}
                                        className="h-7 border-slate-200 text-slate-500 text-[10px]"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800">
                                          {role.name.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                          {roleEmployees.length} {roleEmployees.length === 1 ? 'person' : 'people'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingRoleId(role.id);
                                            setEditingRoleName(role.name.replace(/_/g, ' '));
                                          }}
                                          className="h-6 w-6 p-0 text-slate-500 hover:bg-slate-200/50"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setRoleToDelete(role);
                                            setDeleteRoleOpen(true);
                                          }}
                                          className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* Employees in this role */}
                                {(!editingRoleId || editingRoleId !== role.id) && (
                                  <div className="pl-1">
                                    {roleEmployees.length === 0 ? (
                                      <span className="text-[11px] text-slate-500 italic block py-0.5">
                                        No employees assigned to this role
                                      </span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {roleEmployees.map((emp) => (
                                          <div
                                            key={emp.id}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                              emp.isActive
                                                ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                                                : 'bg-slate-100 border-slate-200 text-slate-500 line-through opacity-70'
                                            }`}
                                            title={`${emp.name} (${emp.employeeId}) - Team: ${emp.team}`}
                                          >
                                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                              emp.isActive
                                                ? (emp.team === 'ALABANG' ? 'bg-sky-500' : 'bg-indigo-500')
                                                : 'bg-slate-300'
                                            }`} />
                                            <span className="font-semibold">{emp.name}</span>
                                            <span className="text-[10px] font-mono text-slate-500 font-normal">
                                              #{emp.employeeId}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Unassigned / Other Roles section */}
                    {(() => {
                      const deptRoles = jobRoles.filter((r) => r.departmentId === dept.id);
                      const mappedRoleNames = new Set(deptRoles.map(r => r.name));
                      const unassignedEmployees = employees.filter(
                        (emp) => emp.department === dept.name && !mappedRoleNames.has(emp.employmentType)
                      );
                      if (unassignedEmployees.length === 0) return null;
                      return (
                        <div className="pt-3 border-t border-dashed border-slate-300 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                              Other Roles / Unassigned
                            </span>
                            <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                              {unassignedEmployees.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-1">
                            {unassignedEmployees.map((emp) => (
                              <div
                                key={emp.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                  emp.isActive
                                    ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm'
                                    : 'bg-slate-100 border-slate-200 text-slate-500 line-through opacity-70'
                                }`}
                                title={`${emp.name} (${emp.employeeId}) - Team: ${emp.team} (Role: ${emp.employmentType.replace(/_/g, ' ')})`}
                              >
                                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                  emp.isActive
                                    ? (emp.team === 'ALABANG' ? 'bg-sky-500' : 'bg-indigo-500')
                                    : 'bg-slate-300'
                                }`} />
                                <span className="font-semibold">{emp.name}</span>
                                <span className="text-[10px] text-amber-700 font-medium">
                                  ({emp.employmentType.replace(/_/g, ' ')})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Add Role Inline input inside department card */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add Role (E.g. SOC ANALYST)"
                    value={newRoleNames[dept.id] || ''}
                    onChange={(e) => setNewRoleNames(prev => ({ ...prev, [dept.id]: e.target.value }))}
                    className="flex-1 h-8 px-2.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                    disabled={roleLoading}
                  />
                  <Button
                    size="sm"
                    disabled={roleLoading || !(newRoleNames[dept.id] || '').trim()}
                    onClick={() => handleCreateRole(dept.id)}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Department Confirmation Modal */}
      <Dialog open={deleteDeptOpen} onOpenChange={setDeleteDeptOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Department
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete <strong className="text-slate-700 font-semibold">{deptToDelete?.name.replace(/_/g, ' ')}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed mt-2 flex items-start gap-1">
            <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Employees currently assigned to this department will be automatically reassigned to the default <strong>Operations</strong> department.
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
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
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

      {/* Delete Role Confirmation Modal */}
      <Dialog open={deleteRoleOpen} onOpenChange={setDeleteRoleOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Job Role
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the job role <strong className="text-slate-700 font-semibold">{roleToDelete?.name.replace(/_/g, ' ')}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed mt-2 flex items-start gap-1">
            <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Employees currently assigned to this role will be updated to the default <strong>OTHER</strong> role.
            </span>
          </div>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteRoleOpen(false);
                setRoleToDelete(null);
              }}
              disabled={deleteRoleLoading}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRoleConfirm}
              disabled={deleteRoleLoading}
              className="bg-red-600 hover:bg-red-700 text-white border-none shadow-md shadow-red-600/10 font-semibold"
            >
              {deleteRoleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete Job Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
