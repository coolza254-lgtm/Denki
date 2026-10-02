// AC usage: import screenshots (several at once), or fix one day by hand.
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Field, IconButton, Screen, ScreenHeader, Segmented, T, kwh } from '../../components/ui';
import { Icon } from '../../components/Icon';
import * as db from '../../lib/db';
import { imageUri } from '../../lib/images';
import { daysInMonth, formatThaiDate, formatThaiMonth, parseISODate, today } from '../../lib/dates';
import { C, CAT_COLOR, F, R } from '../../theme';

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

  // The month is chosen first (the one shown below), so it is never misread.
  const importShot = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled || r.assets.length === 0) return;
    router.push({ pathname: '/ac-confirm', params: { ac: String(ac), month, uris: JSON.stringify([r.assets[0].uri]) } });
  };

  const color = ac === 1 ? CAT_COLOR.ac1 : CAT_COLOR.ac2;
  const soft = ac === 1 ? C.skySoft : C.coralSoft;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const [y, m] = month.split('-').map(Number);
  const monthDates = Array.from({ length: daysInMonth(y, m) }, (_, i) => `${month}-${pad(i + 1)}`);
  const firstWeekday = parseISODate(monthDates[0]).getDay();
  const values = monthDates.map((d) => byDate.get(d)?.kwh).filter((v): v is number => v != null);
  const total = values.reduce((s, v) => s + v, 0);
  const max = Math.max(...values, 1);

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
    <Screen tabs>
      <ScreenHeader title="แอร์" sub="ข้อมูลจากแอปแอร์ รายวัน" />
      <Segmented<db.AcId> value={ac} onChange={(v) => { setAc(v); setEditing(null); }}
        options={[{ value: 1, label: 'แอร์ของฉัน', color: C.skySoft }, { value: 2, label: 'แอร์พี่ชาย', color: C.coralSoft }]} />

      <Card>
        <T v="sub" style={{ textAlign: 'center' }}>1. เลือกเดือน</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconButton icon="left" size={40} onPress={() => { setMonth(shiftMonth(month, -1)); setEditing(null); }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T v="title" style={{ fontSize: 22 }}>{formatThaiMonth(month)}</T>
            <T v="small">รวม {kwh(total)} หน่วย · มีข้อมูล {values.length} วัน</T>
          </View>
          <IconButton icon="right" size={40} onPress={() => { setMonth(shiftMonth(month, 1)); setEditing(null); }} />
        </View>
      </Card>

      <Card color={soft}>
        <T v="sub" style={{ textAlign: 'center' }}>2. นำเข้าภาพหน้าจอของเดือนนี้</T>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scan" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h">ภาพของ {formatThaiMonth(month)}</T>
            <T v="sub">อ่านตารางในเครื่องอัตโนมัติ ฟรี ไม่ต้องใช้เน็ต แล้วตรวจก่อนบันทึก</T>
          </View>
        </View>
        <Button title="เลือกภาพหน้าจอ" icon="image" onPress={importShot} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row' }}>
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
            <T key={d} v="small" style={{ width: '14.28%', textAlign: 'center' }}>{d}</T>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
          {Array.from({ length: firstWeekday }, (_, i) => <View key={`b${i}`} style={{ width: '14.28%' }} />)}
          {monthDates.map((d) => {
            const v = byDate.get(d)?.kwh;
            const on = editing?.date === d;
            const heat = v != null ? 0.15 + 0.85 * (v / max) : 0;
            return (
              <Pressable key={d} onPress={() => startEdit(d)} style={{ width: '14.28%', alignItems: 'center' }}>
                <View style={{
                  width: '88%', paddingVertical: 6, borderRadius: R.sm, alignItems: 'center',
                  borderWidth: on ? 2 : 1.5, borderColor: on ? C.ink : v != null ? color : C.line,
                  backgroundColor: v != null ? `${color}${Math.round(heat * 0.35 * 255).toString(16).padStart(2, '0')}` : '#fff',
                }}>
                  <T v="small" style={{ color: C.inkSoft, lineHeight: 15 }}>{Number(d.slice(8))}</T>
                  <T v="small" style={{ fontFamily: F.semi, color: v != null ? C.ink : '#D5D9DE', lineHeight: 16 }}>
                    {v != null ? kwh(v, 1) : '·'}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </View>
        <T v="small" style={{ textAlign: 'center' }}>สีเข้ม = ใช้เยอะ · แตะวันที่เพื่อแก้ไข</T>

        {editing && (
          <View style={{ gap: 10, backgroundColor: C.voltSoft, padding: 14, borderRadius: R.md, borderWidth: 2, borderColor: C.ink }}>
            <Field label={`วันที่ ${formatThaiDate(editing.date)} (เว้นว่าง = ลบ)`} keyboardType="decimal-pad"
              value={editing.value} onChangeText={(t) => setEditing({ ...editing, value: t })} autoFocus />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Button kind="ghost" title="ยกเลิก" small onPress={() => setEditing(null)} /></View>
              <View style={{ flex: 1 }}><Button title="บันทึก" small icon="check" onPress={saveEdit} /></View>
            </View>
            {editing.shot && (
              <Image source={{ uri: imageUri(editing.shot) }} style={{ width: '100%', height: 420, borderRadius: R.sm }} resizeMode="contain" />
            )}
          </View>
        )}
      </Card>
    </Screen>
  );
}
