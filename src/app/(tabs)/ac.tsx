// AC usage: upload a screenshot of the AC app, or fix a single day by hand.
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, C, Card, Field, H, Screen, Segmented, Sub, kwh } from '../../components/ui';
import * as db from '../../lib/db';
import { pickImage, imageUri } from '../../lib/images';
import { daysInMonth, formatThaiDate, formatThaiMonth, today } from '../../lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');

function shiftMonth(key: string, n: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export default function Ac() {
  const [ac, setAc] = useState<db.AcId>(2);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [days, setDays] = useState<db.AcDay[]>([]);
  const [editing, setEditing] = useState<{ date: string; value: string; shot: string | null } | null>(null);

  const load = useCallback(() => { db.listAcDays(ac).then(setDays); }, [ac]);
  useFocusEffect(load);

  const upload = async () => {
    const uri = await pickImage('library');
    if (uri) router.push({ pathname: '/ac-confirm', params: { ac: String(ac), uri } });
  };

  const byDate = new Map(days.map((d) => [d.date, d]));
  const [y, m] = month.split('-').map(Number);
  const monthDates = Array.from({ length: daysInMonth(y, m) }, (_, i) => `${month}-${pad(i + 1)}`);
  const total = monthDates.reduce((s, d) => s + (byDate.get(d)?.kwh ?? 0), 0);

  const startEdit = async (date: string) => {
    const d = byDate.get(date);
    const shot = d?.screenshotId ? await db.getScreenshot(d.screenshotId) : null;
    setEditing({ date, value: d ? String(d.kwh) : '', shot: shot?.path ?? null });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.value.trim() === '') {
      await db.deleteAcDay(ac, editing.date);
    } else {
      const v = Number(editing.value);
      if (!Number.isFinite(v) || v < 0 || v > 30) return Alert.alert('ค่าไม่ถูกต้อง', 'ใส่ 0–30 หน่วย');
      await db.upsertAcDays(ac, [{ date: editing.date, kwh: v }], byDate.get(editing.date)?.screenshotId ?? null);
    }
    setEditing(null);
    load();
  };

  return (
    <Screen>
      <Segmented<db.AcId> value={ac} onChange={(v) => { setAc(v); setEditing(null); }}
        options={[{ value: 1, label: 'แอร์ของฉัน' }, { value: 2, label: 'แอร์พี่ชาย' }]} />

      <Card>
        <H>อัปโหลดภาพหน้าจอ</H>
        <Sub>แคปหน้าปฏิทินรายวันจากแอปแอร์ (1 ภาพ = ทั้งเดือน) อัปซ้ำได้ ระบบจะอัปเดตเฉพาะวันที่เปลี่ยน</Sub>
        <Button title="📷 เลือกภาพหน้าจอ" onPress={upload} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 56 }}><Button kind="secondary" title="◀" onPress={() => setMonth(shiftMonth(month, -1))} /></View>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text }}>
            {formatThaiMonth(month)}
          </Text>
          <View style={{ width: 56 }}><Button kind="secondary" title="▶" onPress={() => setMonth(shiftMonth(month, 1))} /></View>
        </View>
        <Sub>รวม {kwh(total)} หน่วย · แตะวันที่เพื่อแก้ไข</Sub>

        {editing && (
          <View style={{ gap: 8, backgroundColor: C.primarySoft, padding: 12, borderRadius: 10 }}>
            <Field label={`แก้ค่าวันที่ ${formatThaiDate(editing.date)} (เว้นว่าง = ลบ)`} keyboardType="decimal-pad"
              value={editing.value} onChangeText={(t) => setEditing({ ...editing, value: t })} autoFocus />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Button kind="secondary" title="ยกเลิก" onPress={() => setEditing(null)} /></View>
              <View style={{ flex: 1 }}><Button title="บันทึก" onPress={saveEdit} /></View>
            </View>
            {editing.shot && (
              <Image source={{ uri: imageUri(editing.shot) }} style={{ width: '100%', height: 420 }} resizeMode="contain" />
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {monthDates.map((d) => {
            const v = byDate.get(d);
            return (
              <Pressable key={d} onPress={() => startEdit(d)}
                style={{ width: '14.28%', paddingVertical: 8, alignItems: 'center', borderRadius: 8,
                  backgroundColor: editing?.date === d ? C.primarySoft : undefined }}>
                <Text style={{ fontSize: 13, color: C.sub }}>{Number(d.slice(8))}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: v ? (ac === 1 ? C.ac1 : C.ac2) : '#CED4DA' }}>
                  {v ? kwh(v.kwh) : '–'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
