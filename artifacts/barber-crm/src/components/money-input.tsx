import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney, parseMoney } from "@/lib/money";

/**
 * Campo de valor em real.
 *
 * `type="number"` parecia resolver, mas deixava dois defeitos que só aparecem
 * com alguém digitando de verdade no balcão:
 *
 *   - o campo vinha preenchido com "0", então digitar 45 produzia "045";
 *   - o valor saía sem as duas casas ("45.5"), num formato que não é o que se
 *     lê em português.
 *
 * Aqui é `type="text"` com `inputMode="decimal"`: o teclado do celular ainda
 * abre numérico, mas o campo aceita vírgula em qualquer navegador, sem depender
 * do idioma configurado no aparelho — com `type="number"` isso variava. Ao sair
 * do campo o texto é normalizado para "45,00".
 */
export interface MoneyInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "inputMode" | "value" | "onChange"
  > {
  value: string;
  onChange: (value: string) => void;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, onBlur, disabled, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      // Só o que pode existir num valor. Bloquear aqui, enquanto digita, evita
      // que letra ou sinal chegue à validação e vire mensagem de erro por algo
      // que o campo nunca deveria ter aceitado.
      onChange(event.target.value.replace(/[^\d.,]/g, ""));
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      // Normaliza só o que dá para ler. Texto inválido fica como está para a
      // validação do formulário explicar o problema — apagar o que a pessoa
      // digitou esconderia o erro em vez de mostrá-lo.
      const numero = parseMoney(value);
      if (Number.isFinite(numero)) onChange(formatMoney(numero));
      onBlur?.(event);
    };

    return (
      <div className="relative">
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-muted-foreground",
            disabled && "opacity-50",
          )}
        >
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn("pl-10", className)}
          {...props}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
