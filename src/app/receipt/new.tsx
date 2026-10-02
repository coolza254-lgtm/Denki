// Pick an AC and a date range, check the breakdown, enter PromptPay, create.
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, DateButton, Field, H, Row, Screen, Segmented, Sub, baht, kwh, C } from '../../components/ui';
import * as db from '../../lib/db';
import { loadDataset, priceRange, type Dataset } from '../../lib/calc';
import { addDays, today } from '../../lib/dates';
import { isValidPromptPayId } from '../../lib/promptpay';

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
        options={[{ value: 1, label: 'แอร์ของฉัน' }, { value: 2, label: 'แอร์พี่ชาย' }]} />
      <Card>
        <DateButton label="ตั้งแต่วันที่" value={start} onChange={setStart} />
        <DateButton label="ถึงวันที่" value={end} onChange={setEnd} />
        {start > end && <Sub color={C.warn}>วันเริ่มต้องไม่เกินวันสุดท้าย</Sub>}
      </Card>

      <Card>
        <H>รายละเอียด</H>
        {!share ? (
          <Sub color={C.warn}>คำนวณไม่ได้ — ต้องมีเลขมิเตอร์หรือบิลจริงของรอบนั้น</Sub>
        ) : (
          <>
            <Row label="หน่วยแอร์" value={`${kwh(share.kwh)} หน่วย`} />
            <Row label={`ค่าพลังงาน (เฉลี่ย ${share.energyRate.toFixed(4)} บ./หน่วย)`} value={baht(share.energy)} />
            <Row label={`Ft (${share.ftRate.toFixed(4)} บ./หน่วย)`} value={baht(share.ft)} />
            <Row label={`ค่าบริการ (${(share.servicePct * 100).toFixed(1)}%)`} value={baht(share.service)} />
            <Row label="รวมก่อน VAT" value={baht(share.subtotal)} />
            <Row label="VAT 7%" value={baht(share.vat)} />
            <Row label="ยอดชำระ" value={`฿${baht(share.total)}`} bold color={C.primary} />
            {share.estimated && <Sub>* บางช่วงยังไม่มีบิลจริง ใช้ค่าประมาณจากมิเตอร์</Sub>}
          </>
        )}
      </Card>

      <Card>
        <H>พร้อมเพย์ผู้รับเงิน</H>
        <Field label="เบอร์โทร หรือ เลขบัตรประชาชน" keyboardType="number-pad" value={ppId} onChangeText={setPpId} />
        <Field label="ชื่อที่แสดงในใบเสร็จ (ไม่บังคับ)" value={name} onChangeText={setName} />
      </Card>

      <Button title="สร้างใบเสร็จ" onPress={create} busy={busy} disabled={!share || share.kwh <= 0} />
    </Screen>
  );
}
