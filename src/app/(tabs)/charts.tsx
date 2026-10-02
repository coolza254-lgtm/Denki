// Daily and monthly charts per category, in kWh or baht.
import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Button, C, Card, H, Row, Screen, Segmented, Sub, baht, kwh, useDataset } from '../../components/ui';
import { BarChart, type Bar } from '../../components/BarChart';
import { CATEGORY_LABEL, kwhOn, priceRange, type Category, type Dataset } from '../../lib/calc';
import { daysInMonth, formatThaiDate, formatThaiMonth, THAI_MONTHS, today } from '../../lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');
const COLORS: Record<Category, string> = { house: C.house, ac1: C.ac1, ac2: C.ac2, rest: C.rest };

function shiftMonth(key: string, n: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthDates(key: string) {
  const [y, m] = key.split('-').map(Number);
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => `${key}-${pad(i + 1)}`);
}

function dayValue(ds: Dataset, cat: Category, date: string, unit: 'kwh' | 'baht'): number | null {
  const k = kwhOn(ds, cat, date);
  if (k == null || unit === 'kwh') return k;
  if (k <= 0) return 0;
  return priceRange(ds, cat, date, date)?.total ?? null;
}

function monthTotal(ds: Dataset, cat: Category, key: string, unit: 'kwh' | 'baht'): number | null {
  const dates = monthDates(key);
  const has = dates.some((d) => kwhOn(ds, cat, d) != null);
  if (!has) return null;
  if (unit === 'kwh') return dates.reduce((s, d) => s + (kwhOn(ds, cat, d) ?? 0), 0);
  return priceRange(ds, cat, dates[0], dates[dates.length - 1])?.total ?? null;
}

export default function Charts() {
  const [ds] = useDataset();
  const [cat, setCat] = useState<Category>('house');
  const [unit, setUnit] = useState<'kwh' | 'baht'>('kwh');
  const [view, setView] = useState<'day' | 'month'>('day');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);

  const fmt = (v: number) => (unit === 'kwh' ? `${kwh(v, 1)} หน่วย` : `฿${baht(v)}`);

  const bars: Bar[] = useMemo(() => {
    if (!ds) return [];
    if (view === 'day') {
      return monthDates(month).map((d) => ({ key: d, label: String(Number(d.slice(8))), value: dayValue(ds, cat, d, unit) }));
    }
    return Array.from({ length: 12 }, (_, i) => shiftMonth(month, i - 11)).map((m) => ({
      key: m, label: THAI_MONTHS[Number(m.slice(5)) - 1], value: monthTotal(ds, cat, m, unit),
    }));
  }, [ds, cat, unit, view, month]);

  // Average per day with data last month, so a half-finished month compares fairly.
  const prevAvg = useMemo(() => {
    if (!ds || view !== 'day') return null;
    const vals = monthDates(shiftMonth(month, -1)).map((d) => dayValue(ds, cat, d, unit)).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [ds, cat, unit, view, month]);

  const withData = bars.filter((b): b is Bar & { value: number } => b.value != null);
  const total = withData.reduce((s, b) => s + b.value, 0);
  const avg = withData.length ? total / withData.length : 0;
  const hi = withData.reduce<typeof withData[0] | null>((a, b) => (!a || b.value > a.value ? b : a), null);
  const lo = withData.reduce<typeof withData[0] | null>((a, b) => (!a || b.value < a.value ? b : a), null);
  const sel = bars.find((b) => b.key === selected);
  const nameOf = (key: string) => (view === 'day' ? formatThaiDate(key) : formatThaiMonth(key));

  return (
    <Screen>
      <Segmented value={cat} onChange={setCat}
        options={[{ value: 'house', label: 'บ้าน' }, { value: 'ac1', label: 'แอร์ฉัน' },
          { value: 'ac2', label: 'แอร์พี่' }, { value: 'rest', label: 'อื่นๆ' }]} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Segmented value={view} onChange={(v) => { setView(v); setSelected(null); }}
            options={[{ value: 'day', label: 'รายวัน' }, { value: 'month', label: 'รายเดือน' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Segmented value={unit} onChange={setUnit} options={[{ value: 'kwh', label: 'หน่วย' }, { value: 'baht', label: 'บาท' }]} />
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 56 }}><Button kind="secondary" title="◀" onPress={() => setMonth(shiftMonth(month, -1))} /></View>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.text }}>
            {view === 'day' ? formatThaiMonth(month) : `12 เดือนถึง ${formatThaiMonth(month)}`}
          </Text>
          <View style={{ width: 56 }}><Button kind="secondary" title="▶" onPress={() => setMonth(shiftMonth(month, 1))} /></View>
        </View>
        <H>{CATEGORY_LABEL[cat]}</H>
        {withData.length === 0 ? <Sub>ไม่มีข้อมูลในช่วงนี้</Sub> : (
          <BarChart bars={bars} color={COLORS[cat]} format={fmt} selected={selected}
            onSelect={(k) => setSelected(k === selected ? null : k)} />
        )}
        {sel && <Row label={nameOf(sel.key)} value={sel.value == null ? 'ไม่มีข้อมูล' : fmt(sel.value)} bold />}
      </Card>

      {withData.length > 0 && (
        <Card>
          <Row label="รวม" value={fmt(total)} bold />
          <Row label={view === 'day' ? 'เฉลี่ยต่อวัน' : 'เฉลี่ยต่อเดือน'} value={fmt(avg)} />
          {hi && <Row label={`สูงสุด (${nameOf(hi.key)})`} value={fmt(hi.value)} color={C.warn} />}
          {lo && <Row label={`ต่ำสุด (${nameOf(lo.key)})`} value={fmt(lo.value)} color={C.good} />}
          {prevAvg != null && prevAvg > 0 && (
            <Row label="เฉลี่ยต่อวัน เทียบเดือนก่อน" value={`${avg >= prevAvg ? '▲' : '▼'} ${Math.abs(((avg - prevAvg) / prevAvg) * 100).toFixed(0)}%`}
              color={avg >= prevAvg ? C.warn : C.good} />
          )}
          {view === 'day' && withData.length < bars.length && <Sub>มีข้อมูล {withData.length} จาก {bars.length} วัน</Sub>}
        </Card>
      )}
    </Screen>
  );
}
