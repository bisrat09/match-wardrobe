import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { ErrorBoundary } from "~/components/ErrorBoundary";
// import { runStartupMigration } from "~/lib/startupMigration"; // DISABLED: Causing data loss

export default function RootLayout() {
  useEffect(() => {
    // DISABLED: Migration causing data loss
    // runStartupMigration().catch(console.error);
  }, []);
  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: true,
          animation: Platform.select({ ios: "default", android: "fade_from_bottom" })
        }}
      />
    </ErrorBoundary>
  );
}