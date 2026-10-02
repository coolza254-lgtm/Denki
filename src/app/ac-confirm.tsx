// Shows the screenshot beside the values read from it; one tap to save.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, C, Card, H, Screen, Sub, kwh } from '../components/ui';
import * as db from '../lib/db';
import { extractAcScreenshot, ExtractError } from '../lib/acExtract';
import { checkExtracted, type Extracted, type Warning } from '../lib/acCheck';
import { fileHash, storeImage } from '../lib/images';
import { daysInMonth, formatThaiDate, formatThaiMonth } from '../lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');
const AC_LABEL = { 1: 'แอร์ของฉัน', 2: 'แอร์พี่ชาย' } as const;

export default function AcConfirm() {
  const params = useLocalSearchParams<{ ac: string; uri: string }>();
  const ac = (Number(params.ac) === 1 ? 1 : 2) as db.AcId;
  const uri = params.uri;

  const [status, setStatus] = useState<'reading' | 'ready' | 'error'>('reading');
  const [error, setError] = useState('');
  const [data, setData] = useState<Extracted | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [existing, setExisting] = useState<Map<string, number>>(new Map());
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [hash, setHash] = useState('');
  const [bigImage, setBigImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const read = async () => {
    setStatus('reading');
    try {
      const [h, all] = await Promise.all([fileHash(uri), db.listAcDays(ac)]);
      setHash(h);
      const dup = await db.findScreenshotByHash(h);
      setDuplicate(dup ? `ภาพนี้เคยอัปโหลดแล้วเมื่อ ${formatThaiDate(dup.createdAt.slice(0, 10))}` : null);
      setExisting(new Map(all.map((d) => [d.date, d.kwh])));

      const ex = await extractAcScreenshot(uri);
      const monthKey = `${ex.year}-${pad(ex.month)}`;
      const recent = all.filter((d) => !d.date.startsWith(monthKey)).slice(-30).map((d) => d.kwh);
      apply(ex, recent);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof ExtractError ? e.message : `อ่านภาพไม่สำเร็จ: ${String(e)}`);
      setStatus('error');
    }
  };

  const apply = (ex: Extracted, recent: number[]) => {
    setData(ex);
    setWarnings(checkExtracted(ex, recent));
    const v: Record<number, string> = {};
    for (const d of ex.days) v[d.day] = d.kwh == null ? '' : String(d.kwh);
    setValues(v);
  };

  const manual = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ day: i + 1, kwh: null }));
    apply({ year: y, month: m, days, notes: '' }, []);
    setStatus('ready');
  };

  useEffect(() => { read(); }, []);

  const save = async () => {
    if (!data) return;
    const maxDay = daysInMonth(data.year, data.month);
    const rows: { date: string; kwh: number }[] = [];
    for (const [day, raw] of Object.entries(values)) {
      if (raw.trim() === '') continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0) return Alert.alert('ค่าไม่ถูกต้อง', `วันที่ ${day}: "${raw}"`);
      if (Number(day) > maxDay) continue;
      rows.push({ date: `${data.year}-${pad(data.month)}-${pad(Number(day))}`, kwh: v });
    }
    if (rows.length === 0) return Alert.alert('ไม่มีค่าที่จะบันทึก');
    setSaving(true);
    const path = storeImage(uri, 'ac');
    const shotId = await db.addScreenshot(ac, `${data.year}-${pad(data.month)}`, path, hash);
    await db.upsertAcDays(ac, rows, shotId);
    setSaving(false);
    router.back();
  };

  const changed = data
    ? Object.entries(values).filter(([day, raw]) => {
        if (raw.trim() === '') return false;
        const old = existing.get(`${data.year}-${pad(data.month)}-${pad(Number(day))}`);
        return old == null || Math.abs(old - Number(raw)) > 1e-9;
      }).length
    : 0;
  const sum = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <Screen>
      <Pressable onPress={() => setBigImage(!bigImage)}>
        <Image source={{ uri }} style={{ width: '100%', height: bigImage ? 900 : 360, borderRadius: 12, backgroundColor: '#fff' }}
          resizeMode="contain" />
        <Sub>แตะภาพเพื่อ{bigImage ? 'ย่อ' : 'ขยาย'}</Sub>
      </Pressable>

      {duplicate && <Card style={{ backgroundColor: '#FFF9DB' }}><Text>⚠️ {duplicate}</Text></Card>}

      {status === 'reading' && (
        <Card style={{ alignItems: 'center' }}>
          <ActivityIndicator color={C.primary} size="large" />
          <Sub>กำลังอ่านค่าจากภาพ…</Sub>
        </Card>
      )}

      {status === 'error' && (
        <Card>
          <Text style={{ color: C.warn }}>{error}</Text>
          <Button title="ลองอีกครั้ง" onPress={read} />
          <Button kind="secondary" title="กรอกเอง" onPress={manual} />
        </Card>
      )}

      {status === 'ready' && data && (
        <>
          <Card>
            <H>{AC_LABEL[ac]} · {formatThaiMonth(`${data.year}-${pad(data.month)}`)}</H>
            <Sub>รวม {kwh(sum)} หน่วย · เปลี่ยนจากเดิม {changed} วัน</Sub>
            {warnings.map((w, i) => <Text key={i} style={{ color: C.warn }}>⚠️ {w.message}</Text>)}
            {data.notes ? <Text style={{ color: C.sub }}>หมายเหตุจากการอ่าน: {data.notes}</Text> : null}
          </Card>

          <Card>
            <Sub>ตรวจให้ตรงกับภาพ แก้ได้ทุกช่อง (เว้นว่าง = ไม่มีข้อมูล)</Sub>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Object.keys(values).map(Number).sort((a, b) => a - b).map((day) => {
                const old = existing.get(`${data.year}-${pad(data.month)}-${pad(day)}`);
                const flagged = warnings.some((w) => w.day === day);
                return (
                  <View key={day} style={{ width: '23%', gap: 2 }}>
                    <Text style={{ fontSize: 12, color: flagged ? C.warn : C.sub }}>วันที่ {day}</Text>
                    <TextInput value={values[day]} keyboardType="decimal-pad"
                      onChangeText={(t) => setValues({ ...values, [day]: t })}
                      style={{ borderWidth: 1, borderColor: flagged ? C.warn : C.line, borderRadius: 8, padding: 6,
                        fontSize: 15, textAlign: 'center', backgroundColor: '#fff', color: C.text }} />
                    {old != null && String(old) !== values[day] && (
                      <Text style={{ fontSize: 11, color: C.sub }}>เดิม {old}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>

          <Button title={`ยืนยันและบันทึก`} onPress={save} busy={saving} />
        </>
      )}
    </Screen>
  );
}
