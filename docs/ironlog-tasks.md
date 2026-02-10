# IronLog — Full Project Task Breakdown

**Version:** 1.0
**Date:** February 8, 2026
**Companion docs:** ironlog-prd.md, ironlog-technical-architecture.md, ironlog-wireframes.html

---

## Overview

22 phases, ~90 tasks. Organized so each phase can be built and verified before moving on. Tasks within a phase are sequential. See the dependency graph at the bottom for parallelization opportunities.

---

## Phase 1: Project Scaffolding & Infrastructure

- [x] **1.1** Create root project structure (`client/`, `server/`, `db/`, `docs/`)
- [x] **1.2** Create `docker-compose.yml` with `db`, `api`, and `client` services
- [x] **1.3** Create `.env.example` with `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- [x] **1.4** Create `db/init/00_extensions.sql` (uuid-ossp extension)
- [x] **1.5** Create `server/Dockerfile` (Node 20 Alpine)
- [x] **1.6** Create `client.Dockerfile` (multi-stage: build React, serve via Nginx)
- [x] **1.7** Create `client/nginx.conf` (API proxy to `api:3001`, SPA fallback, static asset caching)
- [x] **1.8** Verify: `docker-compose up` starts all three containers and they can communicate

## Phase 2: Server Foundation

- [x] **2.1** Initialize `server/package.json` (Express, pg, uuid dependencies)
- [x] **2.2** Create `server/src/config.js` — environment config (PORT, DATABASE_URL)
- [x] **2.3** Create `server/src/db/pool.js` — pg Pool setup
- [x] **2.4** Create `server/src/db/migrate.js` — migration runner (creates `migrations` tracking table, runs `.sql` files in order, within transactions)
- [x] **2.5** Create `server/src/index.js` — Express app entry (JSON body parser, CORS, route mounting, migration on startup)
- [x] **2.6** Create `server/src/middleware/errorHandler.js` — global error handler returning `{ error: { message, code } }`
- [x] **2.7** Create `server/src/middleware/validate.js` — request validation helpers
- [x] **2.8** Verify: server starts, runs migrations, responds to a health check

## Phase 3: Database Schema & Seed Data

- [x] **3.1** Create `server/src/db/migrations/001_initial_schema.sql` — all tables: `exercises`, `programs`, `program_days`, `program_exercises`, `workout_sessions`, `session_exercises`, `set_logs`, plus indexes and triggers
- [x] **3.2** Create `server/src/db/migrations/002_seed_data.sql` — 13 exercises, default program, 7 program days (Sat = rest), program exercises for all 6 workout days including Friday superset
- [x] **3.3** Verify: migration runs on startup, all tables created, seed data queryable

## Phase 4: API — Exercise Library

- [x] **4.1** Create `server/src/routes/exercises.js` — route definitions
- [x] **4.2** Create `server/src/controllers/exerciseController.js`:
  - `GET /api/exercises` — list all exercises
  - `POST /api/exercises` — create exercise (name, muscle_group, default_rest_seconds, notes)
  - `PUT /api/exercises/:id` — update exercise
- [x] **4.3** Add input validation (name required, muscle_group required, rest_seconds positive integer)
- [x] **4.4** Verify: CRUD operations work via curl/Postman

## Phase 5: API — Program Management

- [x] **5.1** Create `server/src/routes/programs.js` — route definitions
- [x] **5.2** Create `server/src/controllers/programController.js`:
  - `GET /api/program/active` — return active program with nested days and exercises (resolve `rest_seconds` fallback to exercise default)
  - `PUT /api/program/:id` — full replace of program structure (days + exercises)
- [x] **5.3** Verify: GET returns fully nested program matching seed data; PUT replaces and re-query confirms

## Phase 6: API — Workout Sessions

- [x] **6.1** Create `server/src/routes/workouts.js` — route definitions
- [x] **6.2** Create `server/src/controllers/workoutController.js`:
  - `POST /api/workouts` — start session: create `workout_sessions` row, create `session_exercises` for each program exercise, query `last_session` for each exercise, return full nested response
  - `GET /api/workouts/current` — return in-progress session (completed_at IS NULL) or `{ data: null }`
  - `PUT /api/workouts/:id/complete` — set `completed_at`, mark remaining pending exercises as skipped, compute progression comparison, return summary with progression details
- [x] **6.3** Implement `last_session` query — most recent `session_exercises` row for the same `exercise_id` with status 'completed' or 'partial', including set_logs
- [x] **6.4** Implement progression comparison logic (server-side):
  - higher weight on any set = `progressed` (reason: `higher_weight`)
  - same weight + higher reps on any set = `progressed` (reason: `higher_reps`)
  - all same = `same`
  - otherwise = `regressed`
  - no prior session = `first_time`
- [x] **6.5** Verify: full workflow — start session, check current, complete — returns correct progression data

## Phase 7: API — Session Exercises

- [x] **7.1** Add session exercise endpoints to workouts routes:
  - `PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/start` — set `started_at`
  - `PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/skip` — set status to 'skipped', accept optional `reason`
  - `PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/complete` — set status to 'completed' (or 'partial' if fewer sets than target), set `completed_at`
- [x] **7.2** Verify: exercise state transitions work correctly

## Phase 8: API — Set Logging

- [x] **8.1** Create `server/src/routes/sets.js` — route definitions
- [x] **8.2** Create `server/src/controllers/setController.js`:
  - `POST /api/workouts/:workoutId/exercises/:sessionExerciseId/sets` — log set (weight_lbs, reps, rpe, rest_duration_seconds, prescribed_rest_seconds); compute `rest_was_extended` server-side
  - `PUT /api/sets/:id` — edit a logged set (partial update)
  - `DELETE /api/sets/:id` — delete a set
- [x] **8.3** Add validation (rpe 7–10 in 0.5 steps, reps >= 0, weight_lbs > 0, set_number >= 1)
- [x] **8.4** Verify: log sets, edit, delete; check `rest_was_extended` computed correctly

## Phase 9: API — History

- [x] **9.1** Add history endpoints to exercises and workouts routes:
  - `GET /api/exercises/:id/last-session` — most recent completed session with sets
  - `GET /api/exercises/:id/history` — paginated history (limit/offset), includes progression_status per session
  - `GET /api/workouts/history?week=YYYY-WW` or `?date=YYYY-MM-DD` — completed workouts for a week with exercises and sets
- [x] **9.2** Implement week boundary calculation (Sunday–Saturday based on the program)
- [x] **9.3** Verify: history queries return correct data with proper pagination

## Phase 10: Frontend — Project Setup

- [x] **10.1** Initialize `client/package.json` (React, React Router, Vite, Tailwind CSS, PostCSS)
- [x] **10.2** Create `client/vite.config.js` (API proxy to localhost:3001 for dev)
- [x] **10.3** Create `client/tailwind.config.js` and `client/postcss.config.js`
- [x] **10.4** Create `client/index.html` and `client/src/main.jsx` entry point
- [x] **10.5** Create `client/src/index.css` with Tailwind imports and custom theme (dark background, IBM Plex fonts, muscle group colors per wireframes)
- [x] **10.6** Create `client/public/manifest.json` (PWA manifest for home screen icon)
- [x] **10.7** Verify: `npm run dev` serves the app, Tailwind works, hot reload functional

## Phase 11: Frontend — API Client & Utilities

- [x] **11.1** Create `client/src/api/client.js` — base fetch wrapper (JSON, error handling, toast-ready error format)
- [x] **11.2** Create `client/src/api/programs.js` — `getActiveProgram()`, `updateProgram()`
- [x] **11.3** Create `client/src/api/exercises.js` — `getExercises()`, `createExercise()`, `updateExercise()`, `getLastSession()`, `getExerciseHistory()`
- [x] **11.4** Create `client/src/api/workouts.js` — `startWorkout()`, `getCurrentWorkout()`, `completeWorkout()`, `getWorkoutHistory()`, exercise state endpoints
- [x] **11.5** Create `client/src/api/sets.js` — `logSet()`, `editSet()`, `deleteSet()`
- [x] **11.6** Create `client/src/utils/constants.js` — RPE values array, muscle group color map, day labels
- [x] **11.7** Create `client/src/utils/formatters.js` — `formatWeight()`, `formatTime()`, `formatDate()`, `formatDuration()`
- [x] **11.8** Create `client/src/utils/progression.js` — `compareProgression()` function (client-side duplicate for UI use)

## Phase 12: Frontend — Layout & Routing

- [x] **12.1** Create `client/src/App.jsx` with React Router setup (routes: `/`, `/workout/:id`, `/history`, `/history/exercise/:id`, `/program`)
- [x] **12.2** Create `client/src/components/layout/BottomNav.jsx` — 3-tab nav (Workout, History, Program) with active state
- [x] **12.3** Create `client/src/components/layout/PageHeader.jsx` — reusable header with optional back button
- [x] **12.4** Create page shells: `HomePage.jsx`, `WorkoutPage.jsx`, `HistoryPage.jsx`, `ExerciseHistoryPage.jsx`, `ProgramPage.jsx`
- [x] **12.5** Verify: navigation between all pages works, bottom nav highlights correctly

## Phase 13: Frontend — Home Screen

- [x] **13.1** Create `client/src/components/home/HomeScreen.jsx` — fetches active program, determines today's day, shows date + day label
- [x] **13.2** Create `client/src/components/home/WorkoutPreview.jsx` — list of today's exercises with muscle group badges and set counts
- [x] **13.3** Create `client/src/components/home/RestDayMessage.jsx` — rest day display (Saturday)
- [x] **13.4** Add "Start Workout" button — calls `POST /api/workouts`, navigates to `/workout/:id`
- [x] **13.5** Add resume detection — calls `GET /api/workouts/current`; if in-progress session exists, show "Resume Workout" with progress summary instead of "Start Workout"
- [x] **13.6** Verify: home screen shows correct day/exercises, start creates session, resume detects in-progress

## Phase 14: Frontend — Active Workout Core

- [x] **14.1** Create `client/src/hooks/useWorkout.js` — manages active workout state: current exercise index, sets logged, exercise statuses, navigation between exercises
- [x] **14.2** Create `client/src/components/workout/ExerciseView.jsx` — main exercise screen with header (name, muscle group, progress indicator "Exercise X of Y")
- [x] **14.3** Create `client/src/components/workout/LastSessionCard.jsx` — compact dimmed card showing prior session's sets (weight, reps, RPE per set); "First time" message if no data; "History" link
- [x] **14.4** Create `client/src/components/workout/SetList.jsx` — shows completed sets (dimmed with checkmark), current set (highlighted), upcoming sets (dimmed placeholder)
- [x] **14.5** Create `client/src/components/workout/SetInput.jsx` — weight (numeric input), reps (numeric input), pre-filled from last session's corresponding set
- [x] **14.6** Create `client/src/components/workout/RpeSelector.jsx` — button row (7, 7.5, 8, 8.5, 9, 9.5, 10), never pre-filled, tap to select
- [x] **14.7** Implement "Log Set" action — save set via API, advance set counter, auto-start rest timer
- [x] **14.8** Verify: can navigate through exercises, log sets with pre-filled values, see last session data

## Phase 15: Frontend — Rest Timer

- [x] **15.1** Create `client/src/hooks/useTimer.js` — countdown/overage timer with states: idle, countdown, overage; returns remaining/elapsed seconds, mode; actions: start, tick, dismiss, reset
- [x] **15.2** Create `client/src/hooks/useVibrate.js` — wrapper for `navigator.vibrate([200, 100, 200])` pattern
- [x] **15.3** Create `client/src/hooks/useWakeLock.js` — request/release screen wake lock during active workout
- [x] **15.4** Create `client/src/components/workout/RestTimer.jsx` — countdown display (large monospace digits, minutes:seconds, "Rest — X:XX prescribed" label, "Next: Set N of M")
- [x] **15.5** Implement overage mode in RestTimer — count up display, amber/warning styling, "+X:XX over" format, "Total rest: X:XX"
- [x] **15.6** Implement timer auto-start after logging a set (except last set of exercise)
- [x] **15.7** Implement dismiss button — stops timer, captures elapsed time
- [x] **15.8** Wire timer to set logging — when next set is logged, `rest_duration_seconds` = total elapsed from timer dismiss
- [x] **15.9** Implement vibration at countdown zero
- [x] **15.10** Verify: timer starts after set, counts down, transitions to overage, vibrates, rest duration captured in set log

## Phase 16: Frontend — Workout Flow Control

- [ ] **16.1** Implement exercise completion — after last prescribed set, show "Next Exercise" and "Add Extra Set" buttons (no timer auto-start)
- [ ] **16.2** Implement "Add Extra Set" — increments set count, shows input for the additional set
- [ ] **16.3** Create `client/src/components/workout/SupersetBanner.jsx` — purple banner ("SUPERSET — No rest, go immediately")
- [ ] **16.4** Implement superset auto-advance — when exercise has `superset_with_next`, completing last set immediately shows superset partner with banner, no timer
- [ ] **16.5** Create `client/src/components/workout/SkipModal.jsx` — modal with optional reason text input, "Skip Exercise" and "Cancel" buttons
- [ ] **16.6** Implement skip flow — marks exercise as skipped via API, advances to next exercise
- [ ] **16.7** Implement backward navigation — "Previous Exercise" button to review/edit already-logged exercises
- [ ] **16.8** Verify: exercise completion flow, superset auto-advance, skip with reason, backward navigation all work correctly

## Phase 17: Frontend — Workout Completion

- [ ] **17.1** Create `client/src/components/workout/WorkoutComplete.jsx`:
  - "Workout Complete" header with date and total duration
  - Progression indicator ("X of Y exercises progressed")
  - Summary grid: each exercise with muscle group badge, sets (weight x reps @ RPE), progression status (up/same/down arrows)
  - Skipped exercises greyed out with reason
  - "Done" button returns to home
- [ ] **17.2** Wire completion — after last exercise, call `PUT /api/workouts/:id/complete`, display completion screen with response data
- [ ] **17.3** Verify: completing a workout shows correct progression summary, done returns to home

## Phase 18: Frontend — Workout History

- [ ] **18.1** Create `client/src/components/history/WeeklyGrid.jsx` — horizontal-scrolling table, days as columns, muscle groups as rows, set data in cells (compact monospace format)
- [ ] **18.2** Implement week navigation — previous/next week buttons, default to current/most recent week
- [ ] **18.3** Create `client/src/components/history/ProgressBadge.jsx` — up/same/down indicator component
- [ ] **18.4** Make exercises tappable — navigate to `/history/exercise/:id`
- [ ] **18.5** Verify: weekly grid displays correctly, navigation works, tapping exercises navigates to history

## Phase 19: Frontend — Exercise History

- [ ] **19.1** Create `client/src/components/history/ExerciseHistory.jsx` — exercise header with name, muscle group badge, default rest/sets info
- [ ] **19.2** Implement session list — reverse chronological, each showing date, progression status, all sets (weight x reps @ RPE), rest times with extended-rest warning
- [ ] **19.3** Add v2 chart placeholder (dashed border, "Progression chart (v2)" text)
- [ ] **19.4** Implement pagination (load more on scroll or button)
- [ ] **19.5** Wire back navigation and "History" link from LastSessionCard in active workout
- [ ] **19.6** Verify: exercise history shows correct data, pagination works, accessible from both workout view and weekly grid

## Phase 20: Frontend — Program Admin

- [ ] **20.1** Create `client/src/components/program/ProgramAdmin.jsx` — program name, exercise library button, list of 7 day editors
- [ ] **20.2** Create `client/src/components/program/DayEditor.jsx` — expandable/collapsible day card showing label, exercise count, rest day indicator
- [ ] **20.3** Create `client/src/components/program/ExerciseSlot.jsx` — exercise row with drag handle, name, set count, rest time, edit/remove buttons
- [ ] **20.4** Implement add exercise to day — picker from exercise library or create inline
- [ ] **20.5** Implement remove exercise from day
- [ ] **20.6** Implement reorder exercises within a day (move up/down buttons or drag)
- [ ] **20.7** Implement exercise slot configuration — edit target sets, override rest time, toggle superset_with_next
- [ ] **20.8** Implement toggle rest day on/off per day
- [ ] **20.9** Implement save — `PUT /api/program/:id` with full program structure
- [ ] **20.10** Create `client/src/components/program/ExerciseLibrary.jsx` — list all exercises, create new, edit existing (name, muscle group, default rest, notes)
- [ ] **20.11** Verify: can modify program, add/remove/reorder exercises, save persists, changes don't affect past sessions

## Phase 21: Error Handling & Polish

- [ ] **21.1** Implement toast notification system for API errors
- [ ] **21.2** Implement "Connection lost" banner for network errors
- [ ] **21.3** Handle edge cases: starting workout on rest day (shouldn't be possible from UI), double-starting a session (409 conflict)
- [ ] **21.4** Ensure all numeric inputs have appropriate `inputmode="decimal"` or `inputmode="numeric"` for mobile keyboards
- [ ] **21.5** Ensure touch targets are at least 44x44px on all interactive elements
- [ ] **21.6** Test all screens at 390px width for mobile viewport
- [ ] **21.7** Release wake lock on workout completion or page unmount

## Phase 22: Docker Build & Deployment Verification

- [ ] **22.1** Verify `docker-compose build` succeeds for all services
- [ ] **22.2** Verify `docker-compose up` — all three containers start, migrations run, seed data loads
- [ ] **22.3** Verify Nginx serves React app and proxies `/api/` to Express
- [ ] **22.4** Full end-to-end test: open app on Android Chrome → start workout → log sets through all exercises → complete → verify in history
- [ ] **22.5** Test resume flow: start workout → close browser → reopen → resume workout
- [ ] **22.6** Verify PostgreSQL data persists across `docker-compose down && docker-compose up`
- [ ] **22.7** Document backup command in README

---

## Dependency Graph

```
Phase 1 (Infrastructure)
  └─> Phase 2 (Server Foundation)
       └─> Phase 3 (Schema & Seed)
            ├─> Phase 4 (API: Exercises)
            ├─> Phase 5 (API: Programs)
            ├─> Phase 6 (API: Workouts) ── depends on 4, 5
            │    └─> Phase 7 (API: Session Exercises)
            │         └─> Phase 8 (API: Sets)
            └─> Phase 9 (API: History) ── depends on 6, 8

Phase 10 (Frontend Setup) ── can start in parallel with Phase 2
  └─> Phase 11 (API Client & Utils)
       └─> Phase 12 (Layout & Routing)
            ├─> Phase 13 (Home Screen) ── depends on API: 5, 6
            ├─> Phase 14 (Workout Core) ── depends on API: 6, 7, 8
            │    └─> Phase 15 (Timer)
            │         └─> Phase 16 (Workout Flow)
            │              └─> Phase 17 (Completion) ── depends on API: 6
            ├─> Phase 18 (History Grid) ── depends on API: 9
            │    └─> Phase 19 (Exercise History) ── depends on API: 9
            └─> Phase 20 (Program Admin) ── depends on API: 4, 5

Phase 21 (Polish) ── after all frontend phases
Phase 22 (Deployment) ── after everything
```
