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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
