import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateOnlyToUtcDate,
  daysBetween,
  describeDue,
  formatDate,
  formatShortDate,
  formatTimestamp,
  isValidDateOnly,
  utcDateToDateOnly,
} from './dates';
import {
  emailSchema,
  newPasswordSchema,
  projectCreateSchema,
  projectUpdateSchema,
  taskUpdateSchema,
  utf8ByteLength,
} from './schemas';
import { toQueryString } from './api-client';

describe('date-only helpers', () => {
  it('accepts real calendar dates only', () => {
    expect(isValidDateOnly('2028-02-29')).toBe(true);
    expect(isValidDateOnly('2026-02-29')).toBe(false);
    expect(isValidDateOnly('2026-04-31')).toBe(false);
    expect(isValidDateOnly('2026-4-1')).toBe(false);
    expect(isValidDateOnly('2026-10-08T00:00:00Z')).toBe(false);
  });

  it('round-trips through UTC without shifting a day', () => {
    expect(utcDateToDateOnly(dateOnlyToUtcDate('2026-01-01'))).toBe('2026-01-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(formatDate('2026-10-08')).toBe('Oct 8, 2026');
  });

  it('describes due dates relative to today', () => {
    expect(describeDue('2026-10-08', '2026-10-08')).toBe('Due today');
    expect(describeDue('2026-10-09', '2026-10-08')).toBe('Due tomorrow');
    expect(describeDue('2026-10-05', '2026-10-08')).toBe('3 days overdue');
  });

  it('switches from "Due in N days" to a date one week out', () => {
    expect(describeDue('2026-10-07', '2026-10-08')).toBe('1 day overdue');
    expect(describeDue('2026-10-14', '2026-10-08')).toBe('Due in 6 days');
    expect(describeDue('2026-10-15', '2026-10-08')).toBe('Due Oct 15');
    expect(describeDue('2027-01-05', '2026-10-08')).toBe('Due Jan 5, 2027');
  });

  it('counts days across leap days and year ends', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2026-12-01')).toBe(-30);
    expect(isValidDateOnly('1899-12-31')).toBe(false);
    expect(isValidDateOnly('3000-01-01')).toBe(false);
  });

  it('shows the year only when it differs and leaves bad input readable', () => {
    expect(formatShortDate('2026-10-08', '2026-01-01')).toBe('Oct 8');
    expect(formatShortDate('2027-10-08', '2026-01-01')).toBe('Oct 8, 2027');
    expect(formatShortDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('2026-02-30')).toBe('2026-02-30');
    expect(formatTimestamp('2026-10-08T12:00:00Z')).toBe('Oct 8, 2026');
    expect(formatTimestamp('yesterday')).toBe('yesterday');
  });

  it('refuses to convert an invalid date to a Date', () => {
    expect(() => dateOnlyToUtcDate('2026-13-01')).toThrow(RangeError);
  });
});

describe('schemas', () => {
  it('normalises email', () => {
    expect(emailSchema.parse('  Ava@Example.COM ')).toBe('ava@example.com');
    expect(emailSchema.safeParse('nope').success).toBe(false);
  });

  it('measures password length in UTF-8 bytes', () => {
    expect(utf8ByteLength('é')).toBe(2);
    expect(newPasswordSchema.safeParse('a'.repeat(72)).success).toBe(true);
    expect(newPasswordSchema.safeParse('a'.repeat(73)).success).toBe(false);
  });

  it('rejects reversed project dates and unknown keys', () => {
    const base = { name: 'P', startDate: '2026-10-10', endDate: '2026-10-01' };
    expect(projectCreateSchema.safeParse(base).success).toBe(false);
    expect(
      projectCreateSchema.safeParse({ ...base, endDate: '2026-10-10', ownerId: 'x' }).success,
    ).toBe(false);
  });

  it('does not inject defaults into partial updates', () => {
    expect(projectUpdateSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
    expect(taskUpdateSchema.parse({ status: 'COMPLETED' })).toEqual({ status: 'COMPLETED' });
    expect(taskUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('toQueryString', () => {
  it('skips empty values and encodes the rest', () => {
    expect(toQueryString({ search: 'a&b', status: undefined, page: 2, empty: '' })).toBe(
      '?search=a%26b&page=2',
    );
    expect(toQueryString({})).toBe('');
  });
});
