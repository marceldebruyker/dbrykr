import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  const plugins = [react()];

  if (process.env.VERCEL !== '1') {
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    plugins.push(
      cloudflare({
        viteEnvironment: { name: 'server' },
        config: {
          main: './worker/index.ts',
          compatibility_flags: ['nodejs_compat'],
          assets: {
            binding: 'ASSETS',
            not_found_handling: 'single-page-application',
          },
        },
      })
    );
  }

  return {
    server: {
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0',
    },
    plugins,
    build: {
      rollupOptions: {
        input: {
          // "/" ist die Handschrift-Kontaktseite: reines HTML, kein Bundle.
          main: path.resolve(__dirname, 'index.html'),
          // "/cafe" ist weiterhin Chez Marcel · Café des Jeux.
          cafe: path.resolve(__dirname, 'cafe/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
