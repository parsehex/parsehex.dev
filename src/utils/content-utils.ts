import { getCollection } from 'astro:content';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { parse } from 'yaml';
import { resolve } from 'path';
import { titleToSlug } from '.';
import type { z } from 'astro/zod';
import { Thing } from '@/types/schema';

export type ContentType = 'movies' | 'shows' | 'people' | 'projects' | 'tools';

export interface ContentItem extends z.infer<typeof Thing> {
	note?: string; // .summary
	slug: string;
	category?: string; // first tag
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
			items.push({
				category: getCategoryFromTags(entry.data.tags),
				hasPage: true,
				slug,
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

	return deduplicated;
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
