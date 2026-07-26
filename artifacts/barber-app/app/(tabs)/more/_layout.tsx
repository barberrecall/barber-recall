import { Stack } from "expo-router";

/** Pilha da aba Mais: menu e as quatro áreas secundárias. */
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
