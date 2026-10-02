// Denki UI kit: chunky outlines, sticker shadows, squishy buttons.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DEPTH, F, R, STROKE } from '../theme';
import { Icon, type IconName } from './Icon';
import { Spark, type Mood } from './Spark';
import { formatThaiDate, parseISODate, toISODate } from '../lib/dates';
import { loadDataset, type Dataset } from '../lib/calc';

export { C, F };

export const baht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const kwh = (n: number, digits = 2) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

// ---------- text ----------

const VARIANTS: Record<string, TextStyle> = {
  display: { fontFamily: F.bold, fontSize: 34, lineHeight: 44, color: C.ink },
  title: { fontFamily: F.semi, fontSize: 24, lineHeight: 34, color: C.ink },
  h: { fontFamily: F.semi, fontSize: 17, lineHeight: 26, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 23, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 13.5, lineHeight: 20, color: C.inkSoft },
  small: { fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: C.muted },
  num: { fontFamily: F.semi, fontSize: 15, color: C.ink, fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', style, ...p }: TextProps & { v?: keyof typeof VARIANTS }) {
  return <Text {...p} style={[VARIANTS[v], style]} />;
}

// ---------- layout ----------

export function Screen({ children, tabs }: { children: ReactNode; tabs?: boolean }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: tabs ? 120 : 40 }}>
      {children}
    </ScrollView>
  );
}

/** Big page title used on the tab screens (they have no native header). */
export function ScreenHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ flex: 1 }}>
        {sub ? <T v="sub">{sub}</T> : null}
        <T v="title">{title}</T>
      </View>
      {right}
    </View>
  );
}

/** A card with an ink outline and a solid offset shadow, like a sticker. */
export function Card({ children, style, color = C.card, depth = DEPTH, flat }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; color?: string; depth?: number; flat?: boolean;
}) {
  return (
    <View style={{ marginBottom: flat ? 0 : depth }}>
      {!flat && <View style={[StyleSheet.absoluteFill, { top: depth, bottom: -depth, borderRadius: R.lg, backgroundColor: C.ink }]} />}
      <View style={[s.card, { backgroundColor: color }, flat && { borderColor: C.line }, style]}>{children}</View>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
      <T v="h">{children}</T>
      {right}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1.5, backgroundColor: C.line, borderRadius: 1 }} />;
}

export function Row({ label, value, bold, color }: { label: ReactNode; value: ReactNode; bold?: boolean; color?: string }) {
  return (
    <View style={s.row}>
      <T v={bold ? 'h' : 'body'} style={{ flexShrink: 1, color: bold ? C.ink : C.inkSoft }}>{label}</T>
      <T v="num" style={[bold && { fontSize: 19 }, color ? { color } : null]}>{value}</T>
    </View>
  );
}

export function Badge({ label, color = C.ink, bg = C.voltSoft, icon }: { label: string; color?: string; bg?: string; icon?: IconName }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={14} color={color} />}
      <Text style={{ fontFamily: F.medium, fontSize: 12, color }}>{label}</Text>
    </View>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1.5, borderColor: C.ink }} />;
}

export function EmptyState({ title, text, mood = 'sleepy' }: { title: string; text?: string; mood?: Mood }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 18, gap: 6 }}>
      <Spark size={64} mood={mood} />
      <T v="h" style={{ textAlign: 'center' }}>{title}</T>
      {text ? <T v="sub" style={{ textAlign: 'center' }}>{text}</T> : null}
    </View>
  );
}

// ---------- pressables ----------

/** Pressable that sinks into its shadow when pressed. */
export function Squish({ onPress, onLongPress, disabled, children, style, depth = DEPTH, radius = R.md, bg = C.card, haptic = true }: {
  onPress?: () => void; onLongPress?: () => void; disabled?: boolean; children: ReactNode;
  style?: StyleProp<ViewStyle>; depth?: number; radius?: number; bg?: string; haptic?: boolean;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(y, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable disabled={disabled} onLongPress={onLongPress}
      onPress={() => { if (haptic) tap(); onPress?.(); }}
      onPressIn={() => to(depth)} onPressOut={() => to(0)}
      style={{ marginBottom: depth, opacity: disabled ? 0.45 : 1 }}>
      <View style={[StyleSheet.absoluteFill, { top: depth, bottom: -depth, borderRadius: radius, backgroundColor: C.ink }]} />
      <Animated.View style={[{ borderRadius: radius, borderWidth: STROKE, borderColor: C.ink, backgroundColor: bg, transform: [{ translateY: y }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const BTN: Record<string, { bg: string; fg: string }> = {
  primary: { bg: C.volt, fg: C.ink },
  dark: { bg: C.ink, fg: '#fff' },
  ghost: { bg: C.card, fg: C.ink },
  danger: { bg: C.redSoft, fg: C.red },
};

export function Button({ title, onPress, kind = 'primary', icon, disabled, busy, small }: {
  title: string; onPress: () => void; kind?: keyof typeof BTN; icon?: IconName; disabled?: boolean; busy?: boolean; small?: boolean;
}) {
  const c = BTN[kind];
  return (
    <Squish onPress={onPress} disabled={disabled || busy} bg={c.bg} depth={small ? 3 : DEPTH} radius={R.md}
      style={{ paddingVertical: small ? 9 : 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {busy ? <ActivityIndicator color={c.fg} /> : (
        <>
          {icon && <Icon name={icon} size={small ? 18 : 20} color={c.fg} />}
          <Text style={{ fontFamily: F.semi, fontSize: small ? 14 : 16, color: c.fg }}>{title}</Text>
        </>
      )}
    </Squish>
  );
}

export function IconButton({ icon, onPress, bg = C.card, size = 44, disabled }: {
  icon: IconName; onPress: () => void; bg?: string; size?: number; disabled?: boolean;
}) {
  return (
    <Squish onPress={onPress} bg={bg} depth={3} radius={size / 2} disabled={disabled}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size * 0.5} />
    </Squish>
  );
}

// ---------- inputs ----------

export function Field({ label, big, style, ...props }: TextInputProps & { label: string; big?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="sub">{label}</T>
      <TextInput placeholderTextColor="#C3C8CF" {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[s.input, focus && { borderColor: C.ink, backgroundColor: '#FFFDF5' }, big && s.inputBig, style]} />
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string; color?: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => { if (!on) { tap(); onChange(o.value); } }}
            style={[s.segItem, on && { backgroundColor: o.color ?? C.volt, borderColor: C.ink }]}>
            <Text numberOfLines={1} style={{ fontFamily: on ? F.semi : F.regular, fontSize: 14, color: on ? C.ink : C.inkSoft }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** ◀ [ date ] ▶ */
export function DateStepper({ value, onChange, max }: { value: string; onChange: (d: string) => void; max?: string }) {
  const shift = (n: number) => {
    const d = parseISODate(value);
    d.setDate(d.getDate() + n);
    onChange(toISODate(d));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconButton icon="left" onPress={() => shift(-1)} />
      <View style={{ flex: 1 }}><DateButton value={value} onChange={onChange} /></View>
      <IconButton icon="right" onPress={() => shift(1)} disabled={!!max && value >= max} />
    </View>
  );
}

export function DateButton({ label, value, onChange }: { label?: string; value: string; onChange: (d: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="sub">{label}</T> : null}
      <Squish depth={3} onPress={() =>
        DateTimePickerAndroid.open({
          value: parseISODate(value),
          mode: 'date',
          onChange: (e, d) => { if (e.type === 'set' && d) onChange(toISODate(d)); },
        })}
        style={{ paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="calendar" size={18} />
        <T v="h" style={{ fontSize: 16 }}>{formatThaiDate(value)}</T>
      </Squish>
    </View>
  );
}

// ---------- motion ----------

/** Animated number that counts up to `value`. */
export function CountUp({ value, format, style }: { value: number; format: (n: number) => string; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const t0 = Date.now();
    const dur = 700;
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(start + (value - start) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{format(shown)}</Text>;
}

/** Fades and slides children in on mount. */
export function Appear({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

// ---------- data ----------

/** Reloads all data each time the screen comes into focus. */
export function useDataset(): [Dataset | null, () => void] {
  const [ds, setDs] = useState<Dataset | null>(null);
  const reload = useCallback(() => { loadDataset().then(setDs); }, []);
  useFocusEffect(reload);
  return [ds, reload];
}

const s = StyleSheet.create({
  card: { borderRadius: R.lg, borderWidth: STROKE, borderColor: C.ink, padding: 18, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 28 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.ink, alignSelf: 'flex-start' },
  input: {
    borderWidth: STROKE, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, backgroundColor: '#fff', color: C.ink, fontFamily: F.regular,
  },
  inputBig: { fontSize: 44, fontFamily: F.bold, textAlign: 'center', paddingVertical: 14, letterSpacing: 4 },
  seg: { flexDirection: 'row', backgroundColor: '#F1ECE0', borderRadius: R.pill, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: R.pill, borderWidth: 1.5, borderColor: 'transparent' },
});
