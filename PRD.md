Build a full-stack Shift Scheduling Management System for Aetas Global Innovation Inc. using Next.js 14 (App Router), TypeScript, Tailwind CSS, and shadcn/ui. Deploy target is Vercel.

---

## PRODUCT OVERVIEW

Replace manual Excel-based scheduling with a web app that automates shift creation, rotation, and export for two teams: Team Alabang (Manila) and Team Zamboanga.

---

## TECH STACK

- Framework: Next.js 14 App Router
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS + shadcn/ui components
- State: Zustand for global schedule state
- Database: Supabase (PostgreSQL) — free tier, works on Vercel
- ORM: Prisma
- PDF Export: react-pdf or @react-pdf/renderer
- Date handling: date-fns
- Drag & drop: @dnd-kit/core (for schedule cell reordering)
- Deployment: Vercel

---

## DATA MODELS

### Employee
- id, name, employeeId (string), team (ALABANG | ZAMBOANGA), isActive, createdAt

### ShiftType
- id, name (string e.g. "DAY SHIFT"), startTime, endTime, colorHex, isRotating (bool), sortOrder
- Default shifts to seed:
  - MORNING SHIFT: 8AM–5PM, gray, isRotating: false
  - DAY SHIFT: 6AM–3PM, green, isRotating: true
  - MID SHIFT: 2PM–11PM, orange, isRotating: true
  - NIGHT SHIFT: 8:30PM–5:30AM, purple, isRotating: true
  - MIDNIGHT SHIFT: 10PM–7AM, blue, isRotating: true
  - ADJUST SHIFT: no fixed time, red, isRotating: true
  - LEAVE: no fixed time, lavender/purple, isRotating: false
  - DAY-OFF: no shift, shown in red text

### ScheduleWeek
- id, weekStartDate (Monday), weekEndDate (Sunday), team, label (e.g. "June 15–21")

### ScheduleEntry
- id, employeeId, scheduleWeekId, dayOfWeek (MON–SUN), shiftTypeId | "DAY-OFF" | null

---

## SHIFT ROTATION LOGIC

Rotating shifts cycle in this fixed order (for employees on rotating shifts):
DAY SHIFT → MID SHIFT → ADJUST SHIFT → NIGHT SHIFT → DAY SHIFT (repeat)

- Rotation period: every 2 weeks
- MORNING SHIFT employees are excluded from rotation
- When "Auto-Rotate" is triggered for the next 2-week period:
  - Each employee's current rotating shift advances one step in the rotation order
  - The new schedule week is created and pre-filled with the rotated shifts
  - Admin can still override any individual cell after rotation

---

## PAGES & FEATURES

### 1. Dashboard / Home
- Shows current week schedule for both teams side by side
- Week navigator (prev/next week buttons, date range label)
- Quick stats: total employees per team, shifts today, employees on leave/day-off

### 2. Schedule View (per team)
- Grid layout: rows = employees, columns = Mon–Sun
- Color-coded cells matching shift type colors (same as Excel reference)
- Click any cell to change shift assignment (dropdown of shift types + Day-Off)
- Inline edit mode — no page reload needed
- Show employee name + ID in left column
- Highlight "Day-Off" in red text, no background fill

### 3. Schedule Creation
- "New Schedule Week" button → pick week start date
- Select team or both
- Options:
  a. Start blank (all Day-Off)
  b. Copy from previous week
  c. Auto-rotate from previous week (only rotating shift employees advance one step)
- After generating, admin can freely edit any cell

### 4. Employee Management
- List all employees with team, current shift, status (active/inactive)
- Add new employee: name, ID, team, initial shift assignment
- Edit employee details
- Deactivate employee (soft delete — keeps historical schedule data)
- Assign base shift type to employee (used as starting point for rotation)

### 5. Shift Type Management
- List all shift types with name, time range, color, rotation status
- Add custom shift type (name, start time, end time, color picker, isRotating toggle)
- Edit existing shift types (time, color, name)
- Delete custom shifts (prevent deletion if assigned to active schedules)
- Reorder rotation sequence via drag-and-drop

### 6. PDF Export
- Export current week's schedule as PDF matching the attached Excel format:
  - Header: "SHIFT SCHEDULE — Month of [MONTH]"
  - Top-right box: "For the week of: [DATE RANGE]" and "Company NAME: AETAS GLOBAL INNOVATION INC"
  - Two tables: Team Alabang on top, Team Zamboanga below
  - Color-coded cells matching shift type colors
  - Columns: Employee, ID#, Mon, Tue, Wed, Thu, Fri, Sat, Sun
  - Shift legend at bottom-right
- Export button available on schedule view page
- PDF opens in new tab or triggers download

### 7. Leave & Adjustments
- Mark employee as on Leave for specific days
- Adjust Shift: assign a custom one-off shift time for a specific day (overrides rotation)
- Leave and Adjust Shift shown with appropriate color coding

---

## UI/UX REQUIREMENTS

- Responsive layout (desktop-first, but usable on tablet)
- Sidebar navigation: Dashboard, Schedule, Employees, Shift Types, Settings
- Color scheme: dark navy sidebar, clean white content area (professional, not playful)
- Team toggle tabs at top of schedule view (All | Team Alabang | Team Zamboanga)
- Unsaved changes indicator — prompt to save before navigating away
- Toast notifications for save, export, rotation actions
- Loading skeletons for schedule grid

---

## SETTINGS PAGE

- Company name (editable, used in PDF header)
- Default week start day (Monday)
- Rotation interval in days (default: 14)
- Manage rotation order (drag to reorder shift types in rotation sequence)

---

## SEED DATA

Pre-populate with employees from the attached schedule image:

Team Alabang: Charlie Fernando (1), June Alfred Padrid (18), Migs Regoso (7), Emil Calilung (8), Adrian Tamio (9), Kate Garcia (10)

Team Zamboanga: Janet Saldo (17), John Philip Gaas (5), Mark Tabotabo (12), Lawrence Laraño (21), Journey Hemoroz (15), Jeanelle Andrade (16), Alen Rose Dumalagan (20), Franz Valdez (14), Mariel Quijano (16)

---

## FOLDER STRUCTURE

Follow Next.js 14 App Router conventions:
- /app — pages and layouts
- /app/api — route handlers (PDF generation endpoint)
- /components — reusable UI components
- /lib — Prisma client, utility functions, rotation logic
- /store — Zustand stores
- /types — shared TypeScript interfaces

---

## IMPLEMENTATION ORDER

1. Set up Next.js + Tailwind + shadcn/ui + Prisma + Supabase connection
2. Create all data models and run migrations
3. Seed shift types and employee data
4. Build schedule grid component (core feature)
5. Build schedule creation flow (blank, copy, auto-rotate)
6. Build employee management CRUD
7. Build shift type management
8. Build PDF export
9. Polish: dashboard stats, toast notifications, loading states
10. Deploy to Vercel with environment variables for Supabase

Start with step 1 and proceed sequentially. Ask me before making any assumptions about business logic, especially around rotation behavior.