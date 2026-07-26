import { useEffect, useState } from "react";

/**
 * Portado de `artifacts/barber-crm/src/hooks/use-debounce.ts` sem alteração —
 * evita disparar uma busca na API a cada tecla digitada.
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
