// Turns main-meter readings into per-day house usage.
import { addDays, dateRange } from './dates';

/** source 'mea' = the official reading printed on the electricity bill. */
export type MeterReading = { id: number; readAt: string; value: number; source?: 'me' | 'mea' };

export type DayUsage = {
  date: string;
  kwh: number;
  /** True when a gap between readings was spread evenly over several days. */
  estimated: boolean;
};

/**
 * Usage between two consecutive readings belongs to the days after the
 * previous reading's date up to the current reading's date. A one-day gap
 * is exact; a longer gap is spread evenly and marked estimated. Several
 * readings on the same day add up on that day.
 */
export function dailyHouseUsage(readings: MeterReading[]): Map<string, DayUsage> {
  const sorted = [...readings].sort((a, b) => a.readAt.localeCompare(b.readAt));
  const out = new Map<string, DayUsage>();
  const add = (date: string, kwh: number, estimated: boolean) => {
    const cur = out.get(date);
    out.set(date, {
      date,
      kwh: (cur?.kwh ?? 0) + kwh,
      estimated: (cur?.estimated ?? false) || estimated,
    });
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const diff = cur.value - prev.value;
    const prevDate = prev.readAt.slice(0, 10);
    const curDate = cur.readAt.slice(0, 10);
    if (prevDate === curDate) {
      add(curDate, diff, false);
      continue;
    }
    const days = dateRange(addDays(prevDate, 1), curDate);
    const share = diff / days.length;
    for (const d of days) add(d, share, days.length > 1);
  }
  return out;
}

/** Sum usage over [start, end]; returns kWh and how many days had data. */
export function sumUsage(
  usage: Map<string, { kwh: number }>,
  start: string,
  end: string,
): { kwh: number; days: number } {
  let kwh = 0;
  let days = 0;
  for (const d of dateRange(start, end)) {
    const u = usage.get(d);
    if (u) {
      kwh += u.kwh;
      days += 1;
    }
  }
  return { kwh, days };
}
