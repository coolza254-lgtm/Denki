// Shows "new version available" and applies it with one tap (EAS Update).
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import * as Updates from 'expo-updates';
import { C } from './ui';

export function UpdateBanner() {
  const [state, setState] = useState<'idle' | 'available' | 'downloading'>('idle');

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    Updates.checkForUpdateAsync()
      .then((r) => { if (r.isAvailable) setState('available'); })
      .catch(() => {});
  }, []);

  if (state === 'idle') return null;
  return (
    <Pressable
      onPress={async () => {
        setState('downloading');
        try {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        } catch {
          setState('available');
        }
      }}
      style={{ backgroundColor: C.good, padding: 14, borderRadius: 12 }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
        {state === 'downloading' ? 'กำลังอัปเดต…' : '✨ มีเวอร์ชันใหม่ — แตะเพื่ออัปเดต'}
      </Text>
    </Pressable>
  );
}
