// Enter a real MEA bill (and keep a photo of it). Used instead of the
// estimate when pricing that billing cycle.
import { useCallback, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, DateButton, Field, Screen, T, baht } from '../components/ui';
import * as db from '../lib/db';
import { deleteImage, imageUri, pickImage, storeImage } from '../lib/images';
import { round2 } from '../lib/tariff';
import { today } from '../lib/dates';
import { C, R } from '../theme';

const num = (s: string) => Number(s.replace(/,/g, ''));

export default function BillEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [periodEnd, setPeriodEnd] = useState(today());
  const [f, setF] = useState({ kwh: '', energy: '', ftRate: '', service: '', vat: '', total: '' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!id) {
      db.getSettings().then((s) => setF((p) => ({
        ...p, ftRate: p.ftRate || String(s.tariff.ftRate), service: p.service || String(s.tariff.serviceCharge),
      })));
      return;
    }
    db.listBills().then((bills) => {
      const b = bills.find((x) => x.id === Number(id));
      if (!b) return;
      setPeriodEnd(b.periodEnd);
      setF({ kwh: String(b.kwh), energy: String(b.energy), ftRate: String(b.ftRate),
        service: String(b.service), vat: String(b.vat), total: String(b.total) });
      setPhoto(b.photoPath);
    });
  }, [id]));

  const set = (k: keyof typeof f) => (t: string) => setF({ ...f, [k]: t });
  const ft = round2(num(f.kwh) * num(f.ftRate));
  const computed = round2(num(f.energy) + ft + num(f.service) + num(f.vat));
  const ok = f.total !== '' && f.energy !== '' && Math.abs(computed - num(f.total)) <= 0.05;

  const addPhoto = (source: 'library' | 'camera') => async () => {
    const uri = await pickImage(source);
    if (uri) setNewPhotoUri(uri);
  };

  const save = async () => {
    for (const k of ['kwh', 'energy', 'ftRate', 'service', 'vat', 'total'] as const) {
      if (f[k] === '' || !Number.isFinite(num(f[k]))) return Alert.alert('กรอกตัวเลขให้ครบ');
    }
    let photoPath = photo;
    if (newPhotoUri) {
      deleteImage(photo);
      photoPath = storeImage(newPhotoUri, 'bills');
    }
    await db.saveBill({
      id: id ? Number(id) : undefined, periodEnd,
      kwh: num(f.kwh), energy: num(f.energy), ftRate: num(f.ftRate),
      service: num(f.service), vat: num(f.vat), total: num(f.total), photoPath,
    });
    router.back();
  };

  const remove = () =>
    Alert.alert('ลบบิลนี้?', '', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        deleteImage(photo);
        await db.deleteBill(Number(id));
        router.back();
      } },
    ]);

  const shown = newPhotoUri ?? (photo ? imageUri(photo) : null);

  return (
    <Screen>
      <Card>
        <T v="h">รูปบิล</T>
        {shown
          ? <Image source={{ uri: shown }} style={{ width: '100%', height: 420, borderRadius: R.md }} resizeMode="contain" />
          : <T v="sub">ถ่ายเก็บไว้ดูย้อนหลังได้</T>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button kind="ghost" small icon="image" title="คลังภาพ" onPress={addPhoto('library')} /></View>
          <View style={{ flex: 1 }}><Button kind="ghost" small icon="camera" title="ถ่ายรูป" onPress={addPhoto('camera')} /></View>
        </View>
      </Card>

      <Card>
        <T v="h">ตัวเลขจากบิล</T>
        <DateButton label="วันที่จดเลขอ่าน" value={periodEnd} onChange={setPeriodEnd} />
        <Field label="จำนวนหน่วย (kWh)" keyboardType="decimal-pad" value={f.kwh} onChangeText={set('kwh')} />
        <Field label="ค่าพลังงานไฟฟ้า" keyboardType="decimal-pad" value={f.energy} onChangeText={set('energy')} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Ft (บาท/หน่วย)" keyboardType="decimal-pad" value={f.ftRate} onChangeText={set('ftRate')} /></View>
          <View style={{ flex: 1 }}><Field label="ค่าบริการ" keyboardType="decimal-pad" value={f.service} onChangeText={set('service')} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="VAT" keyboardType="decimal-pad" value={f.vat} onChangeText={set('vat')} /></View>
          <View style={{ flex: 1 }}><Field label="รวมเดือนปัจจุบัน" keyboardType="decimal-pad" value={f.total} onChangeText={set('total')} /></View>
        </View>
        {f.energy !== '' && f.total !== '' && (
          <Badge icon={ok ? 'check' : 'alert'} color={ok ? C.ink : C.red} bg={ok ? C.mintSoft : C.redSoft}
            label={ok ? `ตรวจแล้ว ยอดตรง ฿${baht(computed)}` : `ยอดคำนวณได้ ฿${baht(computed)} ไม่ตรงกับยอดรวม`} />
        )}
        <T v="small">ใช้ยอด "ค่าไฟเดือนปัจจุบัน" ไม่รวมค่าไฟค้างชำระ</T>
      </Card>

      <Button title="บันทึก" icon="check" onPress={save} />
      {id ? <Button kind="danger" icon="trash" title="ลบบิล" onPress={remove} /> : null}
    </Screen>
  );
}
