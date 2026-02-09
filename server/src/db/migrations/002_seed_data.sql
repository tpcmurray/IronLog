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
