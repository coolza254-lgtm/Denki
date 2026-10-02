// Daily and monthly charts per category, in kWh or baht.
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Badge, Card, EmptyState, IconButton, Row, Screen, ScreenHeader, Segmented, T, baht, kwh, useDataset } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { C, CAT_COLOR, F } from '../../theme';
import { BarChart, type Bar } from '../../components/BarChart';
import { CATEGORY_LABEL, kwhOn, priceRange, type Category, type Dataset } from '../../lib/calc';
import { daysInMonth, formatThaiDate, formatThaiMonth, THAI_MONTHS, today } from '../../lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');

function Stat({ icon, label, value, bg }: { icon: IconName; label: string; value: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 18, borderWidth: 2, borderColor: C.ink, padding: 12, gap: 4 }}>
      <Icon name={icon} size={20} />
      <T v="small" style={{ color: C.inkSoft }}>{label}</T>
      <T v="h" style={{ fontFamily: F.bold }}>{value}</T>
    </View>
  );
}

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

  const trend = prevAvg != null && prevAvg > 0 ? (avg - prevAvg) / prevAvg : null;

  return (
    <Screen tabs>
      <ScreenHeader title="สถิติ" sub="ดูว่าวันไหนใช้ไฟเยอะ" />
      <Segmented value={cat} onChange={(v) => { setCat(v); setSelected(null); }}
        options={[{ value: 'house', label: 'บ้าน' }, { value: 'ac1', label: 'แอร์ฉัน', color: C.skySoft },
          { value: 'ac2', label: 'แอร์พี่', color: C.coralSoft }, { value: 'rest', label: 'อื่นๆ', color: '#EEF0F3' }]} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Segmented value={view} onChange={(v) => { setView(v); setSelected(null); }}
            options={[{ value: 'day', label: 'รายวัน' }, { value: 'month', label: 'รายเดือน' }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Segmented value={unit} onChange={setUnit} options={[{ value: 'kwh', label: 'หน่วย' }, { value: 'baht', label: 'บาท' }]} />
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconButton icon="left" size={38} onPress={() => { setMonth(shiftMonth(month, -1)); setSelected(null); }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T v="h">{view === 'day' ? formatThaiMonth(month) : `12 เดือนถึง ${formatThaiMonth(month)}`}</T>
            <T v="small">{CATEGORY_LABEL[cat]}</T>
          </View>
          <IconButton icon="right" size={38} onPress={() => { setMonth(shiftMonth(month, 1)); setSelected(null); }} />
        </View>
        {withData.length === 0 ? <EmptyState title="ไม่มีข้อมูลในช่วงนี้" /> : (
          <BarChart bars={bars} color={CAT_COLOR[cat]} format={fmt} selected={selected}
            onSelect={(k) => setSelected(k === selected ? null : k)} />
        )}
        {sel && (
          <View style={{ backgroundColor: C.voltSoft, borderRadius: 14, borderWidth: 2, borderColor: C.ink, padding: 10 }}>
            <Row label={nameOf(sel.key)} value={sel.value == null ? 'ไม่มีข้อมูล' : fmt(sel.value)} bold />
          </View>
        )}
      </Card>

      {withData.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat icon="bolt" label="รวม" value={fmt(total)} bg={C.voltSoft} />
            <Stat icon="chart" label={view === 'day' ? 'เฉลี่ย/วัน' : 'เฉลี่ย/เดือน'} value={fmt(avg)} bg="#fff" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {hi && <Stat icon="alert" label={`สูงสุด · ${nameOf(hi.key)}`} value={fmt(hi.value)} bg={C.coralSoft} />}
            {lo && <Stat icon="check" label={`ต่ำสุด · ${nameOf(lo.key)}`} value={fmt(lo.value)} bg={C.mintSoft} />}
          </View>
          {trend != null && (
            <Card color={trend >= 0 ? C.coralSoft : C.mintSoft}>
              <T v="body">
                เฉลี่ยต่อวัน{trend >= 0 ? 'มากกว่า' : 'น้อยกว่า'}เดือนก่อน{' '}
                <T v="h" style={{ fontFamily: F.bold }}>{Math.abs(trend * 100).toFixed(0)}%</T>
                {trend >= 0 ? ' ลองปรับอุณหภูมิแอร์ขึ้นสักองศานะ' : ' เยี่ยมเลย! ⚡'}
              </T>
            </Card>
          )}
          {view === 'day' && withData.length < bars.length && <Badge label={`มีข้อมูล ${withData.length} จาก ${bars.length} วัน`} bg="#fff" />}
        </>
      )}
    </Screen>
  );
}
