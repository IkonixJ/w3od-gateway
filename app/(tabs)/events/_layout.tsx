import { Stack } from 'expo-router';

export default function EventsStackLayout() {
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
      <Stack.Screen name="event-detail" />
      <Stack.Screen name="admin-events" />
      <Stack.Screen name="create-event" />
    </Stack>
  );
}
