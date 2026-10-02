// Receipts for my brother, and the real MEA bills.
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Button, Card, EmptyState, Screen, ScreenHeader, Segmented, Squish, T, baht, kwh } from '../../components/ui';
import { Icon } from '../../components/Icon';
import * as db from '../../lib/db';
import { formatThaiDate, formatThaiShort } from '../../lib/dates';
import { C, F } from '../../theme';

export default function Receipts() {
  const [tab, setTab] = useState<'receipts' | 'bills'>('receipts');
  const [receipts, setReceipts] = useState<db.Receipt[]>([]);
  const [bills, setBills] = useState<db.Bill[]>([]);

  useFocusEffect(useCallback(() => {
    db.listReceipts().then(setReceipts);
    db.listBills().then(setBills);
  }, []));

  const unpaid = receipts.filter((r) => !r.paid);
  const unpaidTotal = unpaid.reduce((s, r) => s + r.total, 0);

  return (
    <Screen tabs>
      <ScreenHeader title="ใบเสร็จ" sub="เก็บเงินค่าแอร์ และบิลจริง" />
      <Segmented value={tab} onChange={setTab}
        options={[{ value: 'receipts', label: 'ใบเสร็จพี่ชาย' }, { value: 'bills', label: 'บิล กฟน.' }]} />

      {tab === 'receipts' ? (
        <>
          <Card color={unpaidTotal > 0 ? C.coralSoft : C.mintSoft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="wallet" size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="sub">{unpaidTotal > 0 ? `ค้างชำระ ${unpaid.length} ใบ` : 'ไม่มียอดค้าง'}</T>
                <T v="title" style={{ fontFamily: F.bold }}>฿{baht(unpaidTotal)}</T>
              </View>
            </View>
            <Button title="สร้างใบเสร็จใหม่" icon="plus" onPress={() => router.push('/receipt/new')} />
          </Card>

          {receipts.length === 0 && <EmptyState title="ยังไม่มีใบเสร็จ" text="นำเข้าข้อมูลแอร์พี่ชาย แล้วกดสร้างใบเสร็จได้เลย" />}
          {receipts.map((r) => (
            <Squish key={r.id} onPress={() => router.push(`/receipt/${r.id}`)} radius={20} style={{ padding: 16, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="h">{formatThaiShort(r.startDate)} – {formatThaiShort(r.endDate)}</T>
                <T v="h" style={{ fontFamily: F.bold }}>฿{baht(r.total)}</T>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="sub">{r.ac === 1 ? 'แอร์ของฉัน' : 'แอร์พี่ชาย'} · {kwh(r.kwh)} หน่วย{r.slipPath ? ' · มีสลิป' : ''}</T>
                {r.paid
                  ? <Badge icon="check" label="จ่ายแล้ว" bg={C.mintSoft} />
                  : <Badge label="รอจ่าย" color={C.red} bg={C.redSoft} />}
              </View>
            </Squish>
          ))}
        </>
      ) : (
        <>
          <Card color={C.voltSoft}>
            <T v="sub">ใส่ตัวเลขจากบิลจริง แล้ว Denki จะใช้คิดเงินรอบนั้นแทนค่าประมาณ พร้อมเก็บรูปบิลไว้ดูย้อนหลัง</T>
            <Button title="เพิ่มบิลค่าไฟ" icon="plus" onPress={() => router.push('/bill-edit')} />
          </Card>
          {bills.length === 0 && <EmptyState title="ยังไม่มีบิล" />}
          {bills.map((b) => (
            <Squish key={b.id} onPress={() => router.push({ pathname: '/bill-edit', params: { id: String(b.id) } })} radius={20}
              style={{ padding: 16, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="h">จดเลข {formatThaiDate(b.periodEnd)}</T>
                <T v="h" style={{ fontFamily: F.bold }}>฿{baht(b.total)}</T>
              </View>
              <T v="sub">{kwh(b.kwh)} หน่วย{b.photoPath ? ' · มีรูปบิล' : ''}</T>
            </Squish>
          ))}
        </>
      )}
    </Screen>
  );
}
