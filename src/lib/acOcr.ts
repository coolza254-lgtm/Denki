// Rebuilds the AC app's monthly calendar from on-device OCR results.
//
// Each calendar cell is stacked vertically:   12      <- day number
//                                              2.97    <- kWh value
//                                              kWh     <- unit label
// We anchor on every "kWh" label, take the number just above it as the
// value and the number above that as the day. Cells without usage have no
// "kWh" label, so they are simply missing (= no data).
import type { Extracted } from './acCheck';

export type Box = { text: string; left: number; top: number; right: number; bottom: number };

type Tok = Box & { cx: number; cy: number; w: number; h: number };

const tok = (b: Box): Tok => ({
  ...b,
  cx: (b.left + b.right) / 2,
  cy: (b.top + b.bottom) / 2,
  w: b.right - b.left,
  h: b.bottom - b.top,
});

/** Fix common OCR slips in numbers: "1,86" -> "1.86", "O" -> "0". */
function asNumber(text: string): number | null {
  const t = text.trim().replace(/,/g, '.').replace(/[oO]/g, '0');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

const isKwh = (t: string) => /^k\s*w\s*h$/i.test(t.trim());
const valueWithUnit = (t: string) => /^(\d+(?:[.,]\d+)?)\s*k\s*w\s*h$/i.exec(t.trim());

export function parseCalendar(boxes: Box[]): Extracted | null {
  const toks = boxes.map(tok);

  // Month label under the calendar, e.g. "9/2026".
  let year = 0;
  let month = 0;
  for (const t of toks) {
    const m = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec(t.text.trim());
    if (m) { month = Number(m[1]); year = Number(m[2]); }
  }

  const days = new Map<number, number>();
  const used = new Set<Tok>();

  // Nearest token above `ref` in the same column that passes `ok`.
  const above = (ref: Tok, maxGap: number, ok: (t: Tok) => boolean): Tok | null => {
    let best: Tok | null = null;
    for (const t of toks) {
      if (t === ref || used.has(t) || !ok(t)) continue;
      if (Math.abs(t.cx - ref.cx) > Math.max(ref.w, t.w) * 0.9) continue;
      const gap = ref.top - t.bottom;
      if (t.cy >= ref.cy || gap > maxGap) continue;
      if (!best || t.cy > best.cy) best = t;
    }
    return best;
  };

  for (const anchor of toks) {
    let value: number | null = null;
    let valueTok: Tok;
    const merged = valueWithUnit(anchor.text);
    if (merged) {
      value = Number(merged[1].replace(',', '.'));
      valueTok = anchor;
    } else if (isKwh(anchor.text)) {
      const v = above(anchor, anchor.h * 2.5, (t) => asNumber(t.text) != null);
      if (!v) continue;
      value = asNumber(v.text);
      valueTok = v;
    } else {
      continue;
    }
    used.add(valueTok);
    const dayTok = above(valueTok, valueTok.h * 3, (t) => {
      const n = asNumber(t.text);
      return n != null && Number.isInteger(n) && n >= 1 && n <= 31 && !t.text.includes('.');
    });
    if (!dayTok || value == null) continue;
    used.add(dayTok);
    days.set(Number(dayTok.text), value);
  }

  if (days.size === 0) return null;
  return {
    year,
    month,
    days: [...days.entries()].sort((a, b) => a[0] - b[0]).map(([day, kwh]) => ({ day, kwh })),
    notes: month ? '' : 'อ่านเดือน/ปีจากภาพไม่ได้ กรุณาเลือกเอง',
  };
}
