// Type in the main meter number. Date/time defaults to now.
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Button, C, Card, Field, H, Screen, Sub, kwh } from '../../components/ui';
import * as db from '../../lib/db';
import type { MeterReading } from '../../lib/usage';
import { daysBetween, formatThaiDate, formatTime, parseISODateTime, toISODateTime } from '../../lib/dates';

export default function Meter() {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [value, setValue] = useState('');
  const [at, setAt] = useState(toISODateTime(new Date()));
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    db.listReadings().then(setReadings);
    setAt(toISODateTime(new Date()));
  }, []);
  useFocusEffect(load);

  const pick = (mode: 'date' | 'time') =>
    DateTimePickerAndroid.open({
      value: parseISODateTime(at),
      mode,
      is24Hour: true,
      onChange: (e, d) => { if (e.type === 'set' && d) setAt(toISODateTime(d)); },
    });

  const save = async () => {
    const v = Number(value.replace(/,/g, ''));
    if (!value || !Number.isFinite(v) || v < 0) return Alert.alert('ใส่เลขมิเตอร์ให้ถูกต้อง');
    const before = [...readings].reverse().find((r) => r.readAt <= at);
    const after = readings.find((r) => r.readAt > at);
    if (before && v < before.value)
      return Alert.alert('เลขน้อยกว่าครั้งก่อน', `ครั้งก่อน (${formatThaiDate(before.readAt)}) จดได้ ${before.value}`);
    if (after && v > after.value)
      return Alert.alert('เลขมากกว่าครั้งถัดไป', `ครั้งถัดไป (${formatThaiDate(after.readAt)}) จดได้ ${after.value}`);

    const doSave = async () => {
      setBusy(true);
      await db.addReading(at, v);
      setValue('');
      setBusy(false);
      load();
    };
    if (before) {
      const days = Math.max(1, daysBetween(before.readAt, at));
      const perDay = (v - before.value) / days;
      if (perDay > 60) {
        return Alert.alert('ใช้ไฟเยอะผิดปกติ', `เฉลี่ย ${kwh(perDay, 0)} หน่วย/วัน ยืนยันบันทึก?`, [
          { text: 'แก้ไข', style: 'cancel' },
          { text: 'บันทึก', onPress: doSave },
        ]);
      }
    }
    doSave();
  };

  const confirmDelete = (r: MeterReading) =>
    Alert.alert('ลบรายการนี้?', `${formatThaiDate(r.readAt)} ${formatTime(r.readAt)} — ${r.value}`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => { await db.deleteReading(r.id); load(); } },
    ]);

  const recent = readings.slice(-30).reverse();
  const last = readings[readings.length - 1];

  return (
    <Screen>
      <Card>
        <H>จดเลขมิเตอร์หน้าบ้าน</H>
        <Field label={last ? `ครั้งล่าสุด ${last.value} (${formatThaiDate(last.readAt)})` : 'เลขบนมิเตอร์'}
          big keyboardType="decimal-pad" value={value} onChangeText={setValue} placeholder="0000" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={chip} onPress={() => pick('date')}>
            <Text style={chipText}>📅 {formatThaiDate(at)}</Text>
          </Pressable>
          <Pressable style={chip} onPress={() => pick('time')}>
            <Text style={chipText}>🕒 {formatTime(at)}</Text>
          </Pressable>
        </View>
        <Button title="บันทึก" onPress={save} busy={busy} />
      </Card>

      <Card>
        <H>ประวัติ</H>
        {recent.length === 0 && <Sub>ยังไม่มีข้อมูล</Sub>}
        {recent.map((r, i) => {
          const prev = recent[i + 1];
          const diff = prev ? r.value - prev.value : null;
          const days = prev ? daysBetween(prev.readAt, r.readAt) : 0;
          return (
            <Pressable key={r.id} onLongPress={() => confirmDelete(r)}
              style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
              <Text style={{ flex: 1, color: C.text }}>{formatThaiDate(r.readAt)} {formatTime(r.readAt)}</Text>
              <Text style={{ width: 80, textAlign: 'right', color: C.text, fontWeight: '600' }}>{r.value}</Text>
              <Text style={{ width: 100, textAlign: 'right', color: C.sub }}>
                {diff == null ? '' : `+${kwh(diff, 1)}${days > 1 ? ` /${days}วัน` : ''}`}
              </Text>
            </Pressable>
          );
        })}
        {recent.length > 0 && <Sub>กดค้างที่รายการเพื่อลบ</Sub>}
      </Card>
    </Screen>
  );
}

const chip = { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, backgroundColor: '#fff' } as const;
const chipText = { fontSize: 16, color: C.text, textAlign: 'center' } as const;
