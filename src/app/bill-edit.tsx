// Enter a real MEA bill (and keep a photo of it). Used instead of the
// estimate when pricing that billing cycle.
import { useCallback, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, C, Card, DateButton, Field, H, Row, Screen, Sub, baht } from '../components/ui';
import * as db from '../lib/db';
import { deleteImage, imageUri, pickImage, storeImage } from '../lib/images';
import { round2 } from '../lib/tariff';
import { today } from '../lib/dates';

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
  const mismatch = f.total !== '' && f.energy !== '' && Math.abs(computed - num(f.total)) > 0.05;

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
        <H>รูปบิล</H>
        {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: 480 }} resizeMode="contain" />
          : <Sub>ยังไม่มีรูป</Sub>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button kind="secondary" title="🖼️ จากคลังภาพ" onPress={addPhoto('library')} /></View>
          <View style={{ flex: 1 }}><Button kind="secondary" title="📷 ถ่ายรูป" onPress={addPhoto('camera')} /></View>
        </View>
      </Card>

      <Card>
        <H>ตัวเลขจากบิล</H>
        <DateButton label="วันที่จดเลขอ่าน" value={periodEnd} onChange={setPeriodEnd} />
        <Field label="จำนวนหน่วย (kWh)" keyboardType="decimal-pad" value={f.kwh} onChangeText={set('kwh')} />
        <Field label="ค่าพลังงานไฟฟ้า" keyboardType="decimal-pad" value={f.energy} onChangeText={set('energy')} />
        <Field label="ค่า Ft (บาท/หน่วย)" keyboardType="decimal-pad" value={f.ftRate} onChangeText={set('ftRate')} />
        <Field label="ค่าบริการ" keyboardType="decimal-pad" value={f.service} onChangeText={set('service')} />
        <Field label="ภาษีมูลค่าเพิ่ม" keyboardType="decimal-pad" value={f.vat} onChangeText={set('vat')} />
        <Field label="รวมค่าไฟฟ้าเดือนปัจจุบัน" keyboardType="decimal-pad" value={f.total} onChangeText={set('total')} />
        <Row label="ตรวจสอบ: พลังงาน + Ft + บริการ + VAT" value={baht(computed)} color={mismatch ? C.warn : C.good} />
        {mismatch && <Sub color={C.warn}>ยอดรวมไม่ตรงกับที่คำนวณ ตรวจตัวเลขอีกครั้ง</Sub>}
        <Sub>ใช้ยอด "ค่าไฟเดือนปัจจุบัน" ไม่รวมค่าไฟค้างชำระ</Sub>
      </Card>

      <Button title="บันทึก" onPress={save} />
      {id ? <Button kind="danger" title="ลบบิล" onPress={remove} /> : null}
    </Screen>
  );
}
