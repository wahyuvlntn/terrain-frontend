// `@tailwindcss/postcss` only publishes types through its package.json "exports" map, which the
// workspace's "moduleResolution": "Node" does not read (used by vite.config.ts).
declare module '@tailwindcss/postcss' {
  import type { PluginCreator } from 'postcss';

  const tailwindcss: PluginCreator<Record<string, unknown>>;
  export default tailwindcss;
}
