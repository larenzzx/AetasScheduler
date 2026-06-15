# 🚀 Project Handoff: Aetas Scheduler

This document serves as the session handoff for the **Aetas Shift Scheduling Management System** built for **Aetas Global Innovation Inc.**

---

## 📌 Project Overview
Replacing manual Excel shift scheduling with an automated full-stack web application.
* **Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui components (based on **Base UI** / `base-nova` style), Zustand (state store), Prisma 7, Supabase (PostgreSQL), `date-fns`, and `lucide-react`.
* **Product Requirements:** Refer to the core [PRD.md](file:///C:/Users/markl/coding/aetasscheduler/PRD.md).

---

## ⚡ Current Status (Completed Milestones)

### 1. Database Setup & Seeding (Steps 1, 2, 3)
* Defined PostgreSQL relational models in [prisma/schema.prisma](file:///C:/Users/markl/coding/aetasscheduler/prisma/schema.prisma) (`Employee`, `ShiftType`, `ScheduleWeek`, `ScheduleEntry`).
* Configured [prisma.config.ts](file:///C:/Users/markl/coding/aetasscheduler/prisma.config.ts) for **Prisma 7**:
  * Routed migrations/CLI commands to the Supabase direct URL (`DIRECT_URL`, port `5432`).
  * Routed application runtime connection to the transaction pooler (`DATABASE_URL`, port `6543`).
* Installed `pg` and `@prisma/adapter-pg` driver adapters to support Prisma 7's new engine-less runtime.
* Created global Prisma Client helper in [lib/prisma.ts](file:///C:/Users/markl/coding/aetasscheduler/lib/prisma.ts).
* Created and executed [prisma/seed.ts](file:///C:/Users/markl/coding/aetasscheduler/prisma/seed.ts) to populate initial shift types and employees:
  * Assigned **Jeanelle Andrade** to ID `19` and **Mariel Quijano** to ID `16` (swapped per request).
  * Removed `ADJUST SHIFT` from the database database entries (it is now calculated dynamically in the UI instead).

### 2. Core Scheduling Grid & Unsaved Edits (Step 4)
* Created [components/ScheduleGrid.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/ScheduleGrid.tsx) using Base UI. Displays color-coded shift cells with dropdown triggers.
* **Real-time Indicators:** Added badge next to employee IDs showing their week's scheduled status (recalculates in real-time upon cell clicks):
  * *Single Shift:* Badge color matches their shift.
  * *2 Shifts:* Yellow `"Mixed Shifts"` badge.
  * *3+ Shifts:* Red `"Adjust Shift"` badge.
  * *All Leave:* Purple `"Leave"` badge.
  * *All Off:* Red `"Day-Off"` badge.
* **Date Header Labels:** Day columns dynamically render their exact numeric dates (e.g. `Mon 15`, `Tue 16`).
* **Unsaved Changes Banner:** Floating [components/UnsavedChangesBanner.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/UnsavedChangesBanner.tsx) tracks queued edits, enabling bulk-saving to Supabase via SQL transaction or discarding.

### 3. Schedule Week Creation Flow (Step 5)
* Created server actions in [app/actions/schedule.ts](file:///C:/Users/markl/coding/aetasscheduler/app/actions/schedule.ts) to fetch schedule data and initialize weeks.
* Enabled **Start blank** and **Copy from previous week** creation strategies. **Auto-rotate** was removed from UI selection.
* Created dialog form in [components/NewScheduleDialog.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/NewScheduleDialog.tsx) aligning start dates to Mondays.
* Formatted week range headers using `formatWeekRange` in [lib/utils.ts](file:///C:/Users/markl/coding/aetasscheduler/lib/utils.ts) to handle month and year boundaries correctly (e.g. `June 29 – July 5, 2026`).

### 4. Responsiveness & UI/UX Polish
* Built [components/ResponsiveLayoutShell.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/ResponsiveLayoutShell.tsx):
  * **Desktop:** Shows a persistent left navigation sidebar.
  * **Mobile:** Collapses the sidebar into a sliding drawer toggleable via a hamburger icon in the top header.
* Modified week navigation controls to wrap on mobile viewports.
* Added `pb-36` to the main container so the last grid row can be scrolled above the floating banner.

*Note: The project builds successfully with `npm run build` with **0 TypeScript and 0 ESLint errors**.*

---

## 📂 Key File Map
* **Database Configuration:** [prisma/schema.prisma](file:///C:/Users/markl/coding/aetasscheduler/prisma/schema.prisma) | [prisma.config.ts](file:///C:/Users/markl/coding/aetasscheduler/prisma.config.ts)
* **Zustand Store:** [store/useScheduleStore.ts](file:///C:/Users/markl/coding/aetasscheduler/store/useScheduleStore.ts)
* **Server Actions:** [app/actions/schedule.ts](file:///C:/Users/markl/coding/aetasscheduler/app/actions/schedule.ts)
* **Components:**
  * Schedule Grid: [components/ScheduleGrid.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/ScheduleGrid.tsx)
  * New Week Dialog: [components/NewScheduleDialog.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/NewScheduleDialog.tsx)
  * Layout Shell: [components/ResponsiveLayoutShell.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/ResponsiveLayoutShell.tsx) | [components/Sidebar.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/Sidebar.tsx)
  * Changes Banner: [components/UnsavedChangesBanner.tsx](file:///C:/Users/markl/coding/aetasscheduler/components/UnsavedChangesBanner.tsx)

---

## 🔮 Next Phase: Step 6 (Employee Management CRUD)

When resuming the next session, immediately pick up with **Step 6**:
1. Create employee management page at `app/employees/page.tsx` (the Sidebar already links to `/employees`).
2. Add server actions in a new file `app/actions/employee.ts` for:
   * Fetching all employees.
   * Creating an employee (Name, Employee ID, Team, status `isActive: true`).
   * Editing employee details.
   * Deactivating an employee (setting `isActive: false` as a soft delete to protect historical schedule week references).
3. Design the Employee CRUD UI:
   * Grid/table listing employees with names, team badges, active status toggle, and edit buttons.
   * Dialog popups (like `NewScheduleDialog`) for Add and Edit actions using shadcn/Base UI components.
