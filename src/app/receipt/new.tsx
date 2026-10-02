// Pick an AC and a date range, check the breakdown, enter PromptPay, create.
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Button, Card, DateButton, Divider, Field, Row, Screen, Segmented, T, baht, kwh } from '../../components/ui';
import { Spark } from '../../components/Spark';
import * as db from '../../lib/db';
import { loadDataset, priceRange, type Dataset } from '../../lib/calc';
import { addDays, today } from '../../lib/dates';
import { isValidPromptPayId } from '../../lib/promptpay';
import { C, F } from '../../theme';

export default function NewReceipt() {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [ac, setAc] = useState<db.AcId>(2);
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [ppId, setPpId] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const defaultsFor = useCallback(async (which: db.AcId, data: Dataset) => {
    const receipts = (await db.listReceipts()).filter((r) => r.ac === which);
    const dates = [...data.ac[which].keys()].sort();
    const lastEnd = receipts.map((r) => r.endDate).sort().pop();
    setStart(lastEnd ? addDays(lastEnd, 1) : dates[0] ?? today());
    setEnd(dates[dates.length - 1] ?? today());
  }, []);

  useFocusEffect(useCallback(() => {
    loadDataset().then((data) => {
      setDs(data);
      setPpId(data.settings.promptpayId);
      setName(data.settings.payeeName);
      defaultsFor(ac, data);
    });
  }, []));

  const share = ds && start <= end ? priceRange(ds, ac === 1 ? 'ac1' : 'ac2', start, end) : null;

  const create = async () => {
    if (!share || share.kwh <= 0) return Alert.alert('ไม่มีหน่วยแอร์ในช่วงนี้');
    if (!isValidPromptPayId(ppId)) return Alert.alert('เลขพร้อมเพย์ไม่ถูกต้อง', 'ใส่เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก');
    setBusy(true);
    await db.saveSettings({ promptpayId: ppId, payeeName: name });
    const id = await db.addReceipt({
      ac, startDate: start, endDate: end, kwh: share.kwh, total: share.total,
      breakdown: JSON.stringify(share), promptpayId: ppId, payeeName: name.trim(),
    });
    setBusy(false);
    router.replace(`/receipt/${id}`);
  };

  return (
    <Screen>
      <Segmented<db.AcId> value={ac} onChange={(v) => { setAc(v); if (ds) defaultsFor(v, ds); }}
        options={[{ value: 1, label: 'แอร์ของฉัน', color: C.skySoft }, { value: 2, label: 'แอร์พี่ชาย', color: C.coralSoft }]} />

      <Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><DateButton label="ตั้งแต่" value={start} onChange={setStart} /></View>
          <View style={{ flex: 1 }}><DateButton label="ถึง" value={end} onChange={setEnd} /></View>
        </View>
        {start > end && <Badge icon="alert" label="วันเริ่มต้องไม่เกินวันสุดท้าย" color={C.red} bg={C.redSoft} />}
      </Card>

      <Card color={share && share.kwh > 0 ? C.volt : C.card}>
        {!share || share.kwh <= 0 ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Spark size={60} mood="sleepy" />
            <T v="body" style={{ textAlign: 'center' }}>
              {!share ? 'คำนวณไม่ได้ ต้องมีเลขมิเตอร์หรือบิลจริงของรอบนั้น' : 'ไม่มีหน่วยแอร์ในช่วงนี้'}
            </T>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <T v="sub" style={{ color: C.ink }}>ยอดที่ต้องเก็บ</T>
                <T v="display" style={{ fontFamily: F.bold }}>฿{baht(share.total)}</T>
                <T v="small" style={{ color: C.ink }}>{kwh(share.kwh)} หน่วย</T>
              </View>
              <Spark size={64} />
            </View>
            <View style={{ backgroundColor: '#FFFFFFB0', borderRadius: 16, padding: 12, gap: 2, borderWidth: 1.5, borderColor: C.ink }}>
              <Row label={`ค่าพลังงาน (เฉลี่ย ${share.energyRate.toFixed(4)})`} value={baht(share.energy)} />
              <Row label={`Ft (${share.ftRate.toFixed(4)})`} value={baht(share.ft)} />
              <Row label={`ค่าบริการ (${(share.servicePct * 100).toFixed(1)}%)`} value={baht(share.service)} />
              <Divider />
              <Row label="รวมก่อน VAT" value={baht(share.subtotal)} />
              <Row label="VAT 7%" value={baht(share.vat)} />
            </View>
            {share.estimated && <T v="small" style={{ color: C.ink }}>* บางช่วงยังไม่มีบิลจริง ใช้ค่าประมาณจากมิเตอร์</T>}
          </>
        )}
      </Card>

      <Card>
        <T v="h">พร้อมเพย์ผู้รับเงิน</T>
        <Field label="เบอร์โทร หรือ เลขบัตรประชาชน" keyboardType="number-pad" value={ppId} onChangeText={setPpId} />
        <Field label="ชื่อที่แสดงในใบเสร็จ (ไม่บังคับ)" value={name} onChangeText={setName} />
      </Card>

      <Button title="สร้างใบเสร็จ" icon="receipt" onPress={create} busy={busy} disabled={!share || share.kwh <= 0} />
    </Screen>
  );
}
