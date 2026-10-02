import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts, Mitr_300Light, Mitr_400Regular, Mitr_500Medium, Mitr_600SemiBold, Mitr_700Bold,
} from '@expo-google-fonts/mitr';
import { C, F } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Mitr_300Light, Mitr_400Regular, Mitr_500Medium, Mitr_600SemiBold, Mitr_700Bold });
  const ready = loaded || !!error;

  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTintColor: C.ink,
        headerTitleStyle: { fontFamily: F.semi, fontSize: 18, color: C.ink },
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'ตั้งค่า' }} />
        <Stack.Screen name="ac-confirm" options={{ title: 'นำเข้าข้อมูลแอร์' }} />
        <Stack.Screen name="bill-edit" options={{ title: 'บิลค่าไฟ กฟน.' }} />
        <Stack.Screen name="receipt/new" options={{ title: 'สร้างใบเสร็จ' }} />
        <Stack.Screen name="receipt/[id]" options={{ title: 'ใบเสร็จ' }} />
      </Stack>
    </>
  );
}
