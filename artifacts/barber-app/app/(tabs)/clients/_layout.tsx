import { Stack } from "expo-router";

/**
 * Pilha dentro da aba Clientes.
 *
 * Sem este layout o expo-router não saberia qual das rotas da pasta é a tela da
 * aba, e o detalhe (`[id]`) não teria como empilhar sobre a lista mantendo a
 * barra inferior visível.
 */
export default function ClientsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
