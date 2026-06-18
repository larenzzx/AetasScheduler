# 🤝 Project Handoff & CLI Sync Context: Aetas Scheduler

This document serves as a developer and AI agent handoff file for the **Aetas Shift Scheduling Management System** built for **Aetas Global Innovation Inc.** It details the current state of the application, code architecture, and steps required to continue development when moving to a different device or launching a new workspace using the **Antigravity CLI**.

---

## 📌 Project Overview & Architecture

AetasScheduler is a full-stack Next.js 14 App Router application configured for local development and direct Vercel deployment. It manages employee shifts, scheduling constraints, rotations, and roles for two teams: **Team Alabang (Manila)** and **Team Zamboanga**.

### Key Tech Stack
*   **Framework**: Next.js 14 (App Router, Server Actions, API routes)
*   **Database**: Supabase (PostgreSQL)
*   **ORM**: Prisma 7 (with engine-less pg-pool adapter)
*   **State Management**: Zustand
*   **Styling**: Tailwind CSS + Custom Dark Navy/Glassmorphic Palette
*   **UI Primitives**: `@base-ui/react` unstyled headless controls
*   **Drag & Drop**: `@dnd-kit/core`
*   **PDF Exports**: `@react-pdf/renderer`

---

## ⚡ Current Application State (Completed Features)

All core requirements and advanced scheduling rule phases are implemented, fully debugged, and compile with zero errors:

### 1. Advanced Constraints & Validation Engine
Located in [schedulingValidation.ts](aetasscheduler/lib/schedulingValidation.ts):
*   **Rest Periods**: Validates a hard minimum 7-hour rest (error blocks save) and an 8-hour recommended rest (warning banner) between consecutive shifts.
*   **Weekly caps**: Validates a max of 6 consecutive workdays and a max of 5 workdays in a single Monday–Sunday week. (Fixed-schedule employees are automatically exempt).
*   **Gender-Aware Night Shifts**: Team Zamboanga night shifts containing a female employee must have at least one other scheduled companion of any gender. (Team Alabang is exempt).
*   **Mentorship Rule**: Mentor-requiring employees cannot be scheduled solo. They require an experienced employee or their specific assigned mentor scheduled alongside them.
*   **Shift Overlap Check**: Custom shift type additions and edits enforce a 1-hour overlap configuration validation to support handovers.

### 2. Smart Rotation & Resolution Engine
Located in [schedule.ts](aetasscheduler/app/actions/schedule.ts):
*   **Bi-Weekly Rotation**: Automatically cycles rotating shift types every 14 days.
*   **Auto-Resolution**: Sweeps proposed rotation schedules up to 5 times to resolve gender/mentor violations by swapping in eligible and available companions.
*   **Summary Dialog**: Displays a status screen after generation showing: *Rotated*, *Resolved*, *Skipped*, and *Flagged* categories.

### 3. Drag & Drop schedule editing
Located in [ScheduleGrid.tsx](aetasscheduler/components/ScheduleGrid.tsx):
*   Implemented using `@dnd-kit/core`.
*   Displays real-time visual highlight guides (green for valid target, red for invalid).
*   Evaluates constraint validations on drop, displaying toast errors and snapping invalid drops back.

### 4. Emergency Leave & Replacement Suggestion
*   **Emergency Leave**: Admin can immediately mark an employee on leave (bypassing normal workday limits to handle emergencies).
*   **Replacements Finder**: Automatically scans and ranks eligible replacement candidates by checking availability, rest limits, and workday caps.

### 5. Customizable Job Roles
Located in [job-role.ts](aetasscheduler/app/actions/job-role.ts):
*   Admin Settings screen supports CRUD operations on job roles.
*   Updating/deleting job roles updates or safe-reassigns employees (e.g. mapping to `OTHER` on deletion) in a single database transaction.

### 6. Excel-Matched PDF Export
*   Exposes a print-ready PDF endpoint in [route.tsx](aetasscheduler/app/api/export-pdf/route.tsx) generating separate Alabang/Zamboanga tables and shift legends.

---

## 💻 Syncing Context on a New Device (Antigravity CLI Setup)

If you clone the codebase or resume work on a different computer using the **Antigravity CLI**, follow these exact setup steps to configure your environment:

### Step 1: Install packages
Install the locked dependencies:
```bash
npm install
```

### Step 2: Configure Environment Variables
You must create a `.env` file in the root directory. Copy the sample:
```bash
cp .env.sample .env
```
Fill in the values using your Supabase Postgres connection strings and API keys:
*   `DATABASE_URL`: Transaction pooler URL (Port 6543) with `?pgbouncer=true`.
*   `DIRECT_URL`: Direct database connection URL (Port 5432) for running migrations.
*   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase authentication parameters.

### Step 3: Sync Schema & Generate Client (CRITICAL)
You **must** generate the local Prisma client on your new machine so TypeScript understands the database model typings:
```bash
npx prisma generate
```
*Note: If you are connecting to your existing Supabase database (which already has data and tables), **skip** the database migration and seeding commands below. If configuring a brand-new database instance, run them:*
```bash
npx prisma migrate dev
npm run seed
```

### Step 4: Add Auth User (Optional)
*Skip this step if using your existing user credentials.* If setting up a brand-new Supabase project, make sure to create an operator login user (e.g., `admin@aetasglobal.com`) inside your **Supabase Dashboard** -> **Authentication** -> **Users** panel, as the local server's middleware redirects unauthenticated requests to `/login`.

---

## 🛠️ How to Add Changes

When you want to implement new features or modify existing code:

### 1. Database Schema Changes
*   Open [schema.prisma](aetasscheduler/prisma/schema.prisma) and add or modify the models.
*   Apply changes and generate client bindings:
    ```bash
    npx prisma migrate dev --name <migration_name>
    ```
*   Update the database seeds in [seed.ts](aetasscheduler/prisma/seed.ts) to match the changes.

### 2. Modifying Scheduling Logic or Validations
*   To edit constraint logic (e.g., changing rest hours or introducing team exemptions), edit the validation rules in [schedulingValidation.ts](aetasscheduler/lib/schedulingValidation.ts).
*   To edit schedule generation, bi-weekly cycles, or resolution passes, edit the actions in [schedule.ts](aetasscheduler/app/actions/schedule.ts).

### 3. Modifying state properties
*   Global frontend schedule state, queues, and drag states are managed in [useScheduleStore.ts](aetasscheduler/store/useScheduleStore.ts). Modify this store to store new client-side schedule variables.

### 4. Running Verification Checks
Always run typescript checks and production builds to ensure zero compile errors before pushing:
```bash
npm run build
```

---

## 📂 Key File Map Reference
*   **Database Config**: [schema.prisma](aetasscheduler/prisma/schema.prisma) | [seed.ts](aetasscheduler/prisma/seed.ts)
*   **Validation Rules**: [schedulingValidation.ts](aetasscheduler/lib/schedulingValidation.ts)
*   **Server Actions**: [schedule.ts](aetasscheduler/app/actions/schedule.ts) | [job-role.ts](aetasscheduler/app/actions/job-role.ts) | [employee.ts](aetasscheduler/app/actions/employee.ts)
*   **State Store**: [useScheduleStore.ts](aetasscheduler/store/useScheduleStore.ts)
*   **Layout & Main Grid**: [ScheduleGrid.tsx](aetasscheduler/components/ScheduleGrid.tsx) | [ResponsiveLayoutShell.tsx](aetasscheduler/components/ResponsiveLayoutShell.tsx)
*   **Settings Screen**: [settings/page.tsx](aetasscheduler/app/settings/page.tsx)
*   **Roster Screen**: [employees/page.tsx](aetasscheduler/app/employees/page.tsx)
