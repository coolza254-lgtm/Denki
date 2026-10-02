// The receipt as it appears in the shared image.
import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { C, baht, kwh } from './ui';
import type { Receipt } from '../lib/db';
import type { Share } from '../lib/tariff';
import { promptPayPayload } from '../lib/promptpay';
import { formatThaiDate, daysBetween } from '../lib/dates';

const AC_LABEL = { 1: 'แอร์ของฉัน', 2: 'แอร์พี่ชาย' } as const;

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ fontSize: bold ? 17 : 14, fontWeight: bold ? '700' : '400', color: C.text, flexShrink: 1 }}>{label}</Text>
      <Text style={{ fontSize: bold ? 17 : 14, fontWeight: bold ? '700' : '400', color: C.text }}>{value}</Text>
    </View>
  );
}

function maskId(id: string) {
  const d = id.replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

export const ReceiptView = forwardRef<View, { receipt: Receipt }>(({ receipt: r }, ref) => {
  const s: Share = JSON.parse(r.breakdown);
  const days = daysBetween(r.startDate, r.endDate) + 1;
  return (
    <View ref={ref} collapsable={false}
      style={{ backgroundColor: '#fff', padding: 20, gap: 4, borderRadius: 12, borderWidth: 1, borderColor: C.line }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary, textAlign: 'center' }}>ใบแจ้งค่าไฟฟ้า</Text>
      <Text style={{ fontSize: 15, color: C.text, textAlign: 'center' }}>{AC_LABEL[r.ac]}</Text>
      <Text style={{ fontSize: 14, color: C.sub, textAlign: 'center', marginBottom: 8 }}>
        {formatThaiDate(r.startDate)} – {formatThaiDate(r.endDate)} ({days} วัน)
      </Text>

      <Line label="จำนวนหน่วยที่ใช้" value={`${kwh(s.kwh)} หน่วย`} />
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />
      <Line label={`ค่าพลังงาน (${kwh(s.kwh)} × ${s.energyRate.toFixed(4)})`} value={baht(s.energy)} />
      <Line label={`ค่า Ft (${kwh(s.kwh)} × ${s.ftRate.toFixed(4)})`} value={baht(s.ft)} />
      <Line label={`ค่าบริการ (ส่วนแบ่ง ${(s.servicePct * 100).toFixed(1)}%)`} value={baht(s.service)} />
      <Line label="รวมก่อนภาษี" value={baht(s.subtotal)} />
      <Line label={`ภาษีมูลค่าเพิ่ม ${Math.round(s.vatRate * 100)}%`} value={baht(s.vat)} />
      <View style={{ height: 1, backgroundColor: C.text, marginVertical: 4 }} />
      <Line label="ยอดชำระ" value={`฿${baht(s.total)}`} bold />

      <View style={{ alignItems: 'center', marginTop: 12, gap: 6 }}>
        <QRCode value={promptPayPayload(r.promptpayId, s.total)} size={200} />
        <Text style={{ fontSize: 14, color: C.text }}>พร้อมเพย์ {maskId(r.promptpayId)}</Text>
        {r.payeeName ? <Text style={{ fontSize: 14, color: C.text }}>{r.payeeName}</Text> : null}
        <Text style={{ fontSize: 12, color: C.sub }}>สแกนด้วยแอปธนาคาร ยอดเงินใส่ให้แล้ว</Text>
      </View>

      <Text style={{ fontSize: 11, color: C.sub, marginTop: 10 }}>
        คิดจากอัตราเฉลี่ยของบิลบ้าน (ขั้นบันได กฟน.) + Ft + ค่าบริการตามสัดส่วนหน่วย + VAT
        {s.estimated ? '\n* บางช่วงยังไม่มีบิลจริง ใช้ค่าประมาณจากมิเตอร์' : ''}
      </Text>
      {r.paid && (
        <Text style={{ fontSize: 16, fontWeight: '800', color: C.good, textAlign: 'center', marginTop: 6 }}>✓ ชำระแล้ว</Text>
      )}
    </View>
  );
});
