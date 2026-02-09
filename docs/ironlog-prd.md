# IronLog — Product Requirements Document

**Version:** 1.0
**Date:** February 8, 2026
**Author:** Terry (product owner) + Claude (documentation)

---

## 1. Overview

IronLog is a single-user, mobile-friendly web application for tracking resistance training workouts. It replaces a paper-based weekly workout sheet with a digital experience that adds automatic rest timers, progressive load history, and data persistence for future analysis.

The app runs on a Synology NAS as a Docker Compose stack (React frontend, Node/Express API, PostgreSQL database) and is accessed via a mobile browser on Android. No authentication is required (single user, local network only).

---

## 2. Goals

1. **Replace paper tracking** — Digitize the weekly workout sheet without losing its simplicity.
2. **Enable progressive load** — Surface the most recent session's data for each exercise so the user can see what to beat, without hunting through old sheets.
3. **Automate rest timing** — Provide a countdown timer between sets that transitions to a stopwatch on overage, with actual rest duration recorded per set.
4. **Persist data** — Store all workout history in PostgreSQL for future visualization and analysis (charts and dashboards are v2 scope).

---

## 3. Non-Goals (v1)

- Offline / PWA service worker caching
- Multi-user support or authentication
- Data visualization / charts / dashboards
- Mobile app (native Android/iOS)
- Exercise video or instruction content
- Social features, sharing, or export

---

## 4. User Profile

Single user (Terry). Works out at a home gym with reliable WiFi. Uses an Android phone during workouts. Has years of experience with resistance training and understands concepts like RPE, progressive overload, and periodization. Prefers simple, fast interfaces over feature-rich ones.

---

## 5. Data Model

### 5.1 Exercise Library

A canonical list of exercises with metadata.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Display name (e.g., "Bench Press") |
| muscle_group | string | Target muscle group (e.g., "pecs", "lats", "biceps", "triceps", "delts", "legs") |
| default_rest_seconds | integer | Default rest time between sets (120 or 180) |
| notes | string (nullable) | Optional notes about the exercise |
| created_at | timestamp | |
| updated_at | timestamp | |

### 5.2 Program

Defines the weekly workout structure — which exercises are performed on which days, in what order, with how many sets.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | string | Program name (e.g., "Default Program") |
| is_active | boolean | Whether this is the currently active program |
| created_at | timestamp | |
| updated_at | timestamp | |

### 5.3 Program Day

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| program_id | UUID | FK → Program |
| day_of_week | integer | 0 = Sunday, 1 = Monday, ... 6 = Saturday |
| label | string | Display label (e.g., "SUN", "MON") |
| is_rest_day | boolean | If true, no exercises for this day |
| created_at | timestamp | |

### 5.4 Program Exercise

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| program_day_id | UUID | FK → Program Day |
| exercise_id | UUID | FK → Exercise |
| sort_order | integer | Display/execution order within the day |
| target_sets | integer | Prescribed number of sets (typically 4) |
| rest_seconds | integer (nullable) | Override rest time for this specific slot (null = use exercise default) |
| superset_with_next | boolean | If true, the next exercise (by sort_order) is a superset — no rest timer between them, and the app auto-advances |
| created_at | timestamp | |

### 5.5 Workout Session

A single workout instance — one per day when the user works out.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| program_day_id | UUID | FK → Program Day |
| started_at | timestamp | When the user tapped "Start Workout" |
| completed_at | timestamp (nullable) | When the workout was finished (null = in progress) |
| notes | string (nullable) | Optional session-level notes |

### 5.6 Session Exercise

Tracks an exercise within a workout session, including skip status.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| workout_session_id | UUID | FK → Workout Session |
| program_exercise_id | UUID | FK → Program Exercise |
| exercise_id | UUID | FK → Exercise (denormalized for query convenience) |
| sort_order | integer | Actual order performed (may differ from program order) |
| status | enum | 'completed', 'skipped', 'partial' |
| skip_reason | string (nullable) | Optional reason if skipped (e.g., "shoulder pain") |
| started_at | timestamp (nullable) | When the user started this exercise |
| completed_at | timestamp (nullable) | When the user finished or skipped this exercise |

### 5.7 Set Log

Individual set data within an exercise.

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| session_exercise_id | UUID | FK → Session Exercise |
| set_number | integer | 1-indexed set number |
| weight_lbs | decimal | Weight in pounds |
| reps | integer | Number of reps completed |
| rpe | decimal | Rate of Perceived Exertion (7–10, in 0.5 increments: 7, 7.5, 8, 8.5, 9, 9.5, 10) |
| rest_duration_seconds | integer (nullable) | Actual rest time before this set (null for first set) |
| prescribed_rest_seconds | integer | The countdown timer duration for this set |
| rest_was_extended | boolean | True if rest exceeded prescribed time (computed, but stored for easy querying) |
| created_at | timestamp | When this set was logged |

---

## 6. Screens & User Flows

### 6.1 Home Screen

The landing screen when the app is opened.

**Behavior:**
- Displays the current day of the week, the date, and the day's workout label from the active program.
- If today is a rest day (Saturday), displays a "Rest Day" message with no workout option.
- If today has a workout defined, shows a prominent "Start Workout" button.
- If a workout session is already in progress for today (started but not completed), shows a "Resume Workout" button instead.
- Below the start button, shows a brief summary of the day's exercises (exercise names and muscle groups as a preview list).
- Navigation: access to Program Admin screen and Workout History.

### 6.2 Active Workout — Exercise View (Wizard Flow)

The core workout experience. One exercise is displayed at a time.

**Layout (top to bottom):**

1. **Header bar** — Exercise name, muscle group label, progress indicator (e.g., "Exercise 2 of 5").
2. **Last session card** — A compact, slightly dimmed card showing the most recent session's data for this same exercise. Displays each set's weight, reps, and RPE. If no prior session exists, shows "First time — no previous data." Includes a small "View History" link that opens a detail view of past sessions for this exercise.
3. **Current set logging area** — Shows which set the user is on (e.g., "Set 2 of 4"). Input fields for:
   - Weight (lbs) — numeric input
   - Reps — numeric input
   - RPE — button selector (7, 7.5, 8, 8.5, 9, 9.5, 10)
   - "Log Set" button to save and advance
4. **Timer area** — Persistent at the bottom of the screen. See Section 7 for timer behavior.
5. **Navigation controls** — "Skip Exercise" button (with optional reason prompt), "Previous Exercise" button, exercise list/reorder access.

**Behavior:**
- When the user taps "Log Set," the set data is saved, the set counter advances, and the rest timer starts automatically.
- After logging the last prescribed set, the app offers "Add Extra Set" or "Next Exercise."
- If the current exercise is flagged as a superset with the next exercise, completing the last set auto-advances immediately to the superset partner with no rest timer and no "Next Exercise" prompt.
- If the user skips an exercise, a modal/prompt allows entering an optional reason. The exercise is recorded as skipped.
- The user can navigate backward to review/edit previously logged exercises in the session.
- Pre-filling: Input fields for weight and reps are pre-filled with the values from the last session's corresponding set (if available), so the user only needs to adjust if progressing. RPE is never pre-filled (must be assessed fresh each set).

### 6.3 Workout Completion Screen

Displayed when the user finishes the last exercise or explicitly ends the workout.

**Layout:**
1. **Completion header** — "Workout Complete" with the date and total duration (started_at to now).
2. **Progress indicator** — Comparison against the most recent previous session for the same program day. For example: "Progressive load achieved on 3 of 5 exercises." An exercise counts as "progressed" if, on any set compared to the same set in the prior session: (a) the weight increased (regardless of rep count — reps will naturally drop when weight increases), or (b) the weight stayed the same and reps increased (even by 1).
3. **Summary grid** — A compact grid view resembling the paper sheet layout. Shows all exercises for the day with their logged sets (weight × reps @ RPE). Skipped exercises are visually distinct (greyed out with skip reason if provided). Partial exercises show only completed sets.
4. **"Done" button** — Returns to the home screen.

### 6.4 Workout History — Grid View

A read-only view for reviewing past workouts. Mimics the paper sheet's weekly grid layout.

**Behavior:**
- By default, shows the current week (or most recent completed week).
- Displays all days with their exercises and logged set data in a compact grid format similar to the paper sheet.
- Each day column shows: date, exercises, and set data (weight × reps).
- Navigate between weeks (previous/next).
- Tap on any exercise to see its full history (navigates to Exercise History view).

### 6.5 Exercise History View

Shows the complete history of a single exercise over time.

**Behavior:**
- Lists past sessions in reverse chronological order.
- Each entry shows: date, sets (weight × reps @ RPE), rest times, and any skip/partial notes.
- This is the "deeper history" accessible from the "View History" link on the Active Workout screen's last-session card.
- In v2, this screen will include progression charts (weight and reps over time).

### 6.6 Program Admin Screen

For editing the weekly workout program.

**Behavior:**
- Displays the 7-day week structure with exercises assigned to each day.
- For each day: toggle rest day on/off, add/remove exercises, reorder exercises (drag or move up/down), set target sets per exercise, override rest time per exercise.
- Exercise selection: pick from the exercise library or create a new exercise inline.
- Exercise library management: add new exercises, edit existing ones (name, muscle group, default rest time).
- Changes to the program do not retroactively affect past workout sessions.

---

## 7. Timer Behavior

The rest timer is a core UX element that replaces the user's current phone stopwatch.

### 7.1 Countdown Phase

- When the user logs a set (except the last set of an exercise), a countdown timer starts automatically.
- The countdown begins at the prescribed rest duration for the current exercise (typically 120 or 180 seconds).
- Display: large, prominent digits showing minutes:seconds remaining.
- Visual: the timer area is calm/neutral during countdown (e.g., a subtle background color).
- At zero: the phone vibrates and/or plays a brief tone. A visual indicator changes (e.g., background shifts color).

### 7.2 Stopwatch Phase (Overage)

- If the user does not start the next set when the countdown reaches zero, the timer flips to counting UP from 0:00, showing the overage duration.
- Display: same large digits, but now counting up. A clear visual indicator distinguishes overage from countdown (e.g., different color, a label like "+0:32 over").
- The overage continues until the user either logs the next set or dismisses the timer.

### 7.3 Rest Duration Recording

- When the user logs the next set, the total actual rest time (countdown + any overage) is recorded in the `rest_duration_seconds` field of the new set.
- The `rest_was_extended` flag is set to true if the actual rest exceeded the prescribed rest.
- This data is stored for context when reviewing history (e.g., "I did 12 reps but only because I rested 5 minutes").

### 7.4 Superset Behavior

- When an exercise has `superset_with_next = true`, completing the last set of that exercise immediately advances to the next exercise with NO rest timer.
- The app visually indicates the superset link (e.g., "→ Push Ups AMRAP" shown as the next step) so the user knows not to rest.
- Rest timing resumes normally after the superset partner exercise is completed.

### 7.5 Timer Controls

- The user can dismiss/pause the timer if needed (e.g., to skip an exercise or end the workout early).
- The timer does NOT start after the final set of an exercise (no rest needed before moving to next exercise), unless the exercise is part of a superset (in which case it auto-advances with no timer).

---

## 8. Seed Data

The initial program is seeded from the current paper workout sheet (week of Jan 25, 2026). The seed data represents the full weekly program and exercise library.

### Exercise Library (seed)

| Exercise Name | Muscle Group | Default Rest (sec) |
|---|---|---|
| Inverse Rows | lats | 120 |
| Pull Ups | lats | 120 |
| Renegade Rows | lats | 120 |
| Dumbbell Concentration Curls | biceps | 120 |
| Dumbbell Curls | biceps | 120 |
| Stairs | legs | 180 |
| Bench Press | pecs | 180 |
| Decline Bench Press | pecs | 180 |
| Cable Pull Downs | triceps | 120 |
| Cable Overhead Extension | triceps | 120 |
| Dumbbell Military Press | delts | 120 |
| Crazy 8's (front, side, push, pull) | delts | 120 |
| Push Ups AMRAP | pecs | 180 |

### Weekly Program (seed)

**Sunday** — Lats (Inverse Rows ×4), Biceps (DB Concentration Curls ×4), Legs (Stairs ×4)

**Monday** — Pecs (Bench Press ×4), Triceps (Cable Pull Downs ×4), Delts (DB Military Press ×4)

**Tuesday** — Lats (Pull Ups ×4), Biceps (DB Curls ×4), Legs (Stairs ×4)

**Wednesday** — Pecs (Decline Bench Press ×4), Triceps (Cable Pull Downs ×4), Delts (DB Military Press ×4)

**Thursday** — Lats (Renegade Rows ×4), Biceps (DB Curls ×4), Legs (Stairs ×4)

**Friday** — Pecs (Bench Press ×4 → superset → Push Ups AMRAP ×1), Triceps (Cable Overhead Extension ×4), Delts (Crazy 8's ×4)

**Saturday** — Rest Day

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite build), Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Deployment | Docker Compose on Synology NAS |
| Access | Mobile browser (Android Chrome), local network only |

---

## 10. API Endpoints (High-Level)

### Program & Exercises
- `GET /api/program/active` — Get the active program with all days and exercises
- `PUT /api/program/:id` — Update program structure
- `GET /api/exercises` — List all exercises
- `POST /api/exercises` — Create a new exercise
- `PUT /api/exercises/:id` — Update an exercise

### Workouts
- `POST /api/workouts` — Start a new workout session (pass program_day_id)
- `GET /api/workouts/current` — Get the in-progress session (if any)
- `PUT /api/workouts/:id/complete` — Mark a workout as completed
- `GET /api/workouts/history?week=YYYY-WW` — Get workout history for a given week

### Session Exercises
- `PUT /api/workouts/:id/exercises/:exerciseId/skip` — Mark an exercise as skipped (with optional reason)
- `PUT /api/workouts/:id/exercises/:exerciseId/reorder` — Change exercise order

### Sets
- `POST /api/workouts/:id/exercises/:exerciseId/sets` — Log a set
- `PUT /api/sets/:id` — Edit a logged set
- `DELETE /api/sets/:id` — Remove a logged set

### History & Progressive Load
- `GET /api/exercises/:id/last-session` — Get the most recent session data for an exercise
- `GET /api/exercises/:id/history` — Get full session history for an exercise

---

## 11. Key UX Principles

1. **Speed of input** — Logging a set should require minimal taps. Pre-fill weight/reps from last session. Large touch targets for all inputs.
2. **Focus** — Only show the current exercise during a workout. No distractions.
3. **Context** — Always show what you did last time, so progressive load decisions are immediate.
4. **Timer is ambient** — The timer should be visible but not obstructive. It's part of the background rhythm, not a modal that blocks interaction.
5. **Forgiveness** — Allow editing previously logged sets, skipping exercises, adding extra sets, and going back. Don't punish the user for changing plans mid-workout.
6. **Minimal chrome** — This is a tool used while sweaty and slightly out of breath. Big text, big buttons, high contrast, minimal navigation.

---

## 12. Future Scope (v2+)

- **Progression charts** — Line charts showing weight/reps/volume over time per exercise and per muscle group.
- **Workout frequency dashboard** — Calendar heatmap of workout consistency.
- **RPE trend analysis** — Track perceived effort over time to identify overtraining.
- **Volume calculations** — Total volume (weight × reps × sets) per session, per week, per muscle group.
- **Offline PWA support** — Service worker caching for offline workout logging with background sync.
- **Data export** — CSV/JSON export of workout history.
- **Program templates** — Save and switch between multiple programs.
- **Body measurements** — Optional tracking of weight, body fat %, measurements (previously on paper sheet but currently unused).
