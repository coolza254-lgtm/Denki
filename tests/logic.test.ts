import { test } from 'node:test';
import assert from 'node:assert/strict';
import { houseBill, DEFAULT_TARIFF, priceShare, basisFromTariff, energyCharge } from '../src/lib/tariff';
import { promptPayPayload, crc16 } from '../src/lib/promptpay';
import { dailyHouseUsage, sumUsage } from '../src/lib/usage';
import { cycleFor } from '../src/lib/dates';
import { checkExtracted } from '../src/lib/acCheck';

test('house bill matches the real 09/69 MEA bill', () => {
  const b = houseBill(454, DEFAULT_TARIFF);
  assert.equal(b.energy, 1667.03);
  assert.equal(b.ft, 73.68);
  assert.equal(b.service, 24.62);
  assert.equal(b.subtotal, 1765.33);
  assert.equal(b.vat, 123.57);
  assert.equal(b.total, 1888.9);
});

test('energy charge for usage inside the first tier', () => {
  assert.equal(energyCharge(0, DEFAULT_TARIFF.tiers), 0);
  assert.equal(energyCharge(150, DEFAULT_TARIFF.tiers), 450);
});

test('AC share uses house average rate and proportional service', () => {
  const basis = basisFromTariff('2026-08-23', '2026-09-22', 454, DEFAULT_TARIFF, 'meter');
  const s = priceShare([{ kwh: 113.5, basis }]); // a quarter of the house
  assert.equal(s.energy, 416.76); // 1667.03 / 4
  assert.equal(s.ft, 18.42);
  assert.equal(s.service, 6.16); // 24.62 / 4
  assert.equal(s.subtotal, 441.34);
  assert.equal(s.vat, 30.89);
  assert.equal(s.total, 472.23);
  assert.ok(Math.abs(s.servicePct - 0.25) < 1e-9);
  assert.equal(s.estimated, true);
});

test('whole house share equals the house bill', () => {
  const basis = { ...basisFromTariff('a', 'b', 454, DEFAULT_TARIFF, 'meter'), source: 'bill' as const };
  const s = priceShare([{ kwh: 454, basis }]);
  assert.equal(s.total, 1888.9);
  assert.equal(s.estimated, false);
});

test('PromptPay payload matches the reference implementation', () => {
  assert.equal(
    promptPayPayload('000-000-0000'),
    '00020101021129370016A000000677010111011300660000000005802TH530376463048956',
  );
  const p = promptPayPayload('0812345678', 472.23);
  assert.ok(p.includes('0113006681234567'));
  assert.ok(p.includes('5406472.23'));
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)));
});

test('PromptPay with national ID uses tag 02', () => {
  assert.ok(promptPayPayload('1234567890123', 10).includes('02131234567890123'));
});

test('daily usage: consecutive days exact, gaps spread and estimated', () => {
  const u = dailyHouseUsage([
    { id: 1, readAt: '2026-09-01T20:00', value: 9000 },
    { id: 2, readAt: '2026-09-02T20:00', value: 9015 },
    { id: 3, readAt: '2026-09-05T20:00', value: 9045 },
    { id: 4, readAt: '2026-09-05T22:00', value: 9047 },
  ]);
  assert.deepEqual(u.get('2026-09-02'), { date: '2026-09-02', kwh: 15, estimated: false });
  assert.equal(u.get('2026-09-03')?.kwh, 10);
  assert.equal(u.get('2026-09-03')?.estimated, true);
  assert.equal(u.get('2026-09-05')?.kwh, 12);
  assert.deepEqual(sumUsage(u, '2026-09-01', '2026-09-30'), { kwh: 47, days: 4 });
});

test('billing cycle ends on the reading day', () => {
  assert.deepEqual(cycleFor('2026-09-22', 22), { start: '2026-08-23', end: '2026-09-22' });
  assert.deepEqual(cycleFor('2026-09-23', 22), { start: '2026-09-23', end: '2026-10-22' });
  assert.deepEqual(cycleFor('2026-01-05', 22), { start: '2025-12-23', end: '2026-01-22' });
  assert.deepEqual(cycleFor('2026-03-01', 30), { start: '2026-03-01', end: '2026-03-30' });
});

test('screenshot checks flag bad values', () => {
  const w = checkExtracted(
    { year: 2026, month: 9, notes: '', days: [
      { day: 1, kwh: 3.07 }, { day: 2, kwh: 15 }, { day: 3, kwh: -1 }, { day: 31, kwh: 2 }, { day: 14, kwh: null },
    ] },
    [3, 4, 4.5, 5],
    new Date(2026, 9, 2),
  );
  const msgs = w.map((x) => x.message).join('|');
  assert.match(msgs, /วันที่ 2 สูงกว่าปกติ/);
  assert.match(msgs, /วันที่ 3 ติดลบ/);
  assert.match(msgs, /ไม่มีวันที่ 31/);
  assert.equal(w.length, 3);
  assert.equal(checkExtracted({ year: 2026, month: 11, days: [], notes: '' }, [], new Date(2026, 9, 2))[0].message, 'เดือนในภาพอยู่ในอนาคต');
});
