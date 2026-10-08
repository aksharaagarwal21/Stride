// Date-only helpers. Project and task dates are calendar days ("YYYY-MM-DD"), not instants.
// Parsing them with `new Date('2026-10-08')` yields UTC midnight, which renders as the previous
// day west of UTC — so these helpers work on the string parts and never on local Date parsing.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DateParts = { year: number; month: number; day: number };

export function parseDateOnly(value: string): DateParts | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2999 || month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this month; UTC avoids DST effects.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today's calendar date in the device's local time zone. */
export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Date-only string → UTC-midnight Date, the representation stored in PostgreSQL `date` columns. */
export function dateOnlyToUtcDate(value: string): Date {
  const parts = parseDateOnly(value);
  if (!parts) throw new RangeError(`Invalid date-only value: ${value}`);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

/** UTC-midnight Date (from a `date` column) → "YYYY-MM-DD". */
export function utcDateToDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Adds whole days to a date-only string. */
export function addDays(value: string, days: number): string {
  const date = dateOnlyToUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToDateOnly(date);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const ms = dateOnlyToUtcDate(to).getTime() - dateOnlyToUtcDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** "2026-10-08" → "Oct 8, 2026". Built by hand so it renders identically on web and Hermes. */
export function formatDate(value: string): string {
  const parts = parseDateOnly(value);
  if (!parts) return value;
  return `${MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

/** "2026-10-08" → "Oct 8" — for dense rows where the year is implied. */
export function formatShortDate(value: string, today?: string): string {
  const parts = parseDateOnly(value);
  if (!parts) return value;
  const sameYear = today ? parseDateOnly(today)?.year === parts.year : true;
  return sameYear ? `${MONTHS[parts.month - 1]} ${parts.day}` : formatDate(value);
}

/** Human description of a due date relative to today: "Today", "Tomorrow", "3 days overdue"… */
export function describeDue(dueDate: string, today: string): string {
  const diff = daysBetween(today, dueDate);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return '1 day overdue';
  if (diff < 0) return `${-diff} days overdue`;
  if (diff < 7) return `Due in ${diff} days`;
  return `Due ${formatShortDate(dueDate, today)}`;
}

/** ISO timestamp → "Oct 8, 2026" in the viewer's local time zone. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
