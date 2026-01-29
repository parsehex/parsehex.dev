import { defineCollection, render } from 'astro:content';
import { glob } from 'astro/loaders';

const movies = defineCollection({
	loader: glob({ pattern: ['*.mdx'], base: 'src/content/movies' }),
	schema: Thing,
});
const people = defineCollection({
	loader: glob({ pattern: ['*.mdx'], base: 'src/content/people' }),
	schema: Person,
});
const projects = defineCollection({
	loader: glob({ pattern: ['*.mdx'], base: 'src/content/projects' }),
	schema: Project,
});
const shows = defineCollection({
	loader: glob({ pattern: ['*.mdx'], base: 'src/content/shows' }),
	schema: Thing,
});
const tools = defineCollection({
	loader: glob({ pattern: ['*.mdx'], base: 'src/content/tools' }),
	schema: Thing,
});

export const collections = { movies, people, projects, shows, tools };

