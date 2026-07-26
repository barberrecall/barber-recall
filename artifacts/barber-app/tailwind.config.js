/**
 * Sistema visual do app: monocromático, claro, com o login invertido em escuro.
 *
 * A identidade não vem de uma cor de marca — vem do contraste. Um bloco quase
 * preto dominando um campo cinza-claro, tipografia muito pesada nos títulos, e
 * formas em pílula em vez de retângulos arredondados.
 *
 * Não existe cor de acento. Onde antes havia âmbar, agora há preto; onde havia
 * verde/amarelo/vermelho de status, agora há valor (claro -> escuro). Um app
 * monocromático parece caro justamente porque cor preenchendo nada é uma
 * decisão, não uma ausência.
 *
 * Consequência que exigiu cuidado: sem cor, ênfase é contraste. Então o status
 * que pede ação (Em Risco) é o mais escuro e o que está resolvido (Ativo) é o
 * mais claro, para a lista se ler em direção aos problemas.
 *
 * Cores em hex direto, sem variáveis CSS: o tema claro é o único do app (só o
 * login inverte, e ele usa tokens próprios), então a indireção de `hsl(var())`
 * só adicionava um passo sem permitir troca de tema.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Superfícies ────────────────────────────────────────────────
        /** Fundo do app: cinza frio, nunca branco puro. */
        canvas: "#F1F2F4",
        /** Cartões e containers de lista. */
        surface: "#FFFFFF",
        /** O bloco de assinatura: quase preto, carrega o número principal. */
        hero: "#141416",
        /** Fundo de campo dentro de um cartão claro. */
        field: "#F4F5F7",

        // ── Tinta ──────────────────────────────────────────────────────
        ink: {
          DEFAULT: "#0A0A0B",
          /** Rótulos, valores secundários, sobrenomes de cabeçalho. */
          muted: "#8A8A8F",
          /** Texto sobre o bloco escuro. */
          inverse: "#FFFFFF",
          /** Secundário sobre o bloco escuro. */
          "inverse-muted": "#9A9AA0",
        },

        /** Fio entre linhas de lista agrupada. */
        hairline: "#E6E6EA",

        // ── Login: o único ecrã escuro ─────────────────────────────────
        night: {
          DEFAULT: "#1A1A1C",
          field: "#2C2C2F",
          muted: "#8A8A8F",
        },

        // ── Status de recall por valor, não por cor ────────────────────
        status: {
          risk: "#141416",
          waiting: "#8A8A8F",
          active: "#C6C6CC",
        },
      },

      borderRadius: {
        // Pílulas em vez de retângulos: é o que mais afasta do visual genérico.
        pill: "999px",
        card: "24px",
        hero: "28px",
        field: "16px",
      },

      fontSize: {
        /** Sobrenome de cabeçalho: minúsculo e apagado. */
        eyebrow: ["13px", { lineHeight: "18px" }],
        /** Título grande de tela. */
        title: ["34px", { lineHeight: "38px", letterSpacing: "-1px" }],
        /** Número herói dentro do bloco escuro. */
        hero: ["40px", { lineHeight: "44px", letterSpacing: "-1.5px" }],
      },
    },
  },
  plugins: [],
};
