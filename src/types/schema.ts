import { z } from 'astro/zod';

/** (See jsdoc for `ThingRef['full_id']` for details.) */
export const Full_ID = z.string();

export const ThingRef = z.object({
	/**
	 * Either:
	 * 1) a string that resolves to a Thing, prefixed with `type:`.
	 * (**e.g. `"shows:house-of-cards-us"`**)
	 *
	 * 2) a string that serves as the Title of a Thing that doesn't exist.
	 * (**e.g. `"Willem Dafoe"`**)
	 *
	 * This behavior should be used for linking to Things: #1 should use the resolved title + link, #2 should be the raw value without a link.
	 *
	 * This feature is intended to avoid needing quite so many links. Think of it like a Wikipedia page that doesn't exist - it's visibly separate / its own thing but doesn't resolve.
	 */
	full_id: Full_ID,
	/**
	 * Describes the relationship to the parent Thing. Written in the format (this thing) **relates to** (that thing).
	 *
	 * Example: A full `ThingRef` placed on a Thing for Will Smith could be:
	 *
	 * `{ full_id: 'people:jaden-smith', desc: 'father of' }`
	 *
	 * or (if no `people:jaden-smith` Thing):
	 *
	 * `{ full_id: 'Jaden Smith', desc: 'father of' }`
	 */
	desc: z.string().optional(),
});
const Thought = z.record(z.any());

export const Thing = z.object({
	title: z.string(),
	/** Hand-written, describes what this Thing is. */
	summary: z.string().optional(),
	/** AI-generated, describes what this Thing is based on the content of its file. (**TODO**) */
	ai_summary: z.string().optional(),
	note: z.string().optional(),
	notes: z.string().optional(),
	/** Main place where somebody can go to learn about this Thing. */
	url: z.string().optional(),
	// TODO: `external_id` (e.g. "tmdb:123456")
	//   used for populating page content (e.g. poster for movie/show)
	//   (would be saved in temp/git-ignored folder)
	created: z.coerce.number(),
	updated: z.coerce.number().optional(),
	tags: z.array(z.string()).optional(),
	references: z.array(ThingRef).optional(),
	thoughts: z.array(Thought).optional(),
});

export const Project = Thing.extend({
	/** Where the source code lives (if open source). */
	repo_url: z.string().optional(),
	docs_url: z.string().optional(),
});

export const Person = Thing.extend({
	// flag for is_me ?
});
