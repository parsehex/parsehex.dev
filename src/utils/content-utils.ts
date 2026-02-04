import { getCollection } from 'astro:content';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { parse } from 'yaml';
import { resolve } from 'path';
import { titleToSlug } from '.';
import type { z } from 'astro/zod';
import { Thing } from '@/types/schema';

export type ContentType = 'movies' | 'shows' | 'people' | 'projects' | 'tools';

export interface ContentItem extends z.infer<typeof Thing> {
	note?: string; // .summary or .notes
	slug: string;
	category?: string; // first tag
	parent?: string;
	hasPage: boolean;
	source: 'mdx' | 'content-yaml' | 'inbox-yaml';
}

function getCategoryFromTags(tags?: string[]): string | undefined {
	return tags?.[0];
}

function parseYamlEntry(entry: any): { title: string; note?: string } {
	if (typeof entry === 'string') {
		const [titlePart, ...noteParts] = entry.split(':');
		return {
			title: titlePart.trim(),
			note: noteParts.join(':').trim() || undefined,
		};
	} else if (typeof entry === 'object') {
		const entries = Object.entries(entry);
		if (entries.length > 0) {
			return {
				title: entries[0][0],
				note: entries[0][1] as string,
			};
		}
	}
	return { title: String(entry) };
}

export async function getContentItems(
	contentType: ContentType,
): Promise<ContentItem[]> {
	const items: ContentItem[] = [];

	// 1. Get MDX entries from collection
	try {
		const collection = await getCollection(contentType);
		for (const entry of collection) {
			// entry.id can be like "the-boys.mdx" or "subfolder/the-boys.mdx"
			const slug = entry.id.replace(/\.mdx$/, '');
			let parent = undefined as any;
			if (slug.includes('/')) {
				parent = slug.split('/')[0];
			}
			items.push({
				category: getCategoryFromTags(entry.data.tags),
				hasPage: true,
				slug,
				parent,
				source: 'mdx',
				...entry.data,
			});
		}
	} catch (error) {
		console.error(`Error getting MDX collection for ${contentType}: ${error}`);
	}

	// 2. Read content YAML files (src/content/{type}/*.yaml)
	const contentDir = resolve(`./src/content/${contentType}`);
	if (existsSync(contentDir)) {
		const files = readdirSync(contentDir).filter((f) => f.endsWith('.yaml'));
		for (const file of files) {
			try {
				const yamlPath = resolve(contentDir, file);
				const yamlContent = readFileSync(yamlPath, 'utf-8');
				const data = parse(yamlContent);

				if (typeof data === 'object' && data !== null) {
					for (const [category, entries] of Object.entries(data)) {
						if (Array.isArray(entries)) {
							for (const entry of entries) {
								const parsed = parseYamlEntry(entry);
								console.log('parsed', parsed);
								items.push({
									...parsed,
									created: 0,
									category,
									hasPage: false,
									slug: titleToSlug(parsed.title) || '',
									source: 'content-yaml',
								});
							}
						}
					}
				}
			} catch (error) {
				console.warn(`Error reading content YAML ${file}:`, error);
			}
		}
	}

	// 3. Read inbox YAML (inbox/{type}.yaml)
	const inboxPath = resolve(`./src/data/inbox/${contentType}.yaml`);
	if (existsSync(inboxPath)) {
		try {
			const yamlContent = readFileSync(inboxPath, 'utf-8');
			const data = parse(yamlContent);

			if (typeof data === 'object' && data !== null) {
				for (const [category, entries] of Object.entries(data)) {
					if (Array.isArray(entries)) {
						for (const entry of entries) {
							const parsed = parseYamlEntry(entry);
							items.push({
								...parsed,
								created: 0,
								category,
								hasPage: false,
								slug: titleToSlug(parsed.title) || '',
								source: 'inbox-yaml',
							});
						}
					}
				}
			}
		} catch (error) {
			console.warn(`Error reading inbox YAML for ${contentType}:`, error);
		}
	}

	// Deduplicate: MDX entries take precedence over YAML entries with the same slug
	const seen = new Set<string>();
	const deduplicated: ContentItem[] = [];

	for (const item of items) {
		if (!seen.has(item.slug)) {
			seen.add(item.slug);
			deduplicated.push(item);
		} else {
			// merge info from inbox item
			const existing = deduplicated.find((i) => i.slug === item.slug);
			if (existing && item.note && !existing.note) {
				existing.note = item.note;
			}
			if (existing && item.category && !existing.category) {
				existing.category = item.category;
			}
		}
	}

	return deduplicated.sort(
		(a, b) => Number(b.created) - Number(a.created),
	);
}

export function groupByCategory(
	items: ContentItem[],
): Map<string, ContentItem[]> {
	const grouped = new Map<string, ContentItem[]>();

	for (const item of items) {
		const category = item.category || 'uncategorized';
		if (!grouped.has(category)) {
			grouped.set(category, []);
		}
		grouped.get(category)!.push(item);
	}

	return new Map(
		Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0])),
	);
}

export interface ThoughtItem {
	timestamp: string;
	content: any;
	thing: {
		title: string;
		slug: string;
		type: ContentType;
		category?: string;
	};
}

export async function getAllThoughts(
	filterType?: ContentType | string,
): Promise<ThoughtItem[]> {
	const allTypes: ContentType[] = [
		'movies',
		'shows',
		'people',
		'projects',
		'tools',
	]; // Keep in sync with ContentType type
	let items: ContentItem[] = [];

	// If filterType matches one of the collections, fetching just that is efficient
	if (filterType && allTypes.includes(filterType as ContentType)) {
		items = await getContentItems(filterType as ContentType);
	} else {
		// Otherwise fetch everything (needed if filterType is a subtype or to get all)
		for (const type of allTypes) {
			const typeItems = await getContentItems(type);
			// modify items to include 'type' if it's not already in ContentItem (it isn't by default in the interface above)
			// effectively we need to augment the item with its type for the thought context
			const typedItems = typeItems.map((item) => ({ ...item, type }));
			items.push(...typedItems as any);
		}
	}

	// Filter by subtype if needed (e.g. 'tools/ai')
	if (filterType && filterType.includes('/')) {
		// filterType is like "tools/ai"
		// items should be filtered where the item's ID or slug starts with the pattern?
		// OR checks the parent.
		const [mainType, subType] = filterType.split('/');
		// Re-filter just in case we fetched everything
		items = items.filter(i => (i as any).type === mainType && i.parent === subType);
	}

	const allThoughts: ThoughtItem[] = [];

	for (const item of items) {
		if (item.thoughts && Array.isArray(item.thoughts)) {
			for (const thoughtObj of item.thoughts) {
				const entries = Object.entries(thoughtObj);
				for (const [key, value] of entries) {
					// Check if key is a timestamp (numeric)
					if (!isNaN(Number(key))) {
						allThoughts.push({
							timestamp: key,
							content: value,
							thing: {
								title: item.title,
								slug: item.slug,
								type: (item as any).type || filterType as ContentType, // Fallback if type wasn't merged
								category: item.category,
							},
						});
					}
				}
			}
		}
	}

	// Sort by timestamp descending
	return allThoughts.sort(
		(a, b) => Number(b.timestamp) - Number(a.timestamp),
	);
}

// takes a pre-filtered list of thoughts (used by individual pages)
export function updateThoughts(thoughts: ThoughtItem[], thing: ContentItem) {
	thing = JSON.parse(JSON.stringify(thing));
	thoughts = thoughts || [];
	return thoughts.map((thought) => {
		const timestamp = Object.keys(thought)[0];
		// @ts-ignore
		const content = thought[timestamp];
		return { timestamp, content, thing };
	});
}
