// One receipt: share as image, mark paid, keep the transfer slip.
import { useCallback, useRef, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Button, Card, Field, Screen, T, success } from '../../components/ui';
import { isValidPromptPayId } from '../../lib/promptpay';
import { ReceiptView } from '../../components/ReceiptView';
import * as db from '../../lib/db';
import { deleteImage, imageUri, pickImage, storeImage } from '../../lib/images';
import { C, R } from '../../theme';

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [r, setR] = useState<db.Receipt | null>(null);
  const shot = useRef<View>(null);
  const [pp, setPp] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(() => { db.getReceipt(Number(id)).then(setR); }, [id]);
  useFocusEffect(load);

  if (!r) return null;

  const share = async () => {
    const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'ส่งใบเสร็จ' });
  };

  const togglePaid = async () => {
    await db.setReceiptPaid(r.id, !r.paid);
    if (!r.paid) success();
    load();
  };

  const attachSlip = (source: 'library' | 'camera') => async () => {
    const uri = await pickImage(source);
    if (!uri) return;
    const path = storeImage(uri, 'slips');
    deleteImage(r.slipPath);
    await db.setReceiptSlip(r.id, path);
    if (!r.paid) { await db.setReceiptPaid(r.id, true); success(); }
    load();
  };

  const savePp = async () => {
    if (!pp) return;
    const id = pp.id.replace(/\D/g, '');
    if (!isValidPromptPayId(id)) return Alert.alert('เลขพร้อมเพย์ไม่ถูกต้อง', 'ใส่เบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก');
    await db.setReceiptPromptPay(r.id, id, pp.name.trim());
    await db.saveSettings({ promptpayId: id, payeeName: pp.name.trim() });
    setPp(null);
    success();
    load();
  };

  const remove = () =>
    Alert.alert('ลบใบเสร็จนี้?', '', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        deleteImage(r.slipPath);
        await db.deleteReceipt(r.id);
        router.back();
      } },
    ]);

  return (
    <Screen>
      <ReceiptView ref={shot} receipt={r} />
      <Button title="ส่งรูปใบเสร็จ (LINE ฯลฯ)" icon="share" onPress={share} />
      <Button kind={r.paid ? 'ghost' : 'dark'} icon={r.paid ? undefined : 'check'}
        title={r.paid ? 'เปลี่ยนเป็น ยังไม่จ่าย' : 'ทำเครื่องหมายว่าจ่ายแล้ว'} onPress={togglePaid} />

      {pp ? (
        <Card>
          <T v="h">แก้พร้อมเพย์ในใบเสร็จนี้</T>
          <Field label="เบอร์โทร หรือ เลขบัตรประชาชน" keyboardType="number-pad" value={pp.id}
            onChangeText={(t) => setPp({ ...pp, id: t })} autoFocus />
          <Field label="ชื่อที่แสดง (ไม่บังคับ)" value={pp.name} onChangeText={(t) => setPp({ ...pp, name: t })} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button kind="ghost" small title="ยกเลิก" onPress={() => setPp(null)} /></View>
            <View style={{ flex: 1 }}><Button small icon="check" title="บันทึก" onPress={savePp} /></View>
          </View>
        </Card>
      ) : (
        <Button kind="ghost" icon="wallet" title="แก้เลขพร้อมเพย์" onPress={() => setPp({ id: r.promptpayId, name: r.payeeName })} />
      )}

      <Card>
        <T v="h">สลิปโอนเงิน</T>
        {r.slipPath ? (
          <Image source={{ uri: imageUri(r.slipPath) }} style={{ width: '100%', height: 480, borderRadius: R.md }} resizeMode="contain" />
        ) : (
          <T v="sub">ยังไม่มีสลิป แนบแล้วใบเสร็จจะเปลี่ยนเป็นจ่ายแล้วให้อัตโนมัติ</T>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button kind="ghost" small icon="image" title="คลังภาพ" onPress={attachSlip('library')} /></View>
          <View style={{ flex: 1 }}><Button kind="ghost" small icon="camera" title="ถ่ายรูป" onPress={attachSlip('camera')} /></View>
        </View>
      </Card>

      <Button kind="danger" icon="trash" title="ลบใบเสร็จ" onPress={remove} />
      <View style={{ height: 1, backgroundColor: C.bg }} />
    </Screen>
  );
}
