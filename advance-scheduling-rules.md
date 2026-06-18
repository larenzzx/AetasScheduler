# Advanced Scheduling Rules — Feature Tracker

This document tracks and implement the implementation of constraint-based scheduling rules on top of the existing shift scheduling system (AetasScheduler).

---

## Overview of new constraints

| Rule | Value |
|---|---|
| Rotation cycle | 14 days (bi-weekly) |
| Shift-to-shift overlap | 1 hour |
| Minimum rest between shifts | 7 hours (hard limit), 8 hours (recommended/soft warning) |
| Max workdays per week | 5 |
| Max consecutive workdays | 6 |
| Fixed schedules | Must remain unaffected by auto-rotation/auto-generation |
| Rotational shifts allowed | DAY → MID → ADJUST → NIGHT → DAY (existing order, unchanged) |
| Gender rule | A female employee cannot be the only one on a night shift — needs 1+ companion |
| New employee rule | New employees can be flagged "Requires Mentor" — blocks solo shift assignment until unflagged |
| Base shift generation | Generating a schedule fills the first 14 days from the employee's current shift type, then rotates |
| Team rotation toggle | Each team can independently enable/disable rotation entirely |

---

## Phase A — Fix Save/Discard Bar Overlapping Last Table Row

This is a standalone UI bug fix. Independent from the rest of the phases — do this first since it's quick and unblocks comfortable editing while you test everything else.

### Task

```
Bug fix: on the schedule editing view, we have a fixed/sticky Save & Discard 
bar pinned to the bottom of the viewport. It currently overlaps and covers 
the last row of the schedule table, making it impossible to see or click 
into that row while editing.

Requirements:
- Add bottom padding/margin to the scrollable table container equal to the 
  height of the sticky Save/Discard bar plus a comfortable gap (e.g. 
  bar height + 24px), so the last row is never hidden behind it.
- Do this responsively — if the bar's height changes (e.g. wraps to two 
  lines on smaller screens), the padding should adjust accordingly rather 
  than using a hardcoded pixel value that breaks on resize. Measure the 
  bar's actual rendered height (e.g. via a ref + ResizeObserver, or CSS 
  env/calc if the bar height is fixed by design) and apply that as the 
  padding-bottom on the table container.
- Confirm the last row is fully visible and clickable when the Save/Discard 
  bar is showing, at both desktop and mobile/tablet widths.
- Do not change the sticky bar's own positioning or trigger logic — only 
  add the necessary spacing to the table container above it.

Show me the component(s) you changed and confirm the last row is no longer 
obstructed.
```

### Checklist
- [ ] Table container has dynamic bottom padding matching the sticky bar's height + gap
- [ ] Padding adjusts via ResizeObserver (or equivalent) rather than a hardcoded value
- [ ] Last row fully visible and clickable while Save/Discard bar is shown
- [ ] Verified on desktop width
- [ ] Verified on mobile/tablet width
- [ ] Sticky bar's own behavior unchanged

### Commit message
```
after completing, prompt this commit message for me to commit it. fix(ui): prevent sticky save/discard bar from covering last table row

- Add dynamic bottom padding to schedule table container matching
  the sticky bar's rendered height plus spacing
- Measure bar height via ResizeObserver so padding stays correct
  across screen sizes instead of using a hardcoded value
```

---

## Phase 0 — Data Model Extensions

### Task

```
We're extending our existing shift scheduling app (Next.js + Prisma + Supabase) 
with constraint-based scheduling rules. This is Phase 0: data model only — no 
business logic yet.

Extend the Prisma schema as follows:

1. Add to the Employee model:
   - gender: enum (MALE, FEMALE)
   - employmentType: enum (SOC_OPERATIONS, DESIGNER, IT_SUPPORT, OTHER, or we can add a employee type then it will have a dropdown for it to assign to the employee) — 
     make this a flexible string-backed enum or lookup table so we can add 
     types later without a migration
   - environmentAccess: we should also add info to employee where we can determine which access he/she have. Like Azimuth/Soliant/Gotsport. The purpose of this is each shift should have at least 1 access to Azimuth environment, and soliant/gotsport environment. (employee can have access to multiple named environments/systems)
   - requiresMentor: boolean, default false
   - isFixedSchedule: boolean, default false (true = exempt from auto-rotation 
     and auto-generation entirely; their schedule is manually managed only)
   - mentorId: optional self-relation to another Employee (the assigned mentor)

2. Add to the ShiftType model:
   - isNightShift: boolean, default false — used to trigger the female 
     companion rule. Mark NIGHT SHIFT and MIDNIGHT SHIFT as true.

3. Add a new model: SchedulingRuleConfig (singleton-style settings table)
   - minRestHours: integer, default 7
   - recommendedRestHours: integer, default 8
   - maxConsecutiveDays: integer, default 6
   - maxWeeklyWorkdays: integer, default 5
   - rotationCycleDays: integer, default 14
   - shiftOverlapHours: integer, default 1

Run the migration. Do not implement any validation logic yet — this phase is 
schema only. Show me the updated schema.prisma after you're done.
```

### Checklist
- [ ] `gender` field added to Employee
- [ ] `employmentType` added (flexible, not a hardcoded enum that requires migration to extend)
- [ ] `environmentAccess` relation/field added
- [ ] `requiresMentor` boolean added
- [ ] `isFixedSchedule` boolean added
- [ ] `mentorId` self-relation added
- [ ] `isNightShift` flag added to ShiftType, applied to NIGHT/MIDNIGHT shifts
- [ ] `SchedulingRuleConfig` table created with defaults
- [ ] Migration runs cleanly on Supabase

### Commit message
```
after completing, prompt this commit message for me to commit it. feat(schema): extend Employee and ShiftType models for advanced scheduling rules

- Add gender, employmentType, environmentAccess,
  requiresMentor, isFixedSchedule, mentorId to Employee
- Add isNightShift flag to ShiftType
- Add SchedulingRuleConfig settings table with rest/rotation defaults
```

---

## Phase 1 — Rest Period Constraint Engine

### Task

```
Phase 1: implement the rest period validation engine. No UI changes yet — 
build the core validation function and wire it into the existing schedule 
save/edit action.

Requirements:
- Create a function validateRestPeriod(employeeId, scheduleEntries) that 
  checks every pair of consecutive shifts for that employee across the 
  schedule (including the boundary between the last day of the previous 
  week and the first day of the new week).
- Rest period = time between the end of one shift and the start of the next.
- If rest period < minRestHours (7, from SchedulingRuleConfig): BLOCK the 
  save and return a clear error: "Not enough rest: only X hours between 
  shifts (minimum 7 required)."
- If rest period is between minRestHours and recommendedRestHours (7-8): 
  ALLOW the save but return a warning: "Only X hours rest — 8+ hours 
  recommended."
- If rest period >= recommendedRestHours: no warning.
- Handle overnight shifts correctly (e.g. MIDNIGHT SHIFT 10PM-7AM crossing 
  midnight) when calculating end times.
- Wire this into the existing schedule cell edit/save flow so it runs 
  before any schedule entry is persisted.
- Show the error/warning as a toast notification, and block the save only 
  on hard errors (not warnings).

Show me the validation function and where you hooked it into the save flow.
```

### Checklist
- [ ] `validateRestPeriod` function implemented
- [ ] Correctly handles overnight/midnight-crossing shifts
- [ ] Checks boundary between week N and week N+1, not just within one week
- [ ] Hard block on < 7 hours rest
- [ ] Soft warning on 7–8 hours rest
- [ ] Wired into schedule save/edit flow
- [ ] Toast notifications show on block and warning
- [ ] Manually tested with a deliberately bad rotation (e.g. MID → NIGHT same day)

### Commit message
```
feat(scheduling): add rest period validation engine

- Add validateRestPeriod() checking 7hr hard minimum / 8hr recommended
- Correctly calculates rest across overnight shifts and week boundaries
- Block save on violation, warn (non-blocking) on sub-recommended rest
- Wire validation into schedule entry save flow
```

---

## Phase 2 — Consecutive Days & Weekly Workday Caps

### Task

```
Phase 2: implement workday limit validation, building on the Phase 1 
validation engine.

Requirements:
- Create validateConsecutiveDays(employeeId, scheduleEntries) — no employee 
  may be scheduled (any shift, not Day-Off) for more than 6 consecutive 
  calendar days. Block save if violated, with error: "Employee would work 
  X consecutive days (max 6)."
- Create validateWeeklyWorkdays(employeeId, scheduleEntries) — no employee 
  may exceed 5 worked days within a single Mon-Sun week. Block save if 
  violated: "Employee would work X days this week (max 5)."
- Both checks should run alongside the rest period check from Phase 1, in 
  the same save flow, and all applicable errors should be shown together 
  (not just the first one found).
- Skip both checks entirely for employees where isFixedSchedule = true.

Show me both functions and confirm they run together with Phase 1's check 
in a single validation pass.
```

### Checklist
- [ ] `validateConsecutiveDays` implemented (max 6)
- [ ] `validateWeeklyWorkdays` implemented (max 5 per Mon–Sun week)
- [ ] Fixed-schedule employees are skipped by both checks
- [ ] All three validators (rest, consecutive, weekly) run together and report combined errors
- [ ] Manually tested with an employee scheduled 7 days straight
- [ ] Manually tested with an employee scheduled 6 days in one week

### Commit message
```
feat(scheduling): add consecutive-day and weekly workday limit validation

- Add validateConsecutiveDays() enforcing 6-day max streak
- Add validateWeeklyWorkdays() enforcing 5-day max per week
- Skip both checks for fixed-schedule employees
- Combine with rest period validation into single save-time check
```

---

## Phase 3 — Gender-Aware Night Shift Rule

### Task

```
Phase 3: implement the night shift companion rule.

Requirements:
- Create validateNightShiftCompanion(scheduleWeekId, dayOfWeek, shiftTypeId) 
  — for any shift where isNightShift = true, if a FEMALE employee is 
  assigned, there must be at least one other employee (any gender) also 
  assigned to that same shift type on that same day. 
- If a female employee would be the ONLY person on that night shift for 
  that day: BLOCK the save with error: "[Name] would be alone on [Shift] 
  on [Day] — at least one companion is required for night shifts."
- This check runs whenever a schedule entry is saved/edited, checking the 
  full shift roster for that cell (day + shift type combination across all 
  employees in the team), not just the single employee being edited.
- Also handle the reverse case: if editing removes the last companion from 
  a female employee's night shift, block that removal too.

Show me the validation function and confirm it checks the full roster for 
that day+shift combination, not just one employee in isolation.
```

### Checklist
- [ ] `validateNightShiftCompanion` implemented
- [ ] Blocks assigning a female employee alone to a night shift
- [ ] Blocks removing the last companion, leaving a female employee alone
- [ ] Checks full roster for the day+shift cell, not single-employee scope
- [ ] Manually tested: assign female employee solo to MIDNIGHT SHIFT → blocked
- [ ] Manually tested: two employees on night shift, remove one → blocked if female employee remains alone

### Commit message
```
feat(scheduling): add gender-aware night shift companion rule

- Add validateNightShiftCompanion() requiring 1+ companion for any
  female employee on isNightShift shifts
- Validate full shift roster (day + shift type) on every save, not
  just the employee being edited
- Block both assignment and removal actions that leave a female
  employee alone on a night shift
```

---

## Phase 4 — New Employee Mentor Requirement

### Task

```
Phase 4: implement the mentor requirement rule for new/low-capability 
employees.

Requirements:
- Create validateMentorRequirement(employeeId, scheduleWeekId, dayOfWeek, 
  shiftTypeId) — if an employee has requiresMentor = true, they cannot be 
  the only person assigned to that shift type on that day. There must be 
  at least one other employee on the same shift+day who either:
    a) has requiresMentor = false (an experienced employee), or
    b) is explicitly set as this employee's mentorId
- If violated, block save: "[Name] requires a mentor present — cannot be 
  scheduled solo on [Shift] on [Day]."
- Add an Employee management UI section: 
    - Toggle "Requires Mentor" on/off per employee
    - Dropdown to assign a specific mentor (filtered to employees on 
      any team with requiresMentor = false)
- When requiresMentor is toggled off (employee "graduates"), no retroactive 
  changes needed — it only affects future schedule saves.

Show me the validation function, the Employee management UI changes, and 
confirm this check runs alongside the Phase 1-3 validators in the same 
save flow.
```

### Checklist
- [ ] `validateMentorRequirement` implemented
- [ ] Blocks solo assignment for `requiresMentor = true` employees
- [ ] Accepts either an experienced employee or assigned mentor as valid companion
- [ ] Employee management UI: toggle for "Requires Mentor"
- [ ] Employee management UI: mentor assignment dropdown
- [ ] All four validators (rest, consecutive, weekly, gender, mentor) run together on save
- [ ] Manually tested: new employee solo on a shift → blocked
- [ ] Manually tested: new employee + assigned mentor on same shift → allowed

### Commit message
```
feat(scheduling): add mentor requirement rule for new employees

- Add validateMentorRequirement() blocking solo shifts for employees
  flagged requiresMentor unless an experienced employee or assigned
  mentor shares the shift
- Add Employee UI controls: requiresMentor toggle, mentor assignment
  dropdown
- Integrate with existing validation pipeline (rest, consecutive days,
  weekly cap, gender companion rule)
```

---

## Phase B — Base Shift Assignment, Per-Team Rotation Toggle & Employee Info on Grid

This phase makes the system "shift-based": every employee has a current/base shift assigned to them at all times. Creating a new schedule period pulls from that base shift automatically, instead of starting blank. It also adds a per-team switch to control whether that team rotates at all, and surfaces job role / shift type / gender directly on the schedule grid, not just the employee management page.

### Task

```
Phase B: make the schedule generation "shift-based" — driven by each 
employee's currently assigned base shift — and add a per-team rotation 
toggle plus employee info directly on the schedule grid.

Part 1 — Base Shift field and customizable Shift Type schedule:
- Add a currentShiftTypeId field to Employee (the shift they're "on" right 
  now — this is the source of truth for generation, separate from any 
  specific week's ScheduleEntry).
- Confirm ShiftType already supports full customization: name, start time, 
  end time, color, and which days of the week it applies to (if a shift 
  isn't simply Mon-Fri, allow specifying applicable days per ShiftType — 
  add a daysOfWeek field if not already present, e.g. an array like 
  ["MON","TUE","WED","THU","FRI"]).
- In the Employee management UI, when an admin assigns a ShiftType to an 
  employee (sets currentShiftTypeId), the employee's schedule should 
  reflect that shift's configured time/days automatically. If the admin 
  later edits that ShiftType's time or days in Settings, every employee 
  currently assigned to it should reflect the change going forward (don't 
  hardcode the time onto the employee record — always reference the 
  ShiftType).

Part 2 — Shift-based schedule generation:
- Add/update the "Generate Schedule" action so that for each employee:
    1. The first 2-week (14-day) block is filled using their 
       currentShiftTypeId, applied on the days that ShiftType specifies.
    2. For any subsequent 2-week block beyond the first, apply the 
       existing rotation sequence (DAY → MID → ADJUST → NIGHT → DAY) — 
       but only if that employee's team has rotation enabled (see Part 3).
    3. Employees with isFixedSchedule = true are filled using their 
       currentShiftTypeId for every period, with no rotation ever applied.
- Run this through the existing validators (Phases 1-5) same as the 
  existing generation/rotation flows — reuse those functions.

Part 3 — Per-team rotation toggle:
- Add a setting (e.g. on a Team model, or a TeamSettings table if Team is 
  just an enum currently — promote it to a proper model if needed) with 
  a field like rotationEnabled: boolean, default true.
- Add a UI control (e.g. on the Schedule Creation or Settings page) — a 
  toggle per team: "Team Alabang: Rotation [ON/OFF]" and "Team Zamboanga: 
  Rotation [ON/OFF]".
- When generating or auto-rotating, check this flag: if a team has 
  rotation disabled, every employee on that team keeps their 
  currentShiftTypeId unchanged for all future periods (acts like every 
  employee on that team is treated as fixed-schedule, without actually 
  setting isFixedSchedule on each one individually).

Part 4 — Employee info on the schedule grid:
- Add to the Employee Management list/edit page (if not already present 
  from earlier phases): job role / employment type, gender, and current 
  shift type, clearly visible and editable.
- On the Schedule Grid itself, add this info to the employee row label 
  area (alongside name + ID), e.g. as small labels/badges: 
  employmentType (e.g. "SOC Operations"), gender (e.g. icon or short 
  label "M"/"F"), and currentShiftTypeId as a colored badge matching that 
  shift's configured color.
- Keep this compact — it should not make rows significantly taller or 
  push the day columns further right in a way that crowds the layout. 
  Consider a small stacked layout under the employee name, or inline 
  badges with truncation/tooltip on smaller screens.

Show me the schema changes, the updated generation function, the team 
rotation toggle UI, and the updated schedule grid row showing the new 
employee info badges.
```

### Checklist
- [ ] `currentShiftTypeId` added to Employee as source of truth for their base shift
- [ ] ShiftType supports `daysOfWeek` (or confirmed it already does)
- [ ] Assigning a ShiftType to an employee in Employee Management reflects that shift's time/days automatically
- [ ] Editing a ShiftType's time/days updates everyone currently assigned to it (no hardcoded duplication onto Employee)
- [ ] "Generate Schedule" fills first 14 days from `currentShiftTypeId`
- [ ] Subsequent periods apply rotation sequence, but only if team rotation is enabled
- [ ] `isFixedSchedule` employees never rotate, regardless of team setting
- [ ] Team-level `rotationEnabled` toggle added (Team model/settings)
- [ ] UI toggle per team (Alabang / Zamboanga) to enable/disable rotation
- [ ] Disabling rotation for a team keeps all its employees on their current shift indefinitely
- [ ] Job role, gender, and current shift type visible + editable in Employee Management
- [ ] Job role, gender, and current shift type shown as compact badges on the Schedule Grid row
- [ ] Grid layout remains compact — no significant row height increase or column crowding
- [ ] Manually tested: assign Employee to DAY SHIFT → generate schedule → confirm first 2 weeks match DAY SHIFT days/times
- [ ] Manually tested: disable rotation for one team → generate next period → confirm that team's employees stayed on their current shift while the other team rotated normally

### Commit message
```
feat(scheduling): add base-shift-driven generation with per-team rotation toggle

- Add currentShiftTypeId to Employee as single source of truth for
  their active shift, with full ShiftType customization (time, days)
- Generation fills first 14 days from employee's current shift type,
  then applies rotation sequence for subsequent periods
- Add rotationEnabled toggle per team to fully disable rotation for
  a team without marking every employee isFixedSchedule individually
- Surface job role, gender, and current shift type as compact badges
  on the schedule grid row, alongside existing Employee Management UI
```

---

## Phase 5 — Shift Overlap (1-Hour Handover)

### Task

```
Phase 5: implement the 1-hour shift overlap requirement.

Context: shifts must overlap by 1 hour for handover (e.g. if DAY SHIFT 
ends at 3PM, the next shift covering that slot should start at 2PM, not 
3PM, so there's a 1-hour overlap window for handoff).

Requirements:
- Add an overlapHours field validation against SchedulingRuleConfig.
  shiftOverlapHours (default 1).
- Create validateShiftCoverage(scheduleWeekId, dayOfWeek) — for a given 
  day, check that consecutive shifts (ordered by start time) overlap by 
  at least shiftOverlapHours. This is a coverage check across ALL 
  employees scheduled that day for that team, not a per-employee rule.
- If there's a coverage gap (no overlap, or a time gap with nobody 
  scheduled) flag it as a warning (not a hard block, since shift TIMES 
  are configured at the ShiftType level, not chosen per save) — 
  "Coverage gap detected between [Shift A] and [Shift B] on [Day]."
- This is really a ShiftType configuration concern: when an admin edits 
  shift type start/end times in Settings, validate that the configured 
  shifts as a whole still produce 1-hour overlaps across the full 24-hour 
  cycle, and warn during shift type editing if they don't.
- Add this validation to the Shift Type management page, run when shift 
  times are added/edited, not on every schedule save (since shift times 
  rarely change).

Show me the validation function and confirm it's triggered from Shift 
Type settings editing, not from regular schedule saves.
```

### Checklist
- [ ] `validateShiftCoverage` implemented
- [ ] Checks overlap across full 24-hour cycle using configured shift times
- [ ] Triggered on Shift Type create/edit, not on every schedule save
- [ ] Warning shown (non-blocking) when coverage gap detected
- [ ] Manually tested by editing a shift time to create a gap, confirm warning appears
- [ ] Confirmed default shift times (DAY/MID/NIGHT/MIDNIGHT) currently satisfy 1-hour overlap, or documented where they don't

### Commit message
```
feat(scheduling): add shift coverage overlap validation

- Add validateShiftCoverage() checking 1-hour overlap across the
  full 24hr shift cycle using SchedulingRuleConfig.shiftOverlapHours
- Trigger validation on Shift Type create/edit instead of per
  schedule save, since shift times change infrequently
- Surface coverage gaps as non-blocking warnings in Shift Type settings
```

---

## Phase 6 — Bi-Weekly Auto-Rotation Engine (Rule-Aware)

### Task

```
Phase 6: upgrade the existing auto-rotation feature to respect all the 
new constraints from Phases 1-5, plus Phase B's per-team rotationEnabled 
toggle.

Context: we already have basic auto-rotation (DAY → MID → ADJUST → NIGHT 
→ DAY every 2 weeks). Now it needs to validate itself against the new 
rules and only apply rotations that don't break constraints — and skip 
rotation entirely for any team where rotation has been disabled.

Requirements:
- Before rotating, check the team's rotationEnabled flag (from Phase B). 
  If disabled, skip rotation for every employee on that team — keep their 
  currentShiftTypeId unchanged, same as a fixed-schedule employee.
- Update the auto-rotation function so that after generating the next 
  2-week rotated schedule, it runs all validators (rest period, 
  consecutive days, weekly workdays, gender companion, mentor requirement) 
  against the generated result BEFORE saving.
- If the auto-rotation would violate any hard constraint for a specific 
  employee, do NOT auto-rotate that employee — instead, leave their 
  previous shift in place and flag them in a summary: "[Name] was not 
  rotated automatically — would violate [rule]. Manual review needed."
- Skip employees with isFixedSchedule = true entirely (already excluded, 
  confirm this still holds).
- After running auto-rotation, show a summary modal/panel: 
    - X employees rotated successfully
    - X employees flagged for manual review (with reasons)
    - X employees skipped (fixed schedule)
- Admin can still manually override any cell after auto-rotation runs, 
  same as before.

Show me the updated rotation function and the summary UI.
```

### Checklist
- [ ] Auto-rotation checks team `rotationEnabled` flag before processing any employee on that team
- [ ] Teams with rotation disabled keep every employee on their current shift, unchanged
- [ ] Auto-rotation runs all 5 validators against generated result before saving
- [ ] Employees who would violate a rule are skipped and flagged, not force-rotated
- [ ] Fixed-schedule employees confirmed still excluded
- [ ] Summary panel shows rotated / flagged / skipped counts after running
- [ ] Flagged employees show the specific rule that would be violated
- [ ] Manual override still works after auto-rotation completes
- [ ] Manually tested full bi-weekly rotation cycle on seed data

### Commit message
```
feat(scheduling): make auto-rotation rule-aware

- Validate generated rotation against all constraint validators
  (rest, consecutive days, weekly cap, gender, mentor) before saving
- Skip and flag employees whose rotation would violate a hard rule,
  leaving their prior shift unchanged
- Add rotation summary panel: rotated / flagged / skipped breakdown
  with violation reasons
- Confirm fixed-schedule employees remain excluded from rotation
```

---

## Phase 7 — Conflict-Resolving Pass for Generated Schedules

### Task

```
Phase 7: add a conflict-resolution pass on top of the "Generate Schedule" 
flow built in Phase B, so that gender/mentor conflicts produced by 
base-shift generation get one automatic resolution attempt before being 
flagged for manual review.

Context: Phase B already generates the first 14 days from each employee's 
currentShiftTypeId and applies rotation afterward (respecting the 
per-team rotationEnabled toggle and isFixedSchedule). This phase adds a 
smarter resolution step rather than immediately flagging every conflict.

Requirements:
- After Phase B's generation produces a full schedule, run all 5 
  validators (rest, consecutive days, weekly cap, gender companion, 
  mentor requirement) against the result.
- For any violation that involves the GENDER or MENTOR rule specifically 
  (these are the two that can sometimes be fixed by reassigning who's on 
  the shift, unlike rest/consecutive/weekly which are about timing and 
  can't be "swapped" away): attempt ONE re-assignment pass. For example:
    - If a female employee would be alone on a night shift, check if 
      another active employee on the same team (who isn't already 
      scheduled that day, and wouldn't themselves create a rest/
      consecutive/weekly violation if added) can be added to that shift 
      as a companion.
    - If a mentor-requiring employee would be solo, check the same way 
      for an experienced employee or their assigned mentor.
- If the re-assignment pass resolves the conflict, apply it and note it 
  in the summary as "auto-resolved" (distinct from "rotated normally").
- If no valid re-assignment exists, fall back to flagging for manual 
  review, same as Phase B's existing behavior.
- Rest period, consecutive days, and weekly cap violations are NOT 
  eligible for auto re-assignment (there's no valid swap that fixes a 
  timing problem) — these always go straight to manual review flagging.
- Update the generation summary panel to show four categories: 
  generated normally / auto-resolved / flagged for manual review / 
  skipped (fixed schedule or team rotation disabled).

Show me the conflict resolution function, confirm it only attempts 
re-assignment for gender/mentor violations (not timing violations), and 
show the updated 4-category summary panel.
```

### Checklist
- [ ] Conflict resolution pass runs after Phase B's generation completes
- [ ] Only attempts re-assignment for gender and mentor violations
- [ ] Rest/consecutive/weekly violations skip straight to manual review flag (no re-assignment attempted)
- [ ] Re-assignment candidate check itself respects rest/consecutive/weekly rules (doesn't fix one violation by creating another)
- [ ] Summary panel shows 4 categories: generated / auto-resolved / flagged / skipped
- [ ] Manually tested: scenario where a gender conflict has a valid fix → confirm auto-resolved
- [ ] Manually tested: scenario where no valid companion exists → confirm flagged for manual review, not silently left broken

### Commit message
```
feat(scheduling): add conflict resolution pass for base-shift generation

- Run gender/mentor violation re-assignment attempt after Phase B's
  base-shift generation, before falling back to manual review flagging
- Re-assignment candidates are still checked against rest/consecutive/
  weekly rules to avoid trading one violation for another
- Timing-based violations (rest, consecutive days, weekly cap) always
  go straight to manual review — no re-assignment attempted
- Expand generation summary to 4 categories: generated, auto-resolved,
  flagged, skipped
```

---

## Phase 8 — Emergency Change Flexibility (Sudden Leave / Day-Off)

### Task

```
Phase 8: add a fast-path workflow for emergency schedule changes (sudden 
leave, emergency day-off) that intelligently suggests fixes rather than 
just allowing an unconstrained edit.

Requirements:
- Add a "Mark Emergency Leave" quick action on any schedule cell — when 
  triggered, it sets that employee to LEAVE for the selected day(s) 
  immediately (this bypasses the validators since removing someone from 
  a shift can't itself violate the rest/consecutive/weekly rules — but 
  it CAN break the gender companion rule or leave a shift uncovered).
- After marking emergency leave, immediately re-run 
  validateNightShiftCompanion and a basic coverage check for that day's 
  affected shift.
- If the change leaves a gap (e.g. now a female employee is alone on that 
  night shift, or the shift has zero coverage), show a "Suggested 
  Replacements" panel listing other active employees on that team who:
    - are NOT already scheduled that day
    - satisfy the gender/mentor constraints for that shift if assigned
    - had sufficient rest before/after if assigned
  Sorted by best fit (e.g. someone already familiar with that shift type 
  ranks higher).
- Admin picks a replacement from the suggestions or leaves it unfilled, 
  and confirms.
- This entire flow should complete in 2 clicks or fewer beyond the initial 
  "Mark Emergency Leave" action.

Show me the emergency leave action, the gap-detection logic, and the 
suggested replacement panel.
```

### Checklist
- [ ] "Mark Emergency Leave" quick action available on schedule cells
- [ ] Immediately sets employee to LEAVE without going through full save validators
- [ ] Re-checks gender companion rule and basic coverage after the change
- [ ] Suggested Replacements panel shows when a gap is detected
- [ ] Suggestions filter out already-scheduled employees and rest-period conflicts
- [ ] Suggestions respect gender/mentor constraints
- [ ] Admin can pick a suggestion or leave unfilled
- [ ] Flow takes 2 clicks or fewer after initiating
- [ ] Manually tested: mark a female employee's night shift partner on leave, confirm suggestion panel appears

### Commit message
```
feat(scheduling): add emergency leave fast-path with replacement suggestions

- Add "Mark Emergency Leave" quick action for sudden leave/day-off
- Re-validate gender companion rule and shift coverage immediately
  after an emergency change
- Add Suggested Replacements panel: filters available employees by
  rest period, gender/mentor constraints, and existing schedule
- Streamline emergency rescheduling to 2 clicks or fewer
```

---

## Phase 9 — Drag & Drop Schedule Editing

### Task

```
Phase 9: add drag-and-drop interaction to the schedule grid using 
@dnd-kit/core.

Requirements:
- Employees (or their shift cell) can be dragged from one day/shift cell 
  to another within the same week's grid.
- Dragging a cell triggers the same validation pipeline as a manual edit 
  (all 5 validators) — if the drop would violate a rule, reject the drop 
  with a toast explaining why, and the cell snaps back to its original 
  position.
- Support dragging an employee's entire shift assignment to swap with 
  another employee (e.g. drag Employee A's Tuesday MID shift onto 
  Employee B's Tuesday MID shift to swap who's covering what — or onto 
  an empty cell to reassign).
- Visual feedback during drag: highlight valid drop targets, show a 
  red/invalid indicator over cells that would violate a rule (compute 
  this in real time as the user drags, not just on drop).
- Maintain keyboard accessibility — drag and drop should not be the only 
  way to make an edit; the existing click-to-edit dropdown must still 
  work as a fallback.

Show me the drag-and-drop implementation and confirm validation runs both 
in real-time (during drag, for visual feedback) and on drop (for the 
actual block/allow decision).
```

### Checklist
- [ ] @dnd-kit/core integrated into schedule grid
- [ ] Dragging a cell to another cell triggers full validation pipeline
- [ ] Invalid drops are rejected with explanatory toast, cell snaps back
- [ ] Swap behavior works (dragging onto an occupied cell swaps assignments)
- [ ] Real-time visual feedback shows valid/invalid drop targets during drag
- [ ] Click-to-edit dropdown still works as non-drag fallback
- [ ] Manually tested a valid drag swap
- [ ] Manually tested a drag that would violate rest period — confirmed rejected

### Commit message
```
feat(ui): add drag-and-drop schedule editing

- Integrate @dnd-kit/core into schedule grid for cell-to-cell dragging
- Run full validation pipeline on drop; reject and snap back on violation
- Support swap behavior when dropping onto an occupied cell
- Add real-time valid/invalid drop target highlighting during drag
- Preserve click-to-edit dropdown as accessible fallback
```

---

## Final checklist summary

- [ ] Phase A — Fix Save/Discard bar overlapping last table row
- [ ] Phase 0 — Data model extensions
- [ ] Phase 1 — Rest period constraint engine
- [ ] Phase 2 — Consecutive days & weekly workday caps
- [ ] Phase 3 — Gender-aware night shift rule
- [ ] Phase 4 — New employee mentor requirement
- [ ] Phase B — Base shift assignment, per-team rotation toggle & employee info on grid
- [ ] Phase 5 — Shift overlap (1-hour handover)
- [ ] Phase 6 — Bi-weekly auto-rotation engine (rule-aware)
- [ ] Phase 7 — Shift-based auto schedule generation
- [ ] Phase 8 — Emergency change flexibility
- [ ] Phase 9 — Drag & drop schedule editing