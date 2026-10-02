// Sanity checks for values read from an AC screenshot.
import { daysInMonth } from './dates';

export type Extracted = {
  year: number;
  month: number;
  days: { day: number; kwh: number | null }[];
  notes: string;
};

export type Warning = { day?: number; message: string };

/** Sanity checks shown before the user confirms. */
export function checkExtracted(
  data: Extracted,
  recent: number[],
  now = new Date(),
): Warning[] {
  const w: Warning[] = [];
  const { year, month } = data;
  if (month < 1 || month > 12) w.push({ message: `เดือนไม่ถูกต้อง (${month})` });
  const shown = new Date(year, month - 1, 1);
  const monthsAgo = (now.getFullYear() - year) * 12 + now.getMonth() - (month - 1);
  if (shown > now) w.push({ message: 'เดือนในภาพอยู่ในอนาคต' });
  else if (monthsAgo > 12) w.push({ message: 'ภาพนี้เก่ากว่า 1 ปี' });

  const maxDay = month >= 1 && month <= 12 ? daysInMonth(year, month) : 31;
  const sorted = [...recent].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const seen = new Set<number>();
  for (const d of data.days) {
    if (d.day < 1 || d.day > maxDay) w.push({ day: d.day, message: `ไม่มีวันที่ ${d.day} ในเดือนนี้` });
    if (seen.has(d.day)) w.push({ day: d.day, message: `วันที่ ${d.day} ซ้ำ` });
    seen.add(d.day);
    if (d.kwh == null) continue;
    if (d.kwh < 0) w.push({ day: d.day, message: `วันที่ ${d.day} ติดลบ` });
    else if (d.kwh > 30) w.push({ day: d.day, message: `วันที่ ${d.day} สูงผิดปกติ (${d.kwh} kWh)` });
    else if (median && median > 0.5 && d.kwh > median * 3)
      w.push({ day: d.day, message: `วันที่ ${d.day} สูงกว่าปกติ 3 เท่า (${d.kwh} kWh)` });
  }
  return w;
}
