// Type in the main meter number on a big "LCD" display. Date/time = now.
import { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Pressable, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Badge, Button, Card, DateButton, EmptyState, Field, Screen, ScreenHeader, Squish, T, baht, kwh, success } from '../../components/ui';
import { Icon } from '../../components/Icon';
import * as db from '../../lib/db';
import type { MeterReading } from '../../lib/usage';
import { addDays, cycleFor, daysBetween, formatThaiDate, formatThaiShort, formatTime, parseISODateTime, toISODateTime, today } from '../../lib/dates';
import { houseBill, type Tariff } from '../../lib/tariff';
import { C, F, R } from '../../theme';

export default function Meter() {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [value, setValue] = useState('');
  const [at, setAt] = useState(toISODateTime(new Date()));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const toastA = useRef(new Animated.Value(0)).current;
  const [tariff, setTariff] = useState<Tariff | null>(null);
  const [meaEdit, setMeaEdit] = useState<{ value: string; date: string } | null>(null);
  const [showMeaForm, setShowMeaForm] = useState(false);

  const load = useCallback(() => {
    db.listReadings().then(setReadings);
    db.getSettings().then((st) => {
      setTariff(st.tariff);
      // Default MEA reading date: the last cycle end on or before today.
      const lastCut = addDays(cycleFor(today(), st.cycleEndDay).start, -1);
      setMeaEdit((m) => m ?? { value: '', date: lastCut });
    });
    setAt(toISODateTime(new Date()));
  }, []);

  const saveMea = async () => {
    if (!meaEdit) return;
    const v = Number(meaEdit.value.replace(/,/g, ''));
    if (!meaEdit.value || !Number.isFinite(v) || v < 0) return Alert.alert('ใส่เลขที่ กฟน. จดให้ถูกต้อง');
    await db.setMeaReading(`${meaEdit.date}T09:00`, v);
    success();
    setMeaEdit(null);
    setShowMeaForm(false);
    load();
  };
  useFocusEffect(load);

  const showToast = (msg: string) => {
    setToast(msg);
    toastA.setValue(0);
    Animated.sequence([
      Animated.spring(toastA, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
      Animated.delay(1800),
      Animated.timing(toastA, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

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
      success();
      setValue('');
      setBusy(false);
      showToast(before ? `+${kwh(v - before.value, 1)} หน่วย จากครั้งก่อน` : 'บันทึกแล้ว!');
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
  const mea = [...readings].reverse().find((r) => r.source === 'mea');
  const sinceMea = mea && last && last.readAt > mea.readAt ? last.value - mea.value : null;
  const editingMea = !mea || showMeaForm;

  return (
    <Screen tabs>
      <ScreenHeader title="จดมิเตอร์" sub={last ? `ครั้งล่าสุด ${formatThaiShort(last.readAt)} · ${last.value}` : 'มิเตอร์หน้าบ้าน'} />

      <Card color={C.voltSoft}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="receipt" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h">เลขที่ กฟน. จดรอบล่าสุด</T>
            <T v="small">"เลขอ่านครั้งหลัง" บนบิลค่าไฟ ใช้เป็นจุดเริ่มนับหน่วย</T>
          </View>
        </View>

        {mea && !showMeaForm && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <T v="small">จดเมื่อ {formatThaiDate(mea.readAt)}</T>
                <T v="title" style={{ fontFamily: F.bold }}>{mea.value}</T>
              </View>
              <Button kind="ghost" small title="แก้ไข" onPress={() => {
                setMeaEdit({ value: String(mea.value), date: mea.readAt.slice(0, 10) });
                setShowMeaForm(true);
              }} />
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: R.md, borderWidth: 2, borderColor: C.ink, padding: 12, gap: 2 }}>
              {sinceMea == null ? (
                <T v="sub">จดเลขมิเตอร์ด้านล่าง แล้วจะเห็นว่าใช้ไปกี่หน่วยตั้งแต่ กฟน. จด</T>
              ) : (
                <>
                  <T v="sub">ใช้ไปแล้วตั้งแต่ กฟน. จด ({daysBetween(mea.readAt, last!.readAt)} วัน)</T>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <T v="title" style={{ fontFamily: F.bold }}>{kwh(sinceMea, 1)} <T v="sub">หน่วย</T></T>
                    {tariff && <T v="h">≈ ฿{baht(houseBill(sinceMea, tariff).total)}</T>}
                  </View>
                  <T v="small">{mea.value} → {last!.value} (รวม Ft ค่าบริการ VAT แล้ว ถ้าตัดบิลวันนี้)</T>
                </>
              )}
            </View>
          </>
        )}

        {editingMea && meaEdit && (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="เลขที่ กฟน. จด" keyboardType="decimal-pad" value={meaEdit.value} placeholder="9961"
                  onChangeText={(t) => setMeaEdit({ ...meaEdit, value: t })} />
              </View>
              <View style={{ flex: 1 }}>
                <DateButton label="วันที่จด" value={meaEdit.date} onChange={(d) => setMeaEdit({ ...meaEdit, date: d })} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {mea && <View style={{ flex: 1 }}><Button kind="ghost" small title="ยกเลิก" onPress={() => setShowMeaForm(false)} /></View>}
              <View style={{ flex: 1 }}><Button small icon="check" title="บันทึกเลข กฟน." onPress={saveMea} /></View>
            </View>
          </>
        )}
      </Card>

      <Card color={C.ink} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="bolt" size={18} color={C.volt} fill={C.volt} />
          <T v="sub" style={{ color: '#C9D0DA' }}>เลขบนมิเตอร์ (kWh)</T>
        </View>
        <View style={{ backgroundColor: '#1C242F', borderRadius: R.md, borderWidth: 2, borderColor: '#3A4656', paddingVertical: 6 }}>
          <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad"
            placeholder={last ? String(last.value) : '0000'} placeholderTextColor="#4A5666"
            style={{ fontFamily: F.bold, fontSize: 52, color: C.volt, textAlign: 'center', letterSpacing: 6, paddingVertical: 4 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([['date', 'calendar', formatThaiDate(at)], ['time', 'clock', formatTime(at)]] as const).map(([mode, icon, label]) => (
            <Pressable key={mode} onPress={() => pick(mode)}
              style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: R.md, backgroundColor: '#364252' }}>
              <Icon name={icon} size={18} color="#fff" />
              <T v="body" style={{ color: '#fff' }}>{label}</T>
            </Pressable>
          ))}
        </View>
        <Button title="บันทึก" icon="bolt" onPress={save} busy={busy} />
      </Card>

      <Animated.View pointerEvents="none" style={{
        position: 'absolute', alignSelf: 'center', top: 120, opacity: toastA,
        transform: [{ scale: toastA.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}>
        <Badge icon="check" label={toast} bg={C.mintSoft} />
      </Animated.View>

      <T v="h">ประวัติ</T>
      <Card style={{ paddingVertical: 8, gap: 0 }}>
        {recent.length === 0 && <EmptyState title="ยังไม่มีข้อมูล" text="จดเลขมิเตอร์ครั้งแรกด้านบนได้เลย" />}
        {recent.map((r, i) => {
          const prev = recent[i + 1];
          const diff = prev ? r.value - prev.value : null;
          const days = prev ? daysBetween(prev.readAt, r.readAt) : 0;
          return (
            <Squish key={r.id} onLongPress={() => confirmDelete(r)} depth={0} haptic={false}
              style={{ borderWidth: 0, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10,
                borderTopWidth: i ? 1.5 : 0, borderColor: C.line, borderRadius: 0 }}>
              <View style={{ flex: 1 }}>
                <T v="body">{formatThaiShort(r.readAt)}</T>
                {r.source === 'mea'
                  ? <Badge label="กฟน. จด" bg={C.voltSoft} />
                  : <T v="small">{formatTime(r.readAt)} น.</T>}
              </View>
              <T v="num" style={{ fontSize: 17 }}>{r.value}</T>
              <View style={{ width: 96, alignItems: 'flex-end' }}>
                {diff != null && <Badge label={`+${kwh(diff, 1)}${days > 1 ? ` /${days}วัน` : ''}`} bg={days > 1 ? C.voltSoft : C.mintSoft} />}
              </View>
            </Squish>
          );
        })}
        {recent.length > 0 && <T v="small" style={{ textAlign: 'center', paddingTop: 6 }}>กดค้างที่รายการเพื่อลบ</T>}
      </Card>
    </Screen>
  );
}
