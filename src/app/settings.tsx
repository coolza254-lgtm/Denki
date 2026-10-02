import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Badge, Button, Card, Field, Row, Screen, T } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { Spark } from '../components/Spark';
import { C } from '../theme';
import * as db from '../lib/db';
import { DEFAULT_TARIFF } from '../lib/tariff';
import { getApiKey, setApiKey } from '../lib/acExtract';
import { cancelReminder, scheduleDailyReminder } from '../lib/notify';
import { exportBackup, pickBackup } from '../lib/backup';
import { checkForUpdate, currentBuild, installRelease } from '../lib/updater';

const num = (s: string) => Number(s.replace(/,/g, ''));
const LOGO = require('../../assets/logo-full.png');

function Head({ icon, title, bg = C.voltSoft }: { icon: IconName; title: string; bg?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} />
      </View>
      <T v="h">{title}</T>
    </View>
  );
}

export default function SettingsScreen() {
  const [s, setS] = useState<db.Settings | null>(null);
  const [tiers, setTiers] = useState<{ upTo: string; rate: string }[]>([]);
  const [ft, setFt] = useState('');
  const [service, setService] = useState('');
  const [vat, setVat] = useState('');
  const [cycleDay, setCycleDay] = useState('');
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(false);

  useFocusEffect(useCallback(() => {
    db.getSettings().then((x) => {
      setS(x);
      setTiers(x.tariff.tiers.map((t) => ({ upTo: t.upTo == null ? '' : String(t.upTo), rate: String(t.rate) })));
      setFt(String(x.tariff.ftRate));
      setService(String(x.tariff.serviceCharge));
      setVat(String(Math.round(x.tariff.vatRate * 100)));
      setCycleDay(String(x.cycleEndDay));
    });
    getApiKey().then((k) => setHasKey(!!k));
  }, []));

  if (!s) return null;

  const saveTariff = async () => {
    const parsed = tiers.map((t, i) => ({
      upTo: i === tiers.length - 1 ? null : num(t.upTo),
      rate: num(t.rate),
    }));
    const values = [num(ft), num(service), num(vat), num(cycleDay), ...parsed.map((t) => t.rate)];
    if (values.some((v) => !Number.isFinite(v)) || parsed.slice(0, -1).some((t) => !(t.upTo! > 0)))
      return Alert.alert('ตัวเลขไม่ถูกต้อง');
    const day = Math.round(num(cycleDay));
    if (day < 1 || day > 31) return Alert.alert('วันตัดรอบต้องอยู่ระหว่าง 1–31');
    await db.saveSettings({
      tariff: { tiers: parsed, ftRate: num(ft), serviceCharge: num(service), vatRate: num(vat) / 100 },
      cycleEndDay: day,
    });
    Alert.alert('บันทึกแล้ว');
  };

  const resetTariff = () => {
    setTiers(DEFAULT_TARIFF.tiers.map((t) => ({ upTo: t.upTo == null ? '' : String(t.upTo), rate: String(t.rate) })));
    setFt(String(DEFAULT_TARIFF.ftRate));
    setService(String(DEFAULT_TARIFF.serviceCharge));
    setVat('7');
  };

  const toggleReminder = async (on: boolean) => {
    if (on && !(await scheduleDailyReminder(s.reminderTime))) {
      return Alert.alert('ไม่ได้รับอนุญาตให้แจ้งเตือน', 'เปิดสิทธิ์การแจ้งเตือนของแอปในการตั้งค่าโทรศัพท์');
    }
    if (!on) await cancelReminder();
    await db.saveSettings({ reminderEnabled: on });
    setS({ ...s, reminderEnabled: on });
  };

  const pickTime = () => {
    const [h, m] = s.reminderTime.split(':').map(Number);
    const d = new Date(); d.setHours(h, m);
    DateTimePickerAndroid.open({
      value: d, mode: 'time', is24Hour: true,
      onChange: async (e, t) => {
        if (e.type !== 'set' || !t) return;
        const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        await db.saveSettings({ reminderTime: time });
        if (s.reminderEnabled) await scheduleDailyReminder(time);
        setS({ ...s, reminderTime: time });
      },
    });
  };

  const saveKey = async () => {
    await setApiKey(key);
    setHasKey(!!key.trim());
    setKey('');
    Alert.alert(key.trim() ? 'บันทึก API key แล้ว' : 'ลบ API key แล้ว');
  };

  const restore = async () => {
    try {
      const b = await pickBackup();
      if (!b) return;
      Alert.alert('กู้คืนข้อมูล?', `${b.summary}\n\nข้อมูลปัจจุบันในเครื่องจะถูกแทนที่ทั้งหมด`, [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'กู้คืน', style: 'destructive', onPress: async () => { await b.apply(); Alert.alert('กู้คืนเรียบร้อย'); } },
      ]);
    } catch (e) {
      Alert.alert('เปิดไฟล์ไม่ได้', String(e));
    }
  };

  const checkUpdate = async () => {
    if (currentBuild === 0) return Alert.alert('โหมดพัฒนา ไม่มีระบบอัปเดต');
    setChecking(true);
    try {
      const r = await checkForUpdate();
      if (!r) Alert.alert('เป็นเวอร์ชันล่าสุดแล้ว');
      else await installRelease(r);
    } catch (e) {
      Alert.alert('อัปเดตไม่สำเร็จ', String(e));
    } finally {
      setChecking(false);
    }
  };

  const tierLabel = (i: number) => {
    const from = i === 0 ? 1 : num(tiers[i - 1].upTo) + 1;
    return i === tiers.length - 1 ? `หน่วยที่ ${from} ขึ้นไป (บาท/หน่วย)` : `หน่วยที่ ${from} ถึง`;
  };

  return (
    <Screen>
      <Card>
        <Head icon="bell" title="เตือนจดมิเตอร์" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="body">เตือนทุกวัน</T>
          <Switch value={s.reminderEnabled} onValueChange={toggleReminder}
            trackColor={{ true: C.volt, false: '#DDD8CC' }} thumbColor={s.reminderEnabled ? C.ink : '#fff'} />
        </View>
        <Pressable onPress={pickTime}><Row label="เวลา" value={`${s.reminderTime} น.  ›`} /></Pressable>
      </Card>

      <Card>
        <Head icon="backup" title="สำรองข้อมูล" bg={C.skySoft} />
        <T v="sub">ข้อมูลอยู่ในเครื่องนี้เท่านั้น สำรองเก็บไว้ใน Google Drive / LINE Keep เป็นระยะ เผื่อเปลี่ยนเครื่อง</T>
        <Button title="สำรองข้อมูล" icon="download" onPress={() => exportBackup().catch((e) => Alert.alert('สำรองไม่สำเร็จ', String(e)))} />
        <Button kind="ghost" title="กู้คืนจากไฟล์" onPress={restore} />
      </Card>

      <Card>
        <Head icon="bolt" title="อัตราค่าไฟ (บิล กฟน.)" />
        {tiers.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            {i < tiers.length - 1 && (
              <View style={{ flex: 1 }}>
                <Field label={tierLabel(i)} keyboardType="number-pad" value={t.upTo}
                  onChangeText={(v) => setTiers(tiers.map((x, j) => (j === i ? { ...x, upTo: v } : x)))} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Field label={i < tiers.length - 1 ? 'บาท/หน่วย' : tierLabel(i)} keyboardType="decimal-pad" value={t.rate}
                onChangeText={(v) => setTiers(tiers.map((x, j) => (j === i ? { ...x, rate: v } : x)))} />
            </View>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Ft (บาท/หน่วย)" keyboardType="decimal-pad" value={ft} onChangeText={setFt} /></View>
          <View style={{ flex: 1 }}><Field label="ค่าบริการ/เดือน" keyboardType="decimal-pad" value={service} onChangeText={setService} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="VAT (%)" keyboardType="decimal-pad" value={vat} onChangeText={setVat} /></View>
          <View style={{ flex: 1 }}><Field label="วันตัดรอบบิล" keyboardType="number-pad" value={cycleDay} onChangeText={setCycleDay} /></View>
        </View>
        <Button title="บันทึกอัตรา" icon="check" onPress={saveTariff} />
        <Button kind="ghost" title="คืนค่าตามบิล 09/69" onPress={resetTariff} />
      </Card>

      <Card>
        <Head icon="sparkle" title="AI อ่านภาพ (ไม่บังคับ)" bg={C.mintSoft} />
        <T v="sub">ปกติ Denki อ่านตารางจากภาพในเครื่องได้ฟรีอยู่แล้ว ใส่ Claude API key ไว้เป็นตัวช่วยสำรองเมื่ออ่านไม่ออก (ประมาณ 1–2 บาท/ภาพ)</T>
        {hasKey && <Badge icon="check" label="ใส่ API key แล้ว" bg={C.mintSoft} />}
        <Field label={hasKey ? 'เปลี่ยน key (เว้นว่างแล้วกดบันทึก = ลบ)' : 'Claude API key'} value={key} onChangeText={setKey}
          autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="sk-ant-..." />
        <Button kind="ghost" icon="key" title="บันทึก key" onPress={saveKey} />
      </Card>

      <Card style={{ alignItems: 'center' }}>
        <Image source={LOGO} style={{ width: 90, height: 96 }} resizeMode="contain" />
        <T v="sub">เวอร์ชัน {Constants.expoConfig?.version ?? '-'}</T>
        <View style={{ alignSelf: 'stretch' }}>
          <Button kind="ghost" icon="sparkle" title="ตรวจหาอัปเดต" onPress={checkUpdate} busy={checking} />
        </View>
        <Spark size={44} still />
      </Card>
    </Screen>
  );
}
