// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'tr'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
