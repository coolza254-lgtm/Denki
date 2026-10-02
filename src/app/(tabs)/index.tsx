// Home: running estimate for this billing cycle, then any day's usage split
// into house / my AC / brother's AC / rest.
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import {
  Appear, Badge, Card, CountUp, DateStepper, Divider, Dot, EmptyState, IconButton, Row, Screen,
  SectionTitle, Squish, T, baht, kwh, useDataset,
} from '../../components/ui';
import { Logo } from '../../components/Logo';
import { Spark } from '../../components/Spark';
import { Icon, type IconName } from '../../components/Icon';
import { UpdateBanner } from '../../components/UpdateBanner';
import { CATEGORY_LABEL, cycleEstimate, kwhOn, priceRange, type Category } from '../../lib/calc';
import { formatThaiShort, today } from '../../lib/dates';
import { C, CAT_COLOR, F } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'อรุณสวัสดิ์ ☀️';
  if (h < 16) return 'สวัสดีตอนบ่าย';
  if (h < 19) return 'สวัสดีตอนเย็น';
  return 'ราตรีสวัสดิ์ 🌙';
}

function QuickAction({ icon, label, onPress, bg }: { icon: IconName; label: string; onPress: () => void; bg: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Squish onPress={onPress} bg={bg} depth={3} style={{ paddingVertical: 12, alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={24} />
        <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>{label}</T>
      </Squish>
    </View>
  );
}

export default function Home() {
  const [ds] = useDataset();
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const est = ds ? cycleEstimate(ds) : null;
  const houseDay = ds?.house.get(date);
  const k = (cat: Category) => (ds ? kwhOn(ds, cat, date) : null);
  const price = (cat: Category) => {
    const v = k(cat);
    return ds && v != null && v > 0 ? priceRange(ds, cat, date, date)?.total ?? null : null;
  };
  const house = k('house');
  const parts = (['ac1', 'ac2', 'rest'] as const).map((cat) => ({ cat, v: Math.max(0, k(cat) ?? 0) }));
  const partsTotal = parts.reduce((s, p) => s + p.v, 0);
  const anyData = (['house', 'ac1', 'ac2'] as const).some((c) => k(c) != null);

  return (
    <Screen tabs>
      <View style={{ paddingTop: insets.top + 6, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Logo size={34} />
          <T v="sub">{greeting()}</T>
        </View>
        <IconButton icon="gear" onPress={() => router.push('/settings')} />
      </View>

      <UpdateBanner />

      {/* Hero: this billing cycle */}
      <Appear>
        <Card color={C.volt} style={{ overflow: 'hidden' }}>
          {est ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="sub" style={{ color: C.ink }}>คาดว่าบิลรอบนี้</T>
                  <CountUp value={est.bill.total} format={(n) => `฿${baht(n)}`}
                    style={{ fontFamily: F.bold, fontSize: 38, color: C.ink, lineHeight: 50 }} />
                  <T v="small" style={{ color: C.ink }}>
                    {formatThaiShort(est.start)} – {formatThaiShort(est.end)}
                  </T>
                </View>
                <Spark size={78} mood={est.projectedKwh > 500 ? 'wow' : 'happy'} />
              </View>

              <View style={{ gap: 6 }}>
                <View style={{ height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink, backgroundColor: '#FFF8E0', overflow: 'hidden' }}>
                  <View style={{ width: `${(est.daysElapsed / est.daysTotal) * 100}%`, height: '100%', backgroundColor: C.ink }} />
                </View>
                <T v="small" style={{ color: C.ink }}>วันที่ {est.daysElapsed} จาก {est.daysTotal} วันของรอบบิล</T>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'ใช้ไปแล้ว', value: `${kwh(est.kwhSoFar, 0)} หน่วย` },
                  { label: 'คาดทั้งรอบ', value: `${kwh(est.projectedKwh, 0)} หน่วย` },
                ].map((s) => (
                  <View key={s.label} style={{ flex: 1, backgroundColor: '#FFFFFFAA', borderRadius: 14, padding: 10, borderWidth: 1.5, borderColor: C.ink }}>
                    <T v="small" style={{ color: C.inkSoft }}>{s.label}</T>
                    <T v="h">{s.value}</T>
                  </View>
                ))}
              </View>

              <Squish onPress={() => setOpen(!open)} bg="#FFFFFFAA" depth={0} haptic
                style={{ paddingVertical: 6, alignItems: 'center', borderWidth: 0 }}>
                <T v="small" style={{ color: C.ink, fontFamily: F.medium }}>{open ? 'ซ่อนรายละเอียด ▲' : 'ดูรายละเอียดบิล ▼'}</T>
              </Squish>
              {open && (
                <View style={{ gap: 2 }}>
                  <Row label="ค่าพลังงาน" value={baht(est.bill.energy)} />
                  <Row label="ค่า Ft" value={baht(est.bill.ft)} />
                  <Row label="ค่าบริการ" value={baht(est.bill.service)} />
                  <Row label="VAT 7%" value={baht(est.bill.vat)} />
                  {est.daysWithData < est.daysElapsed && (
                    <T v="small" style={{ color: C.inkSoft }}>มีเลขมิเตอร์ {est.daysWithData} จาก {est.daysElapsed} วัน</T>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Spark size={84} mood="sleepy" />
              <T v="h" style={{ textAlign: 'center' }}>เริ่มจดมิเตอร์กันเลย!</T>
              <T v="sub" style={{ textAlign: 'center', color: C.ink }}>จดอย่างน้อย 2 ครั้ง แล้ว Denki จะประมาณบิลรอบนี้ให้</T>
            </View>
          )}
        </Card>
      </Appear>

      <Appear delay={80}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <QuickAction icon="meter" label="จดมิเตอร์" bg="#fff" onPress={() => router.navigate('/meter')} />
          <QuickAction icon="scan" label="นำเข้าแอร์" bg={C.skySoft} onPress={() => router.navigate('/ac')} />
          <QuickAction icon="receipt" label="ออกใบเสร็จ" bg={C.coralSoft} onPress={() => router.push('/receipt/new')} />
        </View>
      </Appear>

      {/* Any day */}
      <Appear delay={160}>
        <View style={{ gap: 12 }}>
          <SectionTitle>ใช้ไฟรายวัน</SectionTitle>
          <DateStepper value={date} onChange={setDate} max={today()} />
          <Card>
            {!anyData ? (
              <EmptyState title="วันนี้ยังไม่มีข้อมูล" text="จดมิเตอร์หรือนำเข้าข้อมูลแอร์ก่อนนะ" />
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <View>
                    <T v="sub">ทั้งบ้าน</T>
                    <T v="display">{house == null ? '—' : kwh(house, 1)}<T v="sub">  หน่วย</T></T>
                  </View>
                  {price('house') != null && <Badge label={`฿${baht(price('house')!)}`} bg={C.voltSoft} />}
                </View>

                {partsTotal > 0 && (
                  <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: C.ink }}>
                    {parts.filter((p) => p.v > 0).map((p) => (
                      <View key={p.cat} style={{ flex: p.v, backgroundColor: CAT_COLOR[p.cat] }} />
                    ))}
                  </View>
                )}

                <Divider />
                {(['ac1', 'ac2', 'rest'] as const).map((cat) => {
                  const v = k(cat);
                  const p = price(cat);
                  return (
                    <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
                      <Dot color={CAT_COLOR[cat]} size={12} />
                      <T v="body" style={{ flex: 1 }}>{CATEGORY_LABEL[cat]}</T>
                      <T v="num">{v == null ? '—' : `${kwh(v)} หน่วย`}</T>
                      <T v="num" style={{ width: 84, textAlign: 'right', color: C.inkSoft, fontFamily: F.regular }}>
                        {p != null ? `฿${baht(p)}` : ''}
                      </T>
                    </View>
                  );
                })}
                {houseDay?.estimated && <Badge icon="alert" label="วันนี้ไม่ได้จดมิเตอร์ ตัวเลขบ้านเป็นค่าเฉลี่ย" bg={C.voltSoft} />}
                {(k('rest') ?? 0) < 0 && <Badge icon="alert" label="แอร์รวมกันมากกว่ามิเตอร์บ้าน ลองตรวจตัวเลข" color={C.red} bg={C.redSoft} />}
                <T v="small">ราคารวม Ft ค่าบริการ และ VAT แล้ว (คิดจากอัตราเฉลี่ยของรอบบิล)</T>
              </>
            )}
          </Card>
        </View>
      </Appear>
    </Screen>
  );
}
