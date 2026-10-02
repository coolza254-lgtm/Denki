// Bars that spring up on load, an average line, tap a bar to see its value.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { T } from './ui';
import { C } from '../theme';

export type Bar = { key: string; label: string; value: number | null };

const HEIGHT = 170;

export function BarChart({ bars, color, format, onSelect, selected }: {
  bars: Bar[];
  color: string;
  format: (v: number) => string;
  onSelect: (key: string) => void;
  selected: string | null;
}) {
  const grow = useRef(new Animated.Value(0)).current;
  const signature = bars.map((b) => `${b.key}:${b.value ?? ''}`).join('|');
  useEffect(() => {
    grow.setValue(0);
    Animated.spring(grow, { toValue: 1, useNativeDriver: false, speed: 10, bounciness: 6 }).start();
  }, [signature]);

  const values = bars.map((b) => b.value).filter((v): v is number => v != null);
  const max = Math.max(...values, 0.0001);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const labelEvery = bars.length > 15 ? 5 : 1;
  const thin = bars.length > 15;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: thin ? 2 : 6 }}>
        {values.length > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: (avg / max) * HEIGHT, flexDirection: 'row', gap: 4, zIndex: 2 }}>
            {Array.from({ length: 40 }, (_, i) => <View key={i} style={{ flex: 1, height: 2, backgroundColor: C.ink, opacity: 0.55, borderRadius: 1 }} />)}
          </View>
        )}
        {bars.map((b) => {
          const v = Math.max(b.value ?? 0, 0);
          const h = b.value == null ? 0 : Math.max(4, (v / max) * HEIGHT);
          const on = selected === b.key;
          const above = b.value != null && b.value >= avg;
          return (
            <Pressable key={b.key} onPress={() => onSelect(b.key)} style={{ flex: 1, height: HEIGHT, justifyContent: 'flex-end' }}>
              {b.value == null ? (
                <View style={{ height: 4, borderRadius: 2, backgroundColor: C.line }} />
              ) : (
                <Animated.View style={{
                  height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, h] }),
                  backgroundColor: on ? C.volt : color,
                  opacity: above || on ? 1 : 0.5,
                  borderTopLeftRadius: thin ? 4 : 8, borderTopRightRadius: thin ? 4 : 8,
                  borderWidth: on ? 2 : thin ? 0 : 1.5, borderColor: C.ink, borderBottomWidth: 0,
                }} />
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 2, backgroundColor: C.ink, borderRadius: 1, marginTop: -6 }} />
      <View style={{ flexDirection: 'row', gap: thin ? 2 : 6 }}>
        {bars.map((b, i) => (
          <T key={b.key} v="small" numberOfLines={1}
            style={{ flex: 1, textAlign: 'center', fontSize: 10, opacity: i % labelEvery === 0 || i === bars.length - 1 ? 1 : 0 }}>
            {b.label}
          </T>
        ))}
      </View>
      <T v="small">เส้นประ = ค่าเฉลี่ย {format(avg)} · แท่งจาง = ต่ำกว่าเฉลี่ย · แตะแท่งเพื่อดูค่า</T>
    </View>
  );
}
