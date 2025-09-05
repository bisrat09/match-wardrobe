import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    // RN Screens perf boost for nav
  }, []);
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: Platform.select({ ios: "default", android: "fade_from_bottom" })
      }}
    />
  );
}