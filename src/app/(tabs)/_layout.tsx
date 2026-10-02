import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../components/TabBar';
import { C } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'ภาพรวม' }} />
      <Tabs.Screen name="meter" options={{ title: 'มิเตอร์' }} />
      <Tabs.Screen name="ac" options={{ title: 'แอร์' }} />
      <Tabs.Screen name="receipts" options={{ title: 'ใบเสร็จ' }} />
      <Tabs.Screen name="charts" options={{ title: 'สถิติ' }} />
    </Tabs>
  );
}
