import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

/**
 * `PORT` só alimenta `server.port` e `preview.port`. Exigi-la também no build
 * obrigava quem empacota — o Dockerfile, entre outros — a inventar um número de
 * porta que nunca é usado, e a falha só aparecia no meio da construção da
 * imagem. Agora a exigência acompanha quem realmente precisa dela.
 */
function requirePort(): number {
  const raw = process.env.PORT;

  if (!raw) {
    throw new Error(
      'PORT environment variable is required but was not provided.',
    );
  }

  const port = Number(raw);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }

  return port;
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig(async ({ command }) => ({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port: command === 'serve' ? requirePort() : undefined,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // On Replit, /api is proxied to the api-server by the platform router.
    // Locally there's no such router, so proxy it ourselves in dev.
    ...(process.env.REPL_ID === undefined
      ? {
          proxy: {
            '/api': {
              target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
  preview: {
    port: command === 'serve' ? requirePort() : undefined,
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
