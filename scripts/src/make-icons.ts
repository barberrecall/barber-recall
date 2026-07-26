/**
 * Gera os ícones do app móvel.
 *
 * Desenha o mesmo monograma da tela de login — um "b" branco sobre quase preto —
 * em vez de depender de um arquivo de design externo. O sistema visual do app é
 * monocromático e tipográfico, então a marca é uma letra construída de duas
 * formas: uma haste retangular e um anel.
 *
 * O PNG é escrito à mão (assinatura + IHDR + IDAT + IEND, com CRC32 e deflate do
 * `node:zlib`) porque nenhuma biblioteca de imagem é dependência do projeto e
 * uma imagem de cor plana com duas formas geométricas não justifica adicionar
 * uma. Rasterizar texto de verdade exigiria uma fonte; um "b" minúsculo não.
 *
 * Uso: pnpm --filter @workspace/scripts run icons
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const OUT_DIR = join(import.meta.dirname, "..", "..", "artifacts", "barber-app", "assets");

/** Cores do sistema visual (ver artifacts/barber-app/tailwind.config.js). */
const NIGHT: RGBA = [0x1a, 0x1a, 0x1c, 255];
const WHITE: RGBA = [0xff, 0xff, 0xff, 255];
const TRANSPARENT: RGBA = [0, 0, 0, 0];

type RGBA = [number, number, number, number];

// ── PNG ──────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, crc]);
}

function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidade de bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sem entrelaçamento

  // Cada linha leva um byte de filtro (0 = nenhum) antes dos pixels.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Desenho ──────────────────────────────────────────────────────────────────

/**
 * O "b" como duas formas: haste e anel.
 *
 * `scale` é a fração do lado ocupada pela letra. O ícone adaptativo do Android
 * é recortado em círculo pelo sistema, então lá a letra precisa caber na zona
 * segura central (~66%) para não perder as pontas.
 */
function drawMonogram(
  size: number,
  background: RGBA,
  foreground: RGBA,
  scale: number,
): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const unit = size * scale;

  // Haste vertical, deslocada à esquerda do centro.
  const stemWidth = unit * 0.13;
  const stemLeft = cx - unit * 0.34;
  const stemTop = cy - unit * 0.5;
  const stemBottom = cy + unit * 0.5;

  // Anel: a barriga do "b", encostando na haste.
  const bowlCx = cx + unit * 0.03;
  const bowlCy = cy + unit * 0.18;
  const bowlOuter = unit * 0.32;
  const bowlInner = unit * 0.17;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inStem =
        x >= stemLeft && x < stemLeft + stemWidth && y >= stemTop && y < stemBottom;

      const dx = x - bowlCx;
      const dy = y - bowlCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inBowl = dist <= bowlOuter && dist >= bowlInner;

      const color = inStem || inBowl ? foreground : background;

      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }

  return pixels;
}

function write(name: string, size: number, pixels: Uint8Array): void {
  const file = join(OUT_DIR, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(size, size, pixels));
  console.log(`  ${name}  ${size}x${size}`);
}

console.log("Gerando ícones em artifacts/barber-app/assets:");

// Ícone principal: fundo escuro, como o quadrado da tela de login.
write("icon.png", 1024, drawMonogram(1024, NIGHT, WHITE, 0.5));

// Android compõe o primeiro plano sobre `adaptiveIcon.backgroundColor`, então
// aqui o fundo é transparente e a letra é menor, para sobreviver ao recorte.
write("adaptive-icon.png", 1024, drawMonogram(1024, TRANSPARENT, WHITE, 0.38));

// Splash: a marca sozinha, o fundo vem de `splash.backgroundColor`.
write("splash-icon.png", 512, drawMonogram(512, TRANSPARENT, WHITE, 0.44));

// Favicon, usado se o app rodar em web.
write("favicon.png", 64, drawMonogram(64, NIGHT, WHITE, 0.52));

console.log("Pronto.");
