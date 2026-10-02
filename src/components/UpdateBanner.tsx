// Shows "new version available"; one tap downloads and installs it.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { C } from '../theme';
import { Icon } from './Icon';
import { Squish, T } from './ui';
import { checkForUpdate, installRelease, type Release } from '../lib/updater';

export function UpdateBanner() {
  const [release, setRelease] = useState<Release | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { checkForUpdate().then(setRelease); }, []);

  if (!release) return null;
  return (
    <Squish bg={C.mint} depth={3} disabled={busy}
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
      style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.ink }}>
        {busy ? <ActivityIndicator color={C.ink} /> : <Icon name="sparkle" size={20} />}
      </View>
      <View style={{ flex: 1 }}>
        <T v="h" style={{ color: '#fff', fontSize: 15 }}>{busy ? 'กำลังดาวน์โหลด…' : 'มี Denki เวอร์ชันใหม่!'}</T>
        <T v="small" style={{ color: '#E6FFF4' }}>เวอร์ชัน 1.0.{release.build} · แตะเพื่ออัปเดต</T>
      </View>
    </Squish>
  );
}
