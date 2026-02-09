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
