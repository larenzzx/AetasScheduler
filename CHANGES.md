# Pull Request Summary — Department & Employee Management Enhancements

## Overview

This PR introduces dynamic department and job role management, permanent employee deletion, automated role-to-department mapping, and a new dedicated Departments directory page that displays employees grouped by their department and role.

---

## Changes

### 1. Dynamic Department Management
- Added a `Department` model to the Prisma schema linked to `JobRole`.
- Created server actions (`getDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`) for full CRUD operations.
- Default departments are auto-seeded on first load: **Cybersecurity**, **IT Support**, **Operations**, **Graphic Design**.
- Deleting a department safely reassigns affected employees to **Operations**.

### 2. Dynamic Job Role Management
- Job roles are now linked to departments via a `departmentId` foreign key.
- Creating or editing a role allows assigning it to a department.
- Deleting a role reassigns affected employees to the **OTHER** fallback role.
- Renamed the default `SOC_OPERATIONS` role to `SOC_ANALYST` across the schema, database, and all existing records.

### 3. Automatic Role-to-Department Mapping
- When adding or editing an employee, selecting a job role (e.g. *SOC Analyst*) automatically pre-fills the Department field to its mapped department (e.g. *Cybersecurity*).

### 4. Employee Management Improvements
- Department filter tabs and form dropdowns now load dynamically from the database instead of being hardcoded.
- Added permanent employee deletion with a confirmation dialog.
- Deletion safely clears mentor associations before removing the employee record.

### 5. Departments & Roles Directory (New Page)
- Added a new **Departments** tab in the sidebar (route: `/departments`).
- Displays all departments as cards, each listing their assigned job roles.
- Each role shows the employees currently assigned to it as name/ID pills with team color indicators.
- An **Other Roles / Unassigned** section catches any department members whose roles are not mapped to a custom role.
- Supports adding, renaming, and deleting both departments and roles inline.

---

## Files Changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `Department` model; linked `JobRole` to `Department` |
| `app/actions/department.ts` | New — department CRUD server actions |
| `app/actions/job-role.ts` | Updated to support `departmentId`; renamed SOC role |
| `app/actions/employee.ts` | Added `deleteEmployee` action |
| `app/departments/page.tsx` | New — Departments & Roles Directory page |
| `app/employees/page.tsx` | Dynamic departments/roles; delete UI; auto-mapping |
| `components/Sidebar.tsx` | Added Departments nav item |
