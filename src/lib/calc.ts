// Ties stored data to the pricing engine: per-day kWh per category and
// baht for any date range.
import * as db from './db';
import { cycleFor, daysBetween, dateRange, today, addDays } from './dates';
import { dailyHouseUsage, sumUsage, type DayUsage } from './usage';
import { basisFromTariff, houseBill, priceShare, type CycleBasis, type HouseBill, type Share } from './tariff';

export type Category = 'house' | 'ac1' | 'ac2' | 'rest';

export const CATEGORY_LABEL: Record<Category, string> = {
  house: 'ทั้งบ้าน',
  ac1: 'แอร์ของฉัน',
  ac2: 'แอร์พี่ชาย',
  rest: 'ส่วนอื่นของบ้าน',
};

export type Dataset = {
  house: Map<string, DayUsage>;
  ac: Record<db.AcId, Map<string, number>>;
  bills: db.Bill[];
  settings: db.Settings;
  firstDate: string | null;
};

export async function loadDataset(): Promise<Dataset> {
  const [readings, acDays, bills, settings] = await Promise.all([
    db.listReadings(),
    db.listAcDays(),
    db.listBills(),
    db.getSettings(),
  ]);
  const ac: Dataset['ac'] = { 1: new Map(), 2: new Map() };
  for (const d of acDays) ac[d.ac].set(d.date, d.kwh);
  const house = dailyHouseUsage(readings);
  const dates = [...house.keys(), ...ac[1].keys(), ...ac[2].keys()].sort();
  return { house, ac, bills, settings, firstDate: dates[0] ?? null };
}

/** kWh for one category on one day, or null when there is no data. */
export function kwhOn(ds: Dataset, cat: Category, date: string): number | null {
  const house = ds.house.get(date)?.kwh;
  const a1 = ds.ac[1].get(date);
  const a2 = ds.ac[2].get(date);
  switch (cat) {
    case 'house': return house ?? null;
    case 'ac1': return a1 ?? null;
    case 'ac2': return a2 ?? null;
    case 'rest': return house == null ? null : house - (a1 ?? 0) - (a2 ?? 0);
  }
}

/** A real bill whose reading date is within 3 days of the cycle end. */
export function billForCycle(ds: Dataset, end: string): db.Bill | undefined {
  return ds.bills.find((b) => Math.abs(daysBetween(b.periodEnd, end)) <= 3);
}

/**
 * How a cycle's charges are shared out. Uses the real bill when entered,
 * otherwise house kWh from the meter (projected to the full cycle when
 * days are missing). Returns null when there is nothing to base it on.
 */
export function cycleBasis(ds: Dataset, start: string, end: string): CycleBasis | null {
  const t = ds.settings.tariff;
  const bill = billForCycle(ds, end);
  if (bill) {
    return {
      start, end,
      houseKwh: bill.kwh,
      energy: bill.energy,
      ftRate: bill.ftRate,
      service: bill.service,
      vatRate: t.vatRate,
      source: 'bill',
    };
  }
  const cycleDays = daysBetween(start, end) + 1;
  const { kwh, days } = sumUsage(ds.house, start, end);
  if (days > 0 && kwh > 0) {
    if (days >= cycleDays) return basisFromTariff(start, end, kwh, t, 'meter');
    return basisFromTariff(start, end, (kwh / days) * cycleDays, t, 'projected');
  }
  // No meter data for this cycle: fall back to the latest real bill's kWh.
  const latest = ds.bills[0];
  if (latest) return basisFromTariff(start, end, latest.kwh, t, 'projected');
  return null;
}

/** Itemised cost of a category over [start, end], split by billing cycle. */
export function priceRange(ds: Dataset, cat: Category, start: string, end: string): Share | null {
  const segments: { kwh: number; basis: CycleBasis }[] = [];
  let d = start;
  while (d <= end) {
    const c = cycleFor(d, ds.settings.cycleEndDay);
    const segEnd = c.end < end ? c.end : end;
    let kwh = 0;
    for (const day of dateRange(d, segEnd)) kwh += kwhOn(ds, cat, day) ?? 0;
    if (kwh > 0) {
      const basis = cycleBasis(ds, c.start, c.end);
      if (!basis) return null;
      segments.push({ kwh, basis });
    }
    d = addDays(segEnd, 1);
  }
  return priceShare(segments);
}

export type CycleEstimate = {
  start: string;
  end: string;
  daysElapsed: number;
  daysTotal: number;
  daysWithData: number;
  kwhSoFar: number;
  projectedKwh: number;
  bill: HouseBill;
};

/** Running estimate for the billing cycle that contains `date`. */
export function cycleEstimate(ds: Dataset, date = today()): CycleEstimate | null {
  const { start, end } = cycleFor(date, ds.settings.cycleEndDay);
  const daysTotal = daysBetween(start, end) + 1;
  const upTo = date < end ? date : end;
  const daysElapsed = daysBetween(start, upTo) + 1;
  const { kwh, days } = sumUsage(ds.house, start, upTo);
  if (days === 0) return null;
  const projectedKwh = (kwh / days) * daysTotal;
  return {
    start, end, daysElapsed, daysTotal,
    daysWithData: days,
    kwhSoFar: kwh,
    projectedKwh,
    bill: houseBill(projectedKwh, ds.settings.tariff),
  };
}
