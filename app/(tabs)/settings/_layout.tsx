import { Stack } from 'expo-router';

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 280,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="security" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
