// Floating tab bar: a rounded sticker with a yellow pill under the active tab.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { C, F, STROKE } from '../theme';
import { Icon, type IconName } from './Icon';
import { tap } from './ui';

const ICONS: Record<string, IconName> = {
  index: 'home', meter: 'meter', ac: 'snow', receipts: 'receipt', charts: 'chart',
};

function Tab({ focused, label, icon, onPress }: { focused: boolean; label: string; icon: IconName; onPress: () => void }) {
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: 10 }).start();
  }, [focused]);
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Animated.View style={{
        paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, borderWidth: STROKE,
        borderColor: a.interpolate({ inputRange: [0, 1], outputRange: ['rgba(40,50,63,0)', C.ink] }),
        backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['rgba(253,193,29,0)', C.volt] }),
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
      }}>
        <Icon name={icon} size={22} color={focused ? C.ink : C.muted} fill={focused ? '#fff' : undefined} />
      </Animated.View>
      <Text style={{ fontFamily: focused ? F.semi : F.regular, fontSize: 11, color: focused ? C.ink : C.muted }}>{label}</Text>
    </Pressable>
  );
}

export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(insets.bottom, 10) + 4 }}>
      <View style={{ position: 'absolute', top: 4, bottom: -4, left: 0, right: 0, borderRadius: 28, backgroundColor: C.ink }} />
      <View style={{
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 28, borderWidth: STROKE, borderColor: C.ink,
        paddingVertical: 8, paddingHorizontal: 4,
      }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = descriptors[route.key].options.title ?? route.name;
          return (
            <Tab key={route.key} focused={focused} label={label} icon={ICONS[route.name] ?? 'bolt'}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) { tap(); navigation.navigate(route.name); }
              }} />
          );
        })}
      </View>
    </View>
  );
}
