import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';

export default defineConfig({
	integrations: [vue(), icon(), mdx()],
});
