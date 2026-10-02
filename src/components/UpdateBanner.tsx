// Shows "new version available"; one tap downloads and installs it.
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { C } from './ui';
import { checkForUpdate, installRelease, type Release } from '../lib/updater';

export function UpdateBanner() {
  const [release, setRelease] = useState<Release | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { checkForUpdate().then(setRelease); }, []);

  if (!release) return null;
  return (
    <Pressable
      disabled={busy}
      onPress={async () => {
        setBusy(true);
        try {
          await installRelease(release);
        } catch (e) {
          Alert.alert('อัปเดตไม่สำเร็จ', String(e));
        } finally {
          setBusy(false);
        }
      }}
      style={{ backgroundColor: C.good, padding: 14, borderRadius: 12 }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
        {busy ? 'กำลังดาวน์โหลด…' : `✨ มีเวอร์ชันใหม่ (1.0.${release.build}) — แตะเพื่ออัปเดต`}
      </Text>
    </Pressable>
  );
}
