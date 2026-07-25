import { Stack } from 'expo-router';

export default function CommunityStackLayout() {
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
      <Stack.Screen name="directory" />
      <Stack.Screen name="member-profile" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="group-chat" />
      <Stack.Screen name="group-info" />
    </Stack>
  );
}
