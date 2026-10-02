// Minimal bar chart: bars, average line, tap a bar to see its value.
import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { C } from './ui';

export type Bar = { key: string; label: string; value: number | null };

export function BarChart({ bars, color, format, onSelect, selected }: {
  bars: Bar[];
  color: string;
  format: (v: number) => string;
  onSelect: (key: string) => void;
  selected: string | null;
}) {
  const [width, setWidth] = useState(0);
  const height = 180;
  const top = 10;
  const bottom = 20;
  const values = bars.map((b) => b.value).filter((v): v is number => v != null);
  const max = Math.max(...values, 0.0001);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const slot = width / Math.max(bars.length, 1);
  const barW = Math.max(2, slot * 0.7);
  const y = (v: number) => top + (height - top - bottom) * (1 - v / max);
  const labelEvery = bars.length > 15 ? 5 : 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {bars.map((b, i) => {
            if (b.value == null) return null;
            const v = Math.max(b.value, 0);
            const above = b.value >= avg;
            return (
              <Rect key={b.key} x={i * slot + (slot - barW) / 2} y={y(v)} width={barW} height={height - bottom - y(v)}
                rx={2} fill={selected === b.key ? C.text : color} opacity={above ? 1 : 0.45}
                onPress={() => onSelect(b.key)} />
            );
          })}
          {values.length > 0 && (
            <Line x1={0} x2={width} y1={y(avg)} y2={y(avg)} stroke={C.text} strokeDasharray="4 4" strokeWidth={1} />
          )}
          {bars.map((b, i) => (i % labelEvery === 0 || i === bars.length - 1) && (
            <SvgText key={`l${b.key}`} x={i * slot + slot / 2} y={height - 4} fontSize={10} fill={C.sub} textAnchor="middle">
              {b.label}
            </SvgText>
          ))}
        </Svg>
      )}
      <Text style={{ fontSize: 12, color: C.sub }}>
        เส้นประ = ค่าเฉลี่ย {format(avg)} · แท่งจาง = ต่ำกว่าค่าเฉลี่ย · แตะแท่งเพื่อดูค่า
      </Text>
    </View>
  );
}
