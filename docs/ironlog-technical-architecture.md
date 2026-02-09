# IronLog — Technical Architecture Document

**Version:** 1.0
**Date:** February 8, 2026
**Companion docs:** ironlog-prd.md, ironlog-wireframes.html

---

## 1. System Overview

IronLog is a single-user workout tracking web application deployed as a Docker Compose stack on a Synology NAS. It consists of three containers: a React frontend served as static files via Nginx, a Node.js/Express API server, and a PostgreSQL database.

```
┌─────────────────────────────────────────────────┐
│  Synology NAS (Docker Compose)                  │
│                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Nginx   │  │  Node.js     │  │ PostgreSQL│ │
│  │  (React  │──│  Express API │──│  15       │ │
│  │  static) │  │  :3001       │  │  :5432    │ │
│  │  :3000   │  │              │  │           │ │
│  └──────────┘  └──────────────┘  └───────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
        ▲
        │ HTTP (local network)
        │
  ┌───────────┐
  │  Android   │
  │  Chrome    │
  └───────────┘
```

**No authentication.** Single user, local network only.

---

## 2. Project Structure

```
ironlog/
├── docker-compose.yml
├── .env
├── .env.example
├── README.md
│
├── client/                         # React frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── favicon.ico
│   │   └── manifest.json          # PWA manifest (home screen icon)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css               # Tailwind imports
│       │
│       ├── api/                    # API client functions
│       │   ├── client.js           # Base fetch wrapper
│       │   ├── workouts.js         # Workout session API calls
│       │   ├── exercises.js        # Exercise library API calls
│       │   ├── programs.js         # Program management API calls
│       │   └── sets.js             # Set logging API calls
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── BottomNav.jsx   # Bottom navigation bar
│       │   │   └── PageHeader.jsx  # Reusable page header
│       │   │
│       │   ├── workout/
│       │   │   ├── ExerciseView.jsx        # Main exercise logging screen
│       │   │   ├── SetInput.jsx            # Weight/reps/RPE input for a single set
│       │   │   ├── RpeSelector.jsx         # RPE button row (7–10, 0.5 steps)
│       │   │   ├── LastSessionCard.jsx     # Previous session data display
│       │   │   ├── SetList.jsx             # Completed/upcoming set rows
│       │   │   ├── RestTimer.jsx           # Countdown + stopwatch timer
│       │   │   ├── SupersetBanner.jsx      # Superset transition indicator
│       │   │   ├── SkipModal.jsx           # Skip exercise confirmation modal
│       │   │   └── WorkoutComplete.jsx     # Completion screen with progress
│       │   │
│       │   ├── home/
│       │   │   ├── HomeScreen.jsx          # Landing screen
│       │   │   ├── WorkoutPreview.jsx      # Today's exercise list preview
│       │   │   └── RestDayMessage.jsx      # Saturday rest day display
│       │   │
│       │   ├── history/
│       │   │   ├── WeeklyGrid.jsx          # Paper-sheet-style weekly grid
│       │   │   ├── ExerciseHistory.jsx     # Single exercise history over time
│       │   │   └── ProgressBadge.jsx       # Up/same/down indicator
│       │   │
│       │   └── program/
│       │       ├── ProgramAdmin.jsx        # Program editor main screen
│       │       ├── DayEditor.jsx           # Expandable day with exercise list
│       │       ├── ExerciseSlot.jsx        # Single exercise config in a day
│       │       └── ExerciseLibrary.jsx     # Exercise library CRUD
│       │
│       ├── hooks/
│       │   ├── useTimer.js                 # Countdown/stopwatch timer logic
│       │   ├── useWorkout.js               # Active workout state management
│       │   ├── useVibrate.js               # Vibration API wrapper
│       │   └── useWakeLock.js              # Screen wake lock during workout
│       │
│       ├── utils/
│       │   ├── progression.js              # Progressive load comparison logic
│       │   ├── formatters.js               # Weight/time/date formatting
│       │   └── constants.js                # RPE values, muscle group colors, etc.
│       │
│       └── pages/
│           ├── HomePage.jsx
│           ├── WorkoutPage.jsx
│           ├── HistoryPage.jsx
│           ├── ExerciseHistoryPage.jsx
│           └── ProgramPage.jsx
│
├── server/                          # Node.js Express API
│   ├── package.json
│   ├── src/
│   │   ├── index.js                 # Express app entry point
│   │   ├── config.js                # Environment config
│   │   │
│   │   ├── db/
│   │   │   ├── pool.js              # pg Pool setup
│   │   │   ├── migrate.js           # Migration runner
│   │   │   └── migrations/
│   │   │       ├── 001_initial_schema.sql
│   │   │       └── 002_seed_data.sql
│   │   │
│   │   ├── routes/
│   │   │   ├── programs.js          # GET/PUT /api/program/*
│   │   │   ├── exercises.js         # CRUD /api/exercises/*
│   │   │   ├── workouts.js          # Workout session routes
│   │   │   └── sets.js              # Set logging routes
│   │   │
│   │   ├── controllers/
│   │   │   ├── programController.js
│   │   │   ├── exerciseController.js
│   │   │   ├── workoutController.js
│   │   │   └── setController.js
│   │   │
│   │   └── middleware/
│   │       ├── errorHandler.js      # Global error handler
│   │       └── validate.js          # Request validation helpers
│   │
│   └── Dockerfile
│
├── client.Dockerfile                # Multi-stage: build React → serve via Nginx
│
└── db/
    └── init/                        # Mounted into Postgres container
        └── 00_extensions.sql        # uuid-ossp extension
```

---

## 3. Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-ironlog}
      POSTGRES_USER: ${POSTGRES_USER:-ironlog}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "127.0.0.1:5432:5432"    # Only accessible from NAS localhost
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ironlog}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgres://${POSTGRES_USER:-ironlog}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-ironlog}
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy

  client:
    build:
      context: .
      dockerfile: client.Dockerfile
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  pgdata:
```

### Environment Variables (.env)

```bash
POSTGRES_DB=ironlog
POSTGRES_USER=ironlog
POSTGRES_PASSWORD=<generate-a-strong-password>
```

### Server Dockerfile

```dockerfile
# server/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Client Dockerfile (Multi-stage)

```dockerfile
# client.Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Nginx Config

```nginx
# client/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://api:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 4. Database Schema

All tables use UUIDs as primary keys via the `uuid-ossp` extension. Timestamps are stored as `TIMESTAMPTZ`.

### 4.1 Extensions Init

```sql
-- db/init/00_extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 4.2 Schema Migration (001_initial_schema.sql)

```sql
-- Exercises library
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(50) NOT NULL,
    default_rest_seconds INTEGER NOT NULL DEFAULT 120,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_muscle_group ON exercises(muscle_group);

-- Programs
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active program at a time
CREATE UNIQUE INDEX idx_programs_active ON programs(is_active) WHERE is_active = true;

-- Program days
CREATE TABLE program_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    label VARCHAR(10) NOT NULL,
    is_rest_day BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id, day_of_week)
);

-- Program exercises (which exercises on which days)
CREATE TABLE program_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_day_id UUID NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    sort_order INTEGER NOT NULL,
    target_sets INTEGER NOT NULL DEFAULT 4,
    rest_seconds INTEGER,  -- NULL = use exercise default
    superset_with_next BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_day_id, sort_order)
);

-- Workout sessions
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_day_id UUID NOT NULL REFERENCES program_days(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_workout_sessions_started ON workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sessions_program_day ON workout_sessions(program_day_id, started_at DESC);

-- Session exercises (exercises within a workout)
CREATE TABLE session_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    program_exercise_id UUID NOT NULL REFERENCES program_exercises(id),
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    sort_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'skipped', 'partial')),
    skip_reason TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_session_exercises_workout ON session_exercises(workout_session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id, completed_at DESC);

-- Set logs (individual sets within an exercise)
CREATE TABLE set_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_exercise_id UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number >= 1),
    weight_lbs DECIMAL(6,1) NOT NULL,
    reps INTEGER NOT NULL CHECK (reps >= 0),
    rpe DECIMAL(3,1) NOT NULL CHECK (rpe >= 7.0 AND rpe <= 10.0),
    rest_duration_seconds INTEGER,   -- NULL for first set
    prescribed_rest_seconds INTEGER, -- The timer countdown value
    rest_was_extended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_exercise_id, set_number)
);

CREATE INDEX idx_set_logs_session_exercise ON set_logs(session_exercise_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.3 Seed Data (002_seed_data.sql)

```sql
-- Exercise library
INSERT INTO exercises (id, name, muscle_group, default_rest_seconds) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'Inverse Rows',                     'lats',    120),
    ('a0000001-0000-0000-0000-000000000002', 'Pull Ups',                          'lats',    120),
    ('a0000001-0000-0000-0000-000000000003', 'Renegade Rows',                     'lats',    120),
    ('a0000001-0000-0000-0000-000000000004', 'Dumbbell Concentration Curls',      'biceps',  120),
    ('a0000001-0000-0000-0000-000000000005', 'Dumbbell Curls',                    'biceps',  120),
    ('a0000001-0000-0000-0000-000000000006', 'Stairs',                            'legs',    180),
    ('a0000001-0000-0000-0000-000000000007', 'Bench Press',                       'pecs',    180),
    ('a0000001-0000-0000-0000-000000000008', 'Decline Bench Press',               'pecs',    180),
    ('a0000001-0000-0000-0000-000000000009', 'Cable Pull Downs',                  'triceps', 120),
    ('a0000001-0000-0000-0000-000000000010', 'Cable Overhead Extension',          'triceps', 120),
    ('a0000001-0000-0000-0000-000000000011', 'Dumbbell Military Press',           'delts',   120),
    ('a0000001-0000-0000-0000-000000000012', 'Crazy 8s (front, side, push, pull)','delts',   120),
    ('a0000001-0000-0000-0000-000000000013', 'Push Ups AMRAP',                    'pecs',    180);

-- Default program
INSERT INTO programs (id, name, is_active) VALUES
    ('b0000001-0000-0000-0000-000000000001', 'Default Program', true);

-- Program days
INSERT INTO program_days (id, program_id, day_of_week, label, is_rest_day) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 0, 'SUN', false),
    ('c0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 1, 'MON', false),
    ('c0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 2, 'TUE', false),
    ('c0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', 3, 'WED', false),
    ('c0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 4, 'THU', false),
    ('c0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000001', 5, 'FRI', false),
    ('c0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000001', 6, 'SAT', true);

-- SUNDAY: Inverse Rows (lats), DB Concentration Curls (biceps), Stairs (legs)
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 1, 4),
    ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 2, 4),
    ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 3, 4);

-- MONDAY: Bench Press (pecs), Cable Pull Downs (triceps), DB Military Press (delts)
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets) VALUES
    ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000007', 1, 4),
    ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000009', 2, 4),
    ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000011', 3, 4);

-- TUESDAY: Pull Ups (lats), DB Curls (biceps), Stairs (legs)
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets) VALUES
    ('c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 1, 4),
    ('c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005', 2, 4),
    ('c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000006', 3, 4);

-- WEDNESDAY: Decline Bench Press (pecs), Cable Pull Downs (triceps), DB Military Press (delts)
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets) VALUES
    ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000008', 1, 4),
    ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000009', 2, 4),
    ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000011', 3, 4);

-- THURSDAY: Renegade Rows (lats), DB Curls (biceps), Stairs (legs)
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets) VALUES
    ('c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000003', 1, 4),
    ('c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000005', 2, 4),
    ('c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000006', 3, 4);

-- FRIDAY: Bench Press (pecs) → superset → Push Ups AMRAP, Cable Overhead Extension (triceps), Crazy 8s (delts)
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets, superset_with_next) VALUES
    ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000007', 1, 4, true);
INSERT INTO program_exercises (program_day_id, exercise_id, sort_order, target_sets) VALUES
    ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000013', 2, 1),
    ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000010', 3, 4),
    ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000012', 4, 4);
```

---

## 5. API Specification

Base URL: `/api`

All responses follow the shape:
```json
// Success
{ "data": { ... } }

// Error
{ "error": { "message": "...", "code": "VALIDATION_ERROR" } }
```

### 5.1 Program & Exercises

#### GET /api/program/active

Returns the active program with all days and exercises, fully nested.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Default Program",
    "days": [
      {
        "id": "uuid",
        "day_of_week": 0,
        "label": "SUN",
        "is_rest_day": false,
        "exercises": [
          {
            "id": "uuid",
            "exercise_id": "uuid",
            "exercise_name": "Inverse Rows",
            "muscle_group": "lats",
            "sort_order": 1,
            "target_sets": 4,
            "rest_seconds": 120,
            "superset_with_next": false
          }
        ]
      }
    ]
  }
}
```

Note: `rest_seconds` in the response is the resolved value — if `program_exercises.rest_seconds` is NULL, it falls back to `exercises.default_rest_seconds`.

#### PUT /api/program/:id

Update program structure (days, exercises, ordering). Accepts the full program structure and replaces it (outside of active workout sessions).

**Request body:**
```json
{
  "name": "Default Program",
  "days": [
    {
      "day_of_week": 0,
      "label": "SUN",
      "is_rest_day": false,
      "exercises": [
        {
          "exercise_id": "uuid",
          "sort_order": 1,
          "target_sets": 4,
          "rest_seconds": null,
          "superset_with_next": false
        }
      ]
    }
  ]
}
```

#### GET /api/exercises

List all exercises in the library.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Inverse Rows",
      "muscle_group": "lats",
      "default_rest_seconds": 120,
      "notes": null
    }
  ]
}
```

#### POST /api/exercises

Create a new exercise.

**Request body:**
```json
{
  "name": "Barbell Rows",
  "muscle_group": "lats",
  "default_rest_seconds": 120,
  "notes": null
}
```

#### PUT /api/exercises/:id

Update an existing exercise.

### 5.2 Workouts

#### POST /api/workouts

Start a new workout session. The server resolves today's program day and creates session_exercises for each program_exercise.

**Request body:**
```json
{
  "program_day_id": "uuid"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "program_day_id": "uuid",
    "started_at": "2026-01-25T14:30:00Z",
    "exercises": [
      {
        "id": "uuid",
        "exercise_id": "uuid",
        "exercise_name": "Inverse Rows",
        "muscle_group": "lats",
        "sort_order": 1,
        "target_sets": 4,
        "rest_seconds": 120,
        "superset_with_next": false,
        "status": "pending",
        "sets": [],
        "last_session": {
          "date": "2026-01-22T15:00:00Z",
          "sets": [
            { "set_number": 1, "weight_lbs": 95, "reps": 8, "rpe": 7.0, "rest_duration_seconds": null },
            { "set_number": 2, "weight_lbs": 95, "reps": 8, "rpe": 7.5, "rest_duration_seconds": 120 },
            { "set_number": 3, "weight_lbs": 95, "reps": 7, "rpe": 8.0, "rest_duration_seconds": 122 },
            { "set_number": 4, "weight_lbs": 95, "reps": 6, "rpe": 9.0, "rest_duration_seconds": 118 }
          ]
        }
      }
    ]
  }
}
```

The `last_session` field is populated by querying the most recent `session_exercises` row for the same `exercise_id` with status 'completed' or 'partial', ordered by `completed_at DESC`.

#### GET /api/workouts/current

Returns the in-progress workout session (if any). Same shape as POST response.

**Response:** Same as POST /api/workouts, or `{ "data": null }` if no active session.

#### PUT /api/workouts/:id/complete

Mark a workout as completed. The server sets `completed_at` and updates any remaining 'pending' session_exercises to 'skipped'.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "started_at": "2026-01-25T14:30:00Z",
    "completed_at": "2026-01-25T15:12:00Z",
    "duration_minutes": 42,
    "exercises": [ ... ],
    "progression": {
      "total_exercises": 3,
      "progressed": 2,
      "same": 1,
      "regressed": 0,
      "skipped": 0,
      "details": [
        {
          "exercise_name": "Inverse Rows",
          "status": "progressed",
          "reason": "higher_reps"
        },
        {
          "exercise_name": "DB Concentration Curls",
          "status": "same"
        },
        {
          "exercise_name": "Stairs",
          "status": "progressed",
          "reason": "higher_reps"
        }
      ]
    }
  }
}
```

**Progression logic (server-side):**

For each exercise, compare this session's sets against the most recent prior session for the same exercise:

1. If any set has a higher weight than the corresponding set in the prior session → `"progressed"` (reason: `"higher_weight"`)
2. Else if any set has the same weight and higher reps → `"progressed"` (reason: `"higher_reps"`)
3. Else if all sets have the same weight and same reps → `"same"`
4. Else → `"regressed"`

If there is no prior session → `"first_time"` (counts as progressed for display).

#### GET /api/workouts/history

Returns completed workouts for a given week.

**Query params:** `week` (ISO week string, e.g., `2026-W04`) or `date` (any date in the target week, e.g., `2026-01-25`)

**Response:**
```json
{
  "data": {
    "week_start": "2026-01-25",
    "week_end": "2026-01-31",
    "workouts": [
      {
        "id": "uuid",
        "day_of_week": 0,
        "date": "2026-01-25",
        "exercises": [
          {
            "exercise_name": "Inverse Rows",
            "muscle_group": "lats",
            "status": "completed",
            "sets": [
              { "set_number": 1, "weight_lbs": 95, "reps": 9, "rpe": 7.0 }
            ]
          }
        ]
      }
    ]
  }
}
```

### 5.3 Session Exercises

#### PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/start

Mark an exercise as started (sets `started_at`).

#### PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/skip

Mark an exercise as skipped.

**Request body:**
```json
{
  "reason": "shoulder pain"
}
```

#### PUT /api/workouts/:workoutId/exercises/:sessionExerciseId/complete

Mark an exercise as completed (or partial if fewer sets than target).

### 5.4 Sets

#### POST /api/workouts/:workoutId/exercises/:sessionExerciseId/sets

Log a new set.

**Request body:**
```json
{
  "set_number": 2,
  "weight_lbs": 95.0,
  "reps": 8,
  "rpe": 7.5,
  "rest_duration_seconds": 125,
  "prescribed_rest_seconds": 120
}
```

`rest_was_extended` is computed server-side: `rest_duration_seconds > prescribed_rest_seconds`.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "set_number": 2,
    "weight_lbs": 95.0,
    "reps": 8,
    "rpe": 7.5,
    "rest_duration_seconds": 125,
    "prescribed_rest_seconds": 120,
    "rest_was_extended": true,
    "created_at": "2026-01-25T14:35:22Z"
  }
}
```

#### PUT /api/sets/:id

Edit a previously logged set (e.g., fix a typo).

**Request body:** Same fields as POST (partial update — only include fields to change).

#### DELETE /api/sets/:id

Delete a logged set.

### 5.5 Exercise History

#### GET /api/exercises/:id/last-session

Returns the most recent completed session data for a given exercise.

**Response:**
```json
{
  "data": {
    "date": "2026-01-22T15:00:00Z",
    "workout_session_id": "uuid",
    "sets": [
      { "set_number": 1, "weight_lbs": 95, "reps": 8, "rpe": 7.0, "rest_duration_seconds": null, "rest_was_extended": false },
      { "set_number": 2, "weight_lbs": 95, "reps": 8, "rpe": 7.5, "rest_duration_seconds": 120, "rest_was_extended": false }
    ]
  }
}
```

#### GET /api/exercises/:id/history

Full history for an exercise, paginated.

**Query params:** `limit` (default 10), `offset` (default 0)

**Response:**
```json
{
  "data": {
    "exercise": {
      "id": "uuid",
      "name": "Inverse Rows",
      "muscle_group": "lats"
    },
    "sessions": [
      {
        "date": "2026-01-25T14:30:00Z",
        "progression_status": "progressed",
        "sets": [ ... ]
      }
    ],
    "total": 24,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 6. Key Implementation Details

### 6.1 Timer Logic (useTimer hook)

The timer is entirely client-side. The hook manages:

```
State: {
  mode: 'idle' | 'countdown' | 'overage',
  prescribedSeconds: number,
  remainingSeconds: number,      // countdown: decrements; overage: increments
  totalElapsedSeconds: number,   // actual rest time = prescribed - remaining (or prescribed + overage)
}

Actions:
  start(prescribedSeconds)  → sets mode to 'countdown', begins interval
  tick()                    → decrements remaining; if 0, switch to 'overage' mode, vibrate
  dismiss()                 → stops timer, returns totalElapsedSeconds
  reset()                   → returns to 'idle'
```

When the user logs the next set, the component calls `dismiss()` to get `totalElapsedSeconds`, which is sent as `rest_duration_seconds` in the set log POST request.

### 6.2 Wake Lock

During an active workout, the app requests a screen wake lock via the Screen Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent the phone from sleeping between sets. Released when the workout is completed or the user leaves the workout screen.

### 6.3 Vibration

When the countdown timer hits zero, the app triggers `navigator.vibrate([200, 100, 200])` (vibrate-pause-vibrate pattern). This works on Android Chrome without any permissions.

### 6.4 Progressive Load Comparison

The `progression.js` utility implements the comparison logic:

```javascript
/**
 * Compare two sessions for the same exercise.
 * @param {Array} currentSets - [{set_number, weight_lbs, reps}, ...]
 * @param {Array} previousSets - [{set_number, weight_lbs, reps}, ...]
 * @returns {{ status: 'progressed'|'same'|'regressed'|'first_time', reason?: string }}
 */
function compareProgression(currentSets, previousSets) {
  if (!previousSets || previousSets.length === 0) {
    return { status: 'first_time' };
  }

  let hasHigherWeight = false;
  let hasHigherReps = false;
  let hasLowerPerformance = false;

  for (const current of currentSets) {
    const previous = previousSets.find(s => s.set_number === current.set_number);
    if (!previous) continue;

    if (current.weight_lbs > previous.weight_lbs) {
      hasHigherWeight = true;
    } else if (current.weight_lbs === previous.weight_lbs) {
      if (current.reps > previous.reps) {
        hasHigherReps = true;
      } else if (current.reps < previous.reps) {
        hasLowerPerformance = true;
      }
    } else {
      hasLowerPerformance = true;
    }
  }

  if (hasHigherWeight) return { status: 'progressed', reason: 'higher_weight' };
  if (hasHigherReps) return { status: 'progressed', reason: 'higher_reps' };
  if (!hasLowerPerformance) return { status: 'same' };
  return { status: 'regressed' };
}
```

### 6.5 Pre-filling Set Inputs

When the exercise view loads, the frontend pre-fills weight and reps from the last session's corresponding set number. RPE is never pre-filled.

```
Set N input defaults:
  weight = lastSession.sets[N-1].weight_lbs  (or empty if no prior set)
  reps   = lastSession.sets[N-1].reps        (or empty if no prior set)
  rpe    = null                               (always fresh)
```

### 6.6 Starting a Workout

When the user taps "Start Workout":

1. Frontend calls `GET /api/program/active` to get today's program day.
2. Frontend calls `POST /api/workouts` with the program_day_id.
3. Server creates the `workout_sessions` row and `session_exercises` rows for each program exercise.
4. Server queries `last_session` data for each exercise and includes it in the response.
5. Frontend navigates to the exercise view, starting with the first exercise (sort_order = 1).

### 6.7 Completing a Workout

When the user finishes the last exercise (or taps an "End Workout" button):

1. Frontend calls `PUT /api/workouts/:id/complete`.
2. Server sets `completed_at`, marks remaining pending exercises as skipped.
3. Server computes progression comparison for each completed exercise.
4. Frontend displays the completion screen with the progression summary.

### 6.8 Routing

Client-side routing via React Router:

| Path | Screen | Description |
|---|---|---|
| `/` | HomePage | Home screen (workout day / rest day / resume) |
| `/workout/:id` | WorkoutPage | Active workout wizard flow |
| `/history` | HistoryPage | Weekly grid view |
| `/history/exercise/:id` | ExerciseHistoryPage | Single exercise history |
| `/program` | ProgramPage | Program admin |

---

## 7. Error Handling

### 7.1 API Error Responses

All API errors return consistent JSON:

```json
{
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE"
  }
}
```

Standard error codes:

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid request body or params |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate workout session for today, etc. |
| `SERVER_ERROR` | 500 | Unexpected server error |

### 7.2 Frontend Error Handling

- API errors are caught in the `api/client.js` fetch wrapper and surfaced as toast notifications.
- Network errors show a "Connection lost — check your network" banner.
- The active workout state is preserved in React state; if the user accidentally navigates away, the "Resume Workout" flow on the home screen recovers the session from the server.

---

## 8. Performance Considerations

- **Last session query:** The most frequent query is fetching the last session for an exercise. The index on `session_exercises(exercise_id, completed_at DESC)` makes this fast.
- **Workout history:** The weekly grid query joins across workout_sessions → session_exercises → set_logs for a date range. With a single user doing ~6 workouts per week, the data volume is trivial for Postgres — no optimization needed for years.
- **Frontend bundle:** Keep the React app small. No heavy charting libraries in v1. The bundle should be under 200KB gzipped.

---

## 9. Deployment on Synology

### 9.1 Prerequisites

- Docker and Docker Compose installed on the Synology NAS (available via Package Center).
- A shared folder for the project files (e.g., `/volume1/docker/ironlog/`).

### 9.2 Deployment Steps

```bash
# SSH into Synology or use Task Scheduler
cd /volume1/docker/ironlog

# Copy .env.example to .env and set POSTGRES_PASSWORD
cp .env.example .env
nano .env

# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f

# App accessible at http://<synology-ip>:3000
```

### 9.3 Backups

The PostgreSQL data is stored in the `pgdata` Docker volume. Back up with:

```bash
docker-compose exec db pg_dump -U ironlog ironlog > backup_$(date +%Y%m%d).sql
```

Schedule this via Synology Task Scheduler for weekly or daily backups.

### 9.4 Updates

```bash
cd /volume1/docker/ironlog
git pull  # or copy updated files
docker-compose up -d --build
```

The database persists across rebuilds via the Docker volume.

---

## 10. Migration Strategy

The server runs migrations on startup. The `migrate.js` script:

1. Creates a `migrations` tracking table if it doesn't exist.
2. Reads all `.sql` files from `db/migrations/` in alphabetical order.
3. Runs any that haven't been applied yet, within a transaction.
4. Records each applied migration.

This ensures the database schema is always up to date when the API container starts.
