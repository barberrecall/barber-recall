import "../global.css";

import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClient } from "@/lib/api";
import { AuthProvider } from "@/contexts/auth-context";

// Point the shared API client at the server before any query can run. This is
// module scope on purpose — a useEffect would fire after the first render, by
// which time queries may already have been issued against no base URL.
configureApiClient();

export default function RootLayout() {
  const scheme = useColorScheme();

  // Created in state so the client survives re-renders without being recreated,
  // which would drop the cache on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
