/// <reference types="vitest" />
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY || 'https://localhost:4500';
  return {
    plugins: [svgr(), react()],
    resolve: {
      alias: {
        '@digital-twin/components': resolve(__dirname, 'src/shared/components/index.ts'),
        '@digital-twin/icons': resolve(__dirname, 'src/shared/assets/lib/icon/index.ts'),
        '@digital-twin/images': resolve(__dirname, 'src/shared/assets/lib/image'),
        '@digital-twin/reusables': resolve(__dirname, 'src/shared/ui'),
        '@digital-twin/utils': resolve(__dirname, 'src/shared/utils/index.ts'),
      },
    },
    server: {
      port: 4200,
      host: '0.0.0.0',
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true, secure: false },
        '/public': { target: proxyTarget, changeOrigin: true, secure: false },
      },
    },
    preview: { port: 4300, host: '0.0.0.0' },
    css: { postcss: { plugins: [tailwindcss()] } },
    define: mode === 'test' ? {} : Object.fromEntries(
      Object.entries({
        VITE_ORG: env.VITE_ORG || 'local',
        VITE_PRJ: env.VITE_PRJ || 'digital_twin_afdd',
        VITE_DEV: mode === 'development' ? 'true' : 'false',
        VITE_API_URL: env.VITE_API_URL || '',
        VITE_DB_BUSINESS: env.VITE_DB_BUSINESS || 'am',
        VITE_DB_MACHINE: env.VITE_DB_MACHINE || 'amm',
        VITE_MQTT_URL: env.VITE_MQTT_URL || '',
        VITE_MQTT_USERNAME: env.VITE_MQTT_USERNAME || 'afdd_ui',
        VITE_MQTT_PASSWORD: env.VITE_MQTT_PASSWORD || 'indie123',
        VITE_MQTT_NOTIFICATION_TOPIC: env.VITE_MQTT_NOTIFICATION_TOPIC || 'AFDD_NOTIFICATION',
        // mqtt: live notifications from the backend's broker; poll: ask the API (no broker, Cloud Run)
        VITE_NOTIFY_MODE: env.VITE_NOTIFY_MODE || 'mqtt',
      }).map(([name, value]) => [`process.env.${name}`, JSON.stringify(value)])
    ),
    worker: { format: 'es' },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Bound memory use for the larger React suites in local/CI runs.
      threads: false,
    },
  };
});
