import { Stack } from 'expo-router';

export default function WalletStackLayout() {
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
      <Stack.Screen name="send" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="history" />
      <Stack.Screen name="redemption" />
      <Stack.Screen name="bank-account" />
      <Stack.Screen name="transaction-detail" />
    </Stack>
  );
}
