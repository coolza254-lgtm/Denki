// The receipt as it appears in the shared image.
import { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { baht, kwh } from './ui';
import type { Receipt } from '../lib/db';
import type { Share } from '../lib/tariff';
import { promptPayPayload } from '../lib/promptpay';
import { formatThaiDate, daysBetween } from '../lib/dates';
import { C, F } from '../theme';

const AC_LABEL = { 1: 'แอร์ของฉัน', 2: 'แอร์พี่ชาย' } as const;
const LOGO = require('../../assets/logo-full.png');

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const st = { fontFamily: bold ? F.bold : F.regular, fontSize: bold ? 20 : 14, color: C.ink };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 10 }}>
      <Text style={[st, { flexShrink: 1, color: bold ? C.ink : C.inkSoft }]}>{label}</Text>
      <Text style={[st, { fontVariant: ['tabular-nums'] }]}>{value}</Text>
    </View>
  );
}

function formatId(id: string) {
  const d = id.replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

export const ReceiptView = forwardRef<View, { receipt: Receipt }>(({ receipt: r }, ref) => {
  const s: Share = JSON.parse(r.breakdown);
  const days = daysBetween(r.startDate, r.endDate) + 1;
  return (
    <View ref={ref} collapsable={false} style={{ backgroundColor: C.bg, padding: 12 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 2, borderColor: C.ink, overflow: 'hidden' }}>
        <View style={{ backgroundColor: C.volt, padding: 18, alignItems: 'center', gap: 2, borderBottomWidth: 2, borderColor: C.ink }}>
          <Image source={LOGO} style={{ width: 62, height: 66 }} resizeMode="contain" />
          <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.ink }}>ใบแจ้งค่าไฟฟ้า</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.ink }}>{AC_LABEL[r.ac]}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.ink }}>
            {formatThaiDate(r.startDate)} – {formatThaiDate(r.endDate)} · {days} วัน
          </Text>
        </View>

        <View style={{ padding: 18, gap: 2 }}>
          <Line label="หน่วยที่ใช้" value={`${kwh(s.kwh)} หน่วย`} />
          <View style={{ height: 1.5, backgroundColor: C.line, marginVertical: 6 }} />
          <Line label={`ค่าพลังงาน (${s.energyRate.toFixed(4)} บ./หน่วย)`} value={baht(s.energy)} />
          <Line label={`ค่า Ft (${s.ftRate.toFixed(4)} บ./หน่วย)`} value={baht(s.ft)} />
          <Line label={`ค่าบริการ (ส่วนแบ่ง ${(s.servicePct * 100).toFixed(1)}%)`} value={baht(s.service)} />
          <Line label="รวมก่อนภาษี" value={baht(s.subtotal)} />
          <Line label={`ภาษีมูลค่าเพิ่ม ${Math.round(s.vatRate * 100)}%`} value={baht(s.vat)} />
          <View style={{ height: 2, backgroundColor: C.ink, marginVertical: 8, borderRadius: 1 }} />
          <Line label="ยอดชำระ" value={`฿${baht(s.total)}`} bold />

          <View style={{ alignItems: 'center', marginTop: 14, gap: 6 }}>
            <View style={{ padding: 10, borderRadius: 18, borderWidth: 2, borderColor: C.ink, backgroundColor: '#fff' }}>
              <QRCode value={promptPayPayload(r.promptpayId, s.total)} size={190} color={C.ink} />
            </View>
            <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.ink }}>พร้อมเพย์ {formatId(r.promptpayId)}</Text>
            {r.payeeName ? <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.ink }}>{r.payeeName}</Text> : null}
            <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.muted }}>สแกนด้วยแอปธนาคาร ยอดเงินใส่ไว้ให้แล้ว</Text>
          </View>

          {r.paid && (
            <View style={{ alignSelf: 'center', marginTop: 10, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999, borderWidth: 2, borderColor: C.mint, transform: [{ rotate: '-4deg' }] }}>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.mint }}>ชำระแล้ว ✓</Text>
            </View>
          )}

          <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 16 }}>
            คิดจากอัตราเฉลี่ยของบิลบ้าน (ขั้นบันได กฟน.) + Ft + ค่าบริการตามสัดส่วนหน่วย + VAT
            {s.estimated ? '\n* บางช่วงยังไม่มีบิลจริง ใช้ค่าประมาณจากมิเตอร์' : ''}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>สร้างด้วย Denki ⚡</Text>
    </View>
  );
});
