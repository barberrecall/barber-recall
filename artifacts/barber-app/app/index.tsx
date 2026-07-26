import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/auth-context";

/**
 * Entry gate. While the stored token is being read from SecureStore the auth
 * state is still `loading`, and redirecting during that window would bounce an
 * already-logged-in user to the login screen on every cold start.
 */
export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return <Redirect href={user ? "/dashboard" : "/login"} />;
}
