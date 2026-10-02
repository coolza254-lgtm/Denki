// Import an AC screenshot into the month the user picked beforehand: read the
// calendar on-device, show the values next to the image, one tap to save.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, IconButton, Screen, T, kwh, success } from '../components/ui';
import { Spark } from '../components/Spark';
import * as db from '../lib/db';
import { readScreenshotOnDevice } from '../lib/acImport';
import { extractAcScreenshot, getApiKey, ExtractError } from '../lib/acExtract';
import { checkExtracted, type Extracted, type Warning } from '../lib/acCheck';
import { fileHash, storeImage } from '../lib/images';
import { daysInMonth, formatThaiDate, formatThaiMonth } from '../lib/dates';
import { C, CAT_COLOR, F, R } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');
const AC_LABEL = { 1: 'แอร์ของฉัน', 2: 'แอร์พี่ชาย' } as const;

export default function AcConfirm() {
  const params = useLocalSearchParams<{ ac: string; uris: string; month?: string }>();
  const ac = (Number(params.ac) === 1 ? 1 : 2) as db.AcId;
  const uris: string[] = JSON.parse(params.uris ?? '[]');

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'reading' | 'ready' | 'error'>('reading');
  const [method, setMethod] = useState<'ocr' | 'ai' | 'manual'>('ocr');
  const [error, setError] = useState('');
  const chosen = params.month?.split('-').map(Number) ?? [];
  const [ym, setYm] = useState(() => {
    const now = new Date();
    return { year: chosen[0] || now.getFullYear(), month: chosen[1] || now.getMonth() + 1 };
  });
  // Month printed on the screenshot, only used to warn about a mismatch.
  const [seen, setSeen] = useState<{ year: number; month: number } | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [existing, setExisting] = useState<Map<string, number>>(new Map());
  const [recent, setRecent] = useState<number[]>([]);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [hash, setHash] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [bigImage, setBigImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const uri = uris[index];

  useEffect(() => { getApiKey().then((k) => setHasKey(!!k)); }, []);

  const apply = (ex: Extracted, how: typeof method) => {
    // The month chosen before import wins; the one read from the image is a hint.
    setSeen(ex.month ? { year: ex.year, month: ex.month } : null);
    if (!params.month && ex.month) setYm({ year: ex.year, month: ex.month });
    const v: Record<number, string> = {};
    for (const d of ex.days) v[d.day] = d.kwh == null ? '' : String(d.kwh);
    setValues(v);
    setNotes(ex.notes);
    setMethod(how);
    setStatus('ready');
  };

  const read = async (how: 'ocr' | 'ai') => {
    setStatus('reading');
    setMethod(how);
    try {
      const [h, all] = await Promise.all([fileHash(uri), db.listAcDays(ac)]);
      setHash(h);
      const dup = await db.findScreenshotByHash(h);
      setDuplicate(dup ? `ภาพนี้เคยนำเข้าแล้วเมื่อ ${formatThaiDate(dup.createdAt.slice(0, 10))}` : null);
      setExisting(new Map(all.map((d) => [d.date, d.kwh])));
      setRecent(all.slice(-40).map((d) => d.kwh));

      const ex = how === 'ocr' ? await readScreenshotOnDevice(uri) : await extractAcScreenshot(uri);
      if (!ex) throw new ExtractError('หาตารางรายวันในภาพไม่เจอ ลองใช้ภาพหน้าปฏิทินรายวันของแอปแอร์');
      apply(ex, how);
    } catch (e) {
      setError(e instanceof ExtractError ? e.message : `อ่านภาพไม่สำเร็จ: ${String(e)}`);
      setStatus('error');
    }
  };

  const manual = () => apply({ year: 0, month: 0, days: [], notes: '' }, 'manual');

  useEffect(() => { if (uri) read('ocr'); }, [index]);

  const shiftMonth = (n: number) => {
    const d = new Date(ym.year, ym.month - 1 + n, 1);
    setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const next = () => {
    if (index + 1 < uris.length) { setBigImage(false); setIndex(index + 1); }
    else router.back();
  };

  const maxDay = ym.month ? daysInMonth(ym.year, ym.month) : 31;
  const extracted: Extracted = {
    year: ym.year, month: ym.month, notes,
    days: Object.entries(values).filter(([, v]) => v.trim() !== '').map(([d, v]) => ({ day: Number(d), kwh: Number(v) })),
  };
  const warnings: Warning[] = status === 'ready' ? checkExtracted(extracted, recent) : [];
  const keyOf = (day: number) => `${ym.year}-${pad(ym.month)}-${pad(day)}`;
  const filled = extracted.days.filter((d) => d.day <= maxDay);
  const sum = filled.reduce((s, d) => s + (Number.isFinite(d.kwh) ? d.kwh! : 0), 0);
  const changed = filled.filter((d) => {
    const old = existing.get(keyOf(d.day));
    return old == null || Math.abs(old - d.kwh!) > 1e-9;
  }).length;

  const save = async () => {
    const rows = filled.map((d) => ({ date: keyOf(d.day), kwh: d.kwh! }));
    const bad = rows.find((r) => !Number.isFinite(r.kwh) || r.kwh < 0);
    if (bad) return Alert.alert('ค่าไม่ถูกต้อง', `วันที่ ${Number(bad.date.slice(8))}`);
    if (rows.length === 0) return Alert.alert('ไม่มีค่าที่จะบันทึก');
    setSaving(true);
    const path = storeImage(uri, 'ac');
    const shotId = await db.addScreenshot(ac, `${ym.year}-${pad(ym.month)}`, path, hash);
    await db.upsertAcDays(ac, rows, shotId);
    success();
    setSaving(false);
    next();
  };

  if (!uri) return null;
  const firstWeekday = ym.month ? new Date(ym.year, ym.month - 1, 1).getDay() : 0;
  const color = ac === 1 ? CAT_COLOR.ac1 : CAT_COLOR.ac2;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Badge label={AC_LABEL[ac]} bg={ac === 1 ? C.skySoft : C.coralSoft} icon="snow" />
        {uris.length > 1 && <Badge label={`ภาพ ${index + 1} / ${uris.length}`} bg="#fff" />}
      </View>

      <Pressable onPress={() => setBigImage(!bigImage)}>
        <Card flat style={{ padding: 6 }}>
          <Image source={{ uri }} style={{ width: '100%', height: bigImage ? 820 : 300, borderRadius: R.md }} resizeMode="contain" />
        </Card>
        <T v="small" style={{ textAlign: 'center', marginTop: 4 }}>แตะภาพเพื่อ{bigImage ? 'ย่อ' : 'ขยาย'}</T>
      </Pressable>

      {duplicate && <Badge icon="alert" label={duplicate} bg={C.voltSoft} />}

      {status === 'reading' && (
        <Card style={{ alignItems: 'center' }}>
          <Spark size={70} mood="wow" />
          <T v="h">{method === 'ai' ? 'AI กำลังอ่านภาพ…' : 'กำลังอ่านตาราง…'}</T>
          <ActivityIndicator color={C.ink} />
        </Card>
      )}

      {status === 'error' && (
        <Card style={{ alignItems: 'center' }}>
          <Spark size={64} mood="sleepy" />
          <T v="body" style={{ textAlign: 'center', color: C.red }}>{error}</T>
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            {method === 'ocr' && hasKey && <Button title="ให้ AI อ่านแทน" icon="sparkle" onPress={() => read('ai')} />}
            <Button kind="ghost" title="กรอกเอง" onPress={manual} />
            {uris.length > 1 && <Button kind="ghost" title="ข้ามภาพนี้" onPress={next} />}
          </View>
        </Card>
      )}

      {status === 'ready' && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconButton icon="left" size={36} onPress={() => shiftMonth(-1)} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T v="h">{formatThaiMonth(`${ym.year}-${pad(ym.month)}`)}</T>
                <T v="small">รวม {kwh(sum)} หน่วย · {filled.length} วัน · ใหม่/เปลี่ยน {changed} วัน</T>
              </View>
              <IconButton icon="right" size={36} onPress={() => shiftMonth(1)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Badge icon={method === 'ai' ? 'sparkle' : 'scan'}
                label={method === 'ocr' ? 'อ่านในเครื่อง (ฟรี)' : method === 'ai' ? 'อ่านด้วย AI' : 'กรอกเอง'} bg={C.mintSoft} />
              {method === 'ocr' && hasKey && (
                <Pressable onPress={() => read('ai')}><Badge label="ค่าไม่ตรง? ให้ AI อ่าน" bg="#fff" /></Pressable>
              )}
            </View>
            {seen && (seen.month !== ym.month || seen.year !== ym.year) && (
              <Badge icon="alert" color={C.red} bg={C.redSoft}
                label={`ในภาพเหมือนเป็น ${formatThaiMonth(`${seen.year}-${pad(seen.month)}`)} ตรวจเดือนอีกครั้ง`} />
            )}
            {warnings.map((w, i) => <Badge key={i} icon="alert" label={w.message} color={C.red} bg={C.redSoft} />)}
            {notes ? <T v="small">{notes}</T> : null}
          </Card>

          <Card style={{ paddingHorizontal: 10 }}>
            <T v="sub" style={{ paddingHorizontal: 6 }}>ตรวจให้ตรงกับภาพ แก้ได้ทุกช่อง (ว่าง = ไม่มีข้อมูล)</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
              {Array.from({ length: firstWeekday }, (_, i) => <View key={`b${i}`} style={{ width: '14.28%' }} />)}
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => {
                const raw = values[day] ?? '';
                const old = existing.get(keyOf(day));
                const flagged = warnings.some((w) => w.day === day);
                const isNew = raw !== '' && (old == null || String(old) !== raw);
                return (
                  <View key={day} style={{ width: '14.28%', alignItems: 'center', gap: 2 }}>
                    <T v="small" style={{ color: flagged ? C.red : C.inkSoft, lineHeight: 15 }}>{day}</T>
                    <TextInput value={raw} keyboardType="decimal-pad" selectTextOnFocus
                      onChangeText={(t) => setValues({ ...values, [day]: t })}
                      style={{
                        width: '92%', borderWidth: flagged ? 2 : 1.5, borderRadius: 10, paddingVertical: 4,
                        borderColor: flagged ? C.red : raw ? color : C.line,
                        backgroundColor: raw ? `${color}22` : '#fff',
                        textAlign: 'center', fontFamily: F.semi, fontSize: 13, color: C.ink,
                      }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isNew ? C.mint : 'transparent' }} />
                  </View>
                );
              })}
            </View>
            <T v="small" style={{ paddingHorizontal: 6 }}>● เขียว = ค่าใหม่หรือต่างจากที่บันทึกไว้</T>
          </Card>

          <Button title={index + 1 < uris.length ? 'บันทึก แล้วไปภาพถัดไป' : 'บันทึก'} icon="check" onPress={save} busy={saving} />
          {uris.length > 1 && <Button kind="ghost" title="ข้ามภาพนี้" onPress={next} />}
        </>
      )}
    </Screen>
  );
}
