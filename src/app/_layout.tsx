import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { C } from '../components/ui';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: C.primary, headerTitleStyle: { color: C.text } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'ตั้งค่า' }} />
        <Stack.Screen name="ac-confirm" options={{ title: 'ตรวจค่าจากภาพ' }} />
        <Stack.Screen name="bill-edit" options={{ title: 'บิลค่าไฟ กฟน.' }} />
        <Stack.Screen name="receipt/new" options={{ title: 'สร้างใบเสร็จ' }} />
        <Stack.Screen name="receipt/[id]" options={{ title: 'ใบเสร็จ' }} />
      </Stack>
    </>
  );
}
