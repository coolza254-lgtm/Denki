import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendar, type Box } from '../src/lib/acOcr';

// Values from the 9/2026 Mijia screenshot (day 14 has no reading).
const SEPT: Record<number, string | null> = {
  1: '3.07', 2: '5.98', 3: '6.71', 4: '6.34', 5: '3.57', 6: '5.67', 7: '6.25', 8: '5.73', 9: '6.09',
  10: '6.56', 11: '2.84', 12: '3.08', 13: '3.35', 14: null, 15: '1.86', 16: '6.64', 17: '4.38',
  18: '3.37', 19: '3.3', 20: '4.22', 21: '5.1', 22: '4.59', 23: '4.31', 24: '2.82', 25: '2.17',
  26: '1.86', 27: '2.06', 28: '4', 29: '3.56', 30: '4.81',
};

function box(text: string, cx: number, cy: number, w = 20 * text.length, h = 30): Box {
  return { text, left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 };
}

function screenshot(values: Record<number, string | null>, firstCol: number, label: string, merged = false): Box[] {
  const cols = [124, 226, 327, 429, 531, 633, 734];
  const boxes: Box[] = [
    box('Usage', 110, 600), box('today', 200, 600), box('(hrs)', 270, 600),
    box('15.1', 110, 690, 90, 60), box('15.1', 360, 690, 90, 60), box('5.0', 610, 690, 90, 60),
    ...'SMTWTFS'.split('').map((d, i) => box(d, cols[i], 820)),
    box(label, 430, 1715, 110),
  ];
  for (const [d, v] of Object.entries(values)) {
    const i = Number(d) - 1 + firstCol;
    const x = cols[i % 7];
    const y = 897 + Math.floor(i / 7) * 152;
    boxes.push(box(d, x, y));
    if (v == null) continue;
    if (merged) boxes.push(box(`${v} kWh`, x, y + 60, 70, 60));
    else boxes.push(box(v, x, y + 46), box('kWh', x, y + 80, 50));
  }
  return boxes;
}

test('reads every day of the September screenshot', () => {
  const r = parseCalendar(screenshot(SEPT, 2, '9/2026'))!;
  assert.equal(r.year, 2026);
  assert.equal(r.month, 9);
  assert.equal(r.days.length, 29);
  assert.equal(r.days.find((d) => d.day === 14), undefined);
  for (const d of r.days) assert.equal(d.kwh, Number(SEPT[d.day]), `day ${d.day}`);
});

test('handles value and unit merged into one OCR line, and commas', () => {
  const v = { ...SEPT, 15: '1,86' };
  const r = parseCalendar(screenshot(v, 2, '9/2026', true))!;
  assert.equal(r.days.length, 29);
  assert.equal(r.days.find((d) => d.day === 15)?.kwh, 1.86);
  assert.equal(r.days.find((d) => d.day === 28)?.kwh, 4);
});

test('missing month label is reported, not guessed', () => {
  const r = parseCalendar(screenshot({ 1: '2.13', 2: '5.25' }, 6, 'no label'))!;
  assert.equal(r.month, 0);
  assert.ok(r.notes.length > 0);
  assert.deepEqual(r.days, [{ day: 1, kwh: 2.13 }, { day: 2, kwh: 5.25 }]);
});

test('no calendar found', () => {
  assert.equal(parseCalendar([box('hello', 100, 100)]), null);
});
