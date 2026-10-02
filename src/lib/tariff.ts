// Pricing engine modelled on the MEA (การไฟฟ้านครหลวง) residential bill.
//
// Calibrated against the 09/69 bill, type 1.2, 454 kWh:
//   energy  200 × 3.0000 + 200 × 4.1584 + 54 × 4.3583 = 1,667.03
//   Ft      454 × 0.1623                              =    73.68
//   service                                           =    24.62
//   VAT 7%  of 1,765.33                               =   123.57
//   total                                             = 1,888.90

export type Tier = { upTo: number | null; rate: number };

export type Tariff = {
  tiers: Tier[];
  ftRate: number;
  serviceCharge: number;
  vatRate: number;
};

export const DEFAULT_TARIFF: Tariff = {
  tiers: [
    { upTo: 200, rate: 3.0 },
    { upTo: 400, rate: 4.1584 },
    { upTo: null, rate: 4.3583 },
  ],
  ftRate: 0.1623,
  serviceCharge: 24.62,
  vatRate: 0.07,
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function energyCharge(kwh: number, tiers: Tier[]): number {
  let total = 0;
  let from = 0;
  for (const t of tiers) {
    const top = t.upTo ?? Infinity;
    if (kwh <= from) break;
    const units = Math.min(kwh, top) - from;
    total += units * t.rate;
    from = top;
  }
  return round2(total);
}

export type HouseBill = {
  kwh: number;
  energy: number;
  ft: number;
  service: number;
  subtotal: number;
  vat: number;
  total: number;
};

/** What MEA would bill for `kwh` in one cycle. */
export function houseBill(kwh: number, t: Tariff): HouseBill {
  const energy = energyCharge(kwh, t.tiers);
  const ft = round2(kwh * t.ftRate);
  const service = t.serviceCharge;
  const subtotal = round2(energy + ft + service);
  const vat = round2(subtotal * t.vatRate);
  return { kwh, energy, ft, service, subtotal, vat, total: round2(subtotal + vat) };
}

/**
 * The basis for sharing one billing cycle: total house kWh and charges,
 * either from a real bill or estimated from meter readings.
 */
export type CycleBasis = {
  start: string;
  end: string;
  houseKwh: number;
  energy: number;
  ftRate: number;
  service: number;
  vatRate: number;
  source: 'bill' | 'meter' | 'projected';
};

export function basisFromTariff(
  start: string,
  end: string,
  houseKwh: number,
  t: Tariff,
  source: 'meter' | 'projected',
): CycleBasis {
  return {
    start,
    end,
    houseKwh,
    energy: energyCharge(houseKwh, t.tiers),
    ftRate: t.ftRate,
    service: t.serviceCharge,
    vatRate: t.vatRate,
    source,
  };
}

export type Share = {
  kwh: number;
  energyRate: number; // baht per kWh, house average
  energy: number;
  ftRate: number;
  ft: number;
  servicePct: number; // 0..1
  service: number;
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
  estimated: boolean;
};

/**
 * Cost of `kwh` (e.g. one AC) within a cycle, priced at the house's average
 * energy rate, plus Ft, a share of the service charge proportional to
 * kWh, and VAT. Each part is unrounded so segments can be summed first.
 */
function rawShare(kwh: number, b: CycleBasis) {
  const energyRate = b.houseKwh > 0 ? b.energy / b.houseKwh : 0;
  const servicePct = b.houseKwh > 0 ? kwh / b.houseKwh : 0;
  return {
    kwh,
    energy: kwh * energyRate,
    ft: kwh * b.ftRate,
    service: b.service * servicePct,
  };
}

/** Sum the cost of several (kWh, cycle) segments into one itemised share. */
export function priceShare(segments: { kwh: number; basis: CycleBasis }[]): Share {
  let kwh = 0, energy = 0, ft = 0, service = 0, houseKwh = 0, serviceTotal = 0;
  let vatRate = 0.07;
  let estimated = false;
  for (const s of segments) {
    const r = rawShare(s.kwh, s.basis);
    kwh += r.kwh;
    energy += r.energy;
    ft += r.ft;
    service += r.service;
    houseKwh += s.basis.houseKwh;
    serviceTotal += s.basis.service;
    vatRate = s.basis.vatRate;
    if (s.basis.source !== 'bill') estimated = true;
  }
  const e = round2(energy);
  const f = round2(ft);
  const sv = round2(service);
  const subtotal = round2(e + f + sv);
  const vat = round2(subtotal * vatRate);
  return {
    kwh,
    energyRate: kwh > 0 ? energy / kwh : 0,
    energy: e,
    ftRate: kwh > 0 ? ft / kwh : 0,
    ft: f,
    servicePct: serviceTotal > 0 ? service / serviceTotal : 0,
    service: sv,
    subtotal,
    vatRate,
    vat,
    total: round2(subtotal + vat),
    estimated,
  };
}
