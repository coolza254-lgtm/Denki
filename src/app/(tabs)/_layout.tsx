import { Text, Pressable } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { C } from '../../components/ui';

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarLabelStyle: { fontSize: 12 },
        headerTitleStyle: { color: C.text },
        headerRight: () => (
          <Pressable onPress={() => router.push('/settings')} style={{ paddingHorizontal: 16 }} hitSlop={10}>
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </Pressable>
        ),
      }}>
      <Tabs.Screen name="index" options={{ title: 'ภาพรวม', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="meter" options={{ title: 'จดมิเตอร์', tabBarIcon: icon('🔢') }} />
      <Tabs.Screen name="ac" options={{ title: 'แอร์', tabBarIcon: icon('❄️') }} />
      <Tabs.Screen name="receipts" options={{ title: 'ใบเสร็จ', tabBarIcon: icon('🧾') }} />
      <Tabs.Screen name="charts" options={{ title: 'กราฟ', tabBarIcon: icon('📊') }} />
    </Tabs>
  );
}
