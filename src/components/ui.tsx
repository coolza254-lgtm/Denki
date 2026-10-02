// Small shared UI pieces so every screen looks the same.
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { formatThaiDate, parseISODate, toISODate } from '../lib/dates';
import { loadDataset, type Dataset } from '../lib/calc';

export const C = {
  bg: '#F4F6F8',
  card: '#FFFFFF',
  text: '#1B1F24',
  sub: '#5F6B7A',
  line: '#E3E7EC',
  primary: '#E8590C', // MEA orange
  primarySoft: '#FFF0E6',
  good: '#2B8A3E',
  warn: '#C92A2A',
  house: '#495057',
  ac1: '#1C7ED6',
  ac2: '#E8590C',
  rest: '#868E96',
};

export const baht = (n: number) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const kwh = (n: number, digits = 2) =>
  n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: digits });

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H({ children }: { children: ReactNode }) {
  return <Text style={s.h}>{children}</Text>;
}

export function Sub({ children, color }: { children: ReactNode; color?: string }) {
  return <Text style={[s.sub, color ? { color } : null]}>{children}</Text>;
}

export function Row({ label, value, bold, color }: { label: ReactNode; value: ReactNode; bold?: boolean; color?: string }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, bold && s.bold]}>{label}</Text>
      <Text style={[s.rowValue, bold && s.bold, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, busy }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; busy?: boolean;
}) {
  const bg = kind === 'primary' ? C.primary : kind === 'danger' ? '#FFF5F5' : C.primarySoft;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? C.warn : C.primary;
  return (
    <Pressable onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, big, ...props }: TextInputProps & { label: string; big?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.sub}>{label}</Text>
      <TextInput placeholderTextColor="#ADB5BD" {...props}
        style={[s.input, big && s.inputBig, props.style]} />
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={String(o.value)} onPress={() => onChange(o.value)}
          style={[s.segItem, o.value === value && s.segActive]}>
          <Text style={[s.segText, o.value === value && { color: C.primary, fontWeight: '700' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Android date dialog behind a button. */
export function DateButton({ label, value, onChange }: { label?: string; value: string; onChange: (d: string) => void }) {
  return (
    <Pressable style={s.dateBtn} onPress={() =>
      DateTimePickerAndroid.open({
        value: parseISODate(value),
        mode: 'date',
        onChange: (e, d) => { if (e.type === 'set' && d) onChange(toISODate(d)); },
      })}>
      {label ? <Text style={s.sub}>{label}</Text> : null}
      <Text style={s.dateText}>📅 {formatThaiDate(value)}</Text>
    </Pressable>
  );
}

/** Reloads all data each time the screen comes into focus. */
export function useDataset(): [Dataset | null, () => void] {
  const [ds, setDs] = useState<Dataset | null>(null);
  const reload = useCallback(() => { loadDataset().then(setDs); }, []);
  useFocusEffect(reload);
  return [ds, reload];
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: C.line },
  h: { fontSize: 18, fontWeight: '700', color: C.text },
  sub: { fontSize: 14, color: C.sub },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rowLabel: { fontSize: 15, color: C.text, flexShrink: 1 },
  rowValue: { fontSize: 15, color: C.text, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700', fontSize: 17 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff', color: C.text },
  inputBig: { fontSize: 40, fontWeight: '700', textAlign: 'center', paddingVertical: 16, letterSpacing: 2 },
  seg: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 10, padding: 3 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segActive: { backgroundColor: '#fff' },
  segText: { fontSize: 14, color: C.sub },
  dateBtn: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, backgroundColor: '#fff', gap: 2 },
  dateText: { fontSize: 17, fontWeight: '600', color: C.text },
});
