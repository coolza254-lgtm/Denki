// Home: pick a day, see house / my AC / brother's AC / rest in kWh and baht,
// plus the running estimate for the current billing cycle.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, C, Card, DateButton, H, Row, Screen, Sub, baht, kwh, useDataset } from '../../components/ui';
import { UpdateBanner } from '../../components/UpdateBanner';
import { CATEGORY_LABEL, cycleEstimate, kwhOn, priceRange, type Category } from '../../lib/calc';
import { addDays, formatThaiShort, today } from '../../lib/dates';

const CATS: Category[] = ['house', 'ac1', 'ac2', 'rest'];
const COLORS: Record<Category, string> = { house: C.house, ac1: C.ac1, ac2: C.ac2, rest: C.rest };

export default function Home() {
  const [ds] = useDataset();
  const [date, setDate] = useState(today());

  const est = ds ? cycleEstimate(ds) : null;
  const houseDay = ds?.house.get(date);

  return (
    <Screen>
      <UpdateBanner />

      <Card>
        <H>ใช้ไฟรายวัน</H>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ width: 56 }}><Button kind="secondary" title="◀" onPress={() => setDate(addDays(date, -1))} /></View>
          <View style={{ flex: 1 }}><DateButton value={date} onChange={setDate} /></View>
          <View style={{ width: 56 }}>
            <Button kind="secondary" title="▶" disabled={date >= today()} onPress={() => setDate(addDays(date, 1))} />
          </View>
        </View>
        {ds && CATS.map((cat) => {
          const k = kwhOn(ds, cat, date);
          const price = k != null && k > 0 ? priceRange(ds, cat, date, date) : null;
          return (
            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS[cat] }} />
              <Text style={{ flex: 1, fontSize: 16, color: C.text }}>{CATEGORY_LABEL[cat]}</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] }}>
                {k == null ? '—' : `${kwh(k)} หน่วย`}
              </Text>
              <Text style={{ width: 90, textAlign: 'right', fontSize: 16, color: C.sub, fontVariant: ['tabular-nums'] }}>
                {price ? `฿${baht(price.total)}` : ''}
              </Text>
            </View>
          );
        })}
        {houseDay?.estimated && <Sub color={C.warn}>* วันนี้ไม่ได้จดมิเตอร์ ตัวเลขบ้านเฉลี่ยจากช่วงที่ขาด</Sub>}
        {ds && kwhOn(ds, 'rest', date) != null && kwhOn(ds, 'rest', date)! < 0 && (
          <Sub color={C.warn}>* แอร์รวมกันมากกว่ามิเตอร์บ้าน — ตรวจเลขมิเตอร์หรือค่าแอร์</Sub>
        )}
        <Sub>ราคาต่อวันคิดจากอัตราเฉลี่ยของรอบบิล รวม Ft ค่าบริการ และ VAT แล้ว</Sub>
      </Card>

      <Card>
        <H>ประมาณการรอบบิลนี้</H>
        {est ? (
          <>
            <Sub>{formatThaiShort(est.start)} – {formatThaiShort(est.end)} (ผ่านไป {est.daysElapsed}/{est.daysTotal} วัน)</Sub>
            <Row label="ใช้ไปแล้ว" value={`${kwh(est.kwhSoFar, 1)} หน่วย`} />
            <Row label="คาดว่าทั้งรอบ" value={`${kwh(est.projectedKwh, 0)} หน่วย`} />
            <Row label="ค่าพลังงาน" value={baht(est.bill.energy)} />
            <Row label="Ft" value={baht(est.bill.ft)} />
            <Row label="ค่าบริการ" value={baht(est.bill.service)} />
            <Row label="VAT 7%" value={baht(est.bill.vat)} />
            <Row label="คาดว่าบิลรอบนี้" value={`฿${baht(est.bill.total)}`} bold color={C.primary} />
            {est.daysWithData < est.daysElapsed && (
              <Sub>มีข้อมูลมิเตอร์ {est.daysWithData} จาก {est.daysElapsed} วัน</Sub>
            )}
          </>
        ) : (
          <Sub>ยังไม่มีเลขมิเตอร์ในรอบนี้ — จดอย่างน้อย 2 ครั้งเพื่อเริ่มคำนวณ</Sub>
        )}
      </Card>
    </Screen>
  );
}
