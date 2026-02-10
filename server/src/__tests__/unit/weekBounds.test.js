const { getWeekBounds, isoWeekToDate } = require('../../controllers/workoutController');

describe('getWeekBounds', () => {
  it('returns Sunday–Saturday for a Sunday input', () => {
    const { start, end } = getWeekBounds(new Date('2026-01-25T12:00:00Z'));
    expect(start.toISOString().slice(0, 10)).toBe('2026-01-25');
    expect(end.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('returns Sunday–Saturday for a mid-week input', () => {
    const { start, end } = getWeekBounds(new Date('2026-01-28T12:00:00Z'));
    expect(start.toISOString().slice(0, 10)).toBe('2026-01-25');
    expect(end.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('returns Sunday–Saturday for a Saturday input', () => {
    const { start, end } = getWeekBounds(new Date('2026-01-31T12:00:00Z'));
    expect(start.toISOString().slice(0, 10)).toBe('2026-01-25');
    expect(end.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('handles year boundary correctly', () => {
    // Dec 31, 2025 is a Wednesday
    const { start, end } = getWeekBounds(new Date('2025-12-31T12:00:00Z'));
    expect(start.toISOString().slice(0, 10)).toBe('2025-12-28');
    expect(end.toISOString().slice(0, 10)).toBe('2026-01-03');
  });

  it('start is at 00:00:00.000 and end is at 23:59:59.999', () => {
    const { start, end } = getWeekBounds(new Date('2026-01-28T12:00:00Z'));
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
    expect(end.getUTCSeconds()).toBe(59);
  });
});

describe('isoWeekToDate', () => {
  it('parses a valid ISO week string', () => {
    const d = isoWeekToDate('2026-W04');
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString().slice(0, 10)).toBe('2026-01-19');
  });

  it('parses week 1', () => {
    const d = isoWeekToDate('2026-W01');
    expect(d).toBeInstanceOf(Date);
    // 2026-W01 Monday should be Dec 29, 2025
    expect(d.toISOString().slice(0, 10)).toBe('2025-12-29');
  });

  it('parses week 52', () => {
    const d = isoWeekToDate('2026-W52');
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString().slice(0, 10)).toBe('2026-12-21');
  });

  it('returns null for invalid format', () => {
    expect(isoWeekToDate('bad')).toBeNull();
    expect(isoWeekToDate('2026-04')).toBeNull();
    expect(isoWeekToDate('')).toBeNull();
  });
});
