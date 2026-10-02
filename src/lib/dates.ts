// Date helpers. All dates are local calendar dates stored as 'YYYY-MM-DD'.

export const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toISODateTime(d: Date): string {
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function parseISODateTime(s: string): Date {
  const date = parseISODate(s);
  const time = s.slice(11, 16);
  if (time) {
    const [h, min] = time.split(':').map(Number);
    date.setHours(h, min);
  }
  return date;
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86400000);
}

/** Inclusive list of dates from start to end. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

/** 22/09/2569 (Buddhist era). */
export function formatThaiDate(s: string): string {
  const d = parseISODate(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543}`;
}

/** 22 ก.ย. 69 */
export function formatThaiShort(s: string): string {
  const d = parseISODate(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`;
}

/** ก.ย. 2569 from 'YYYY-MM' */
export function formatThaiMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function formatTime(s: string): string {
  return s.slice(11, 16);
}

/**
 * Billing cycle that contains `date`. A cycle ends on the meter reading
 * day (`endDay`, e.g. 22) and starts the day after the previous one.
 */
export function cycleFor(date: string, endDay: number): { start: string; end: string } {
  const d = parseISODate(date);
  let y = d.getFullYear();
  let m = d.getMonth() + 1;
  if (d.getDate() > clampDay(y, m, endDay)) {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  const end = `${y}-${pad(m)}-${pad(clampDay(y, m, endDay))}`;
  let py = y;
  let pm = m - 1;
  if (pm < 1) { pm = 12; py -= 1; }
  const start = addDays(`${py}-${pad(pm)}-${pad(clampDay(py, pm, endDay))}`, 1);
  return { start, end };
}

function clampDay(y: number, m: number, day: number): number {
  return Math.min(day, daysInMonth(y, m));
}
