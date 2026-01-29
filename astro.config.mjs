import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import icon from 'astro-icon';
import astroI18next from 'astro-i18next';
import mdx from '@astrojs/mdx';

export default defineConfig({
	integrations: [vue(), icon(), astroI18next(), mdx()],
});
