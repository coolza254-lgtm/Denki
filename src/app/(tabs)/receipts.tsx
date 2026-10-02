// Receipts for my brother, and the real MEA bills.
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, C, Card, Screen, Segmented, Sub, baht, kwh } from '../../components/ui';
import * as db from '../../lib/db';
import { formatThaiDate, formatThaiShort } from '../../lib/dates';

export default function Receipts() {
  const [tab, setTab] = useState<'receipts' | 'bills'>('receipts');
  const [receipts, setReceipts] = useState<db.Receipt[]>([]);
  const [bills, setBills] = useState<db.Bill[]>([]);

  useFocusEffect(useCallback(() => {
    db.listReceipts().then(setReceipts);
    db.listBills().then(setBills);
  }, []));

  const unpaid = receipts.filter((r) => !r.paid).reduce((s, r) => s + r.total, 0);

  return (
    <Screen>
      <Segmented value={tab} onChange={setTab}
        options={[{ value: 'receipts', label: 'ใบเสร็จพี่ชาย' }, { value: 'bills', label: 'บิล กฟน.' }]} />

      {tab === 'receipts' ? (
        <>
          <Button title="+ สร้างใบเสร็จ" onPress={() => router.push('/receipt/new')} />
          {unpaid > 0 && <Sub color={C.warn}>ค้างชำระรวม ฿{baht(unpaid)}</Sub>}
          {receipts.length === 0 && <Sub>ยังไม่มีใบเสร็จ</Sub>}
          {receipts.map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/receipt/${r.id}`)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>
                    {formatThaiShort(r.startDate)} – {formatThaiShort(r.endDate)}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>฿{baht(r.total)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Sub>{r.ac === 1 ? 'แอร์ของฉัน' : 'แอร์พี่ชาย'} · {kwh(r.kwh)} หน่วย{r.slipPath ? ' · 📎 สลิป' : ''}</Sub>
                  <Text style={{ fontWeight: '700', color: r.paid ? C.good : C.warn }}>
                    {r.paid ? '✓ จ่ายแล้ว' : 'ยังไม่จ่าย'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Button title="+ เพิ่มบิลค่าไฟ" onPress={() => router.push('/bill-edit')} />
          <Sub>ใส่ตัวเลขจากบิลจริงแล้วแอปจะใช้คิดเงินรอบนั้นแทนค่าประมาณ พร้อมเก็บรูปบิลไว้</Sub>
          {bills.map((b) => (
            <Pressable key={b.id} onPress={() => router.push({ pathname: '/bill-edit', params: { id: String(b.id) } })}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>จดเลข {formatThaiDate(b.periodEnd)}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>฿{baht(b.total)}</Text>
                </View>
                <Sub>{kwh(b.kwh)} หน่วย{b.photoPath ? ' · 📎 รูปบิล' : ''}</Sub>
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
