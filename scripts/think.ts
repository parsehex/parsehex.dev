#!/usr/bin/env node
// recommended way to run:
//   npm i -g @antfu/ni
//   then (nr = npm run):
//     nr think
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { titleToSlug } from '../src/utils';
import yamlCfg from './yaml-cfg.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const argv = await yargs(hideBin(process.argv)).option('verbose', {
	type: 'boolean',
}).parse();

const contentDir = path.resolve(__dirname, '../src/content');

interface Thought {
	[timestamp: string]: string;
}

interface ContentEntry {
	title: string;
	created: number;
	thoughts?: Thought[];
}

async function getContentTypes(): Promise<string[]> {
	const dirs = (await fs.readdir(contentDir, { withFileTypes: true }))
		.filter(v => v.isDirectory());

	const typesWithContent: string[] = [];

	for (const dir of dirs) {
		const typeDir = path.join(contentDir, dir.name);
		const files = await fs.readdir(typeDir);
		if (files.some(file => file.endsWith('.mdx'))) {
			typesWithContent.push(dir.name);
		}
	}

	return typesWithContent;
}

async function getEntriesByType(contentType: string): Promise<{ slug: string; entry: ContentEntry }[]> {
	const typeDir = path.join(contentDir, contentType);
	const entries: { slug: string; entry: ContentEntry }[] = [];

	const files = await fs.readdir(typeDir);

	for (const file of files) {
		if (file.endsWith('.mdx')) {
			const filePath = path.join(typeDir, file);
			const content = await fs.readFile(filePath, 'utf-8');

			// Extract frontmatter
			const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
			if (frontmatterMatch) {
				const frontmatter = yaml.parse(frontmatterMatch[1]) as ContentEntry;
				const slug = file.replace('.mdx', '');

				entries.push({ slug, entry: frontmatter });
			}
		}
	}

	return entries;
}

async function selectContentType(): Promise<string> {
	const contentTypes = await getContentTypes();

	return await select({
		message: 'Select content type:',
		choices: contentTypes.map(type => ({
			name: type.charAt(0).toUpperCase() + type.slice(1),
			value: type,
		})),
	});
}

async function selectEntry(entries: { slug: string; entry: ContentEntry }[]): Promise<{ slug: string; entry: ContentEntry }> {
	const choices = entries.map(({ slug, entry }) => ({
		name: `${entry.title}${entry.thoughts && Object.keys(entry.thoughts).length > 0 ? chalk.dim(` (${Object.keys(entry.thoughts).length} thoughts)`) : ''}`,
		value: { slug, entry },
	}));

	return await select({
		message: 'Select entry to add thoughts to:',
		choices,
	});
}

async function addThoughtToFile(contentType: string, slug: string, thoughtData: { [timestampOrOther: string]: string }): Promise<void> {
	const filePath = path.join(contentDir, contentType, slug + '.mdx');
	const content = await fs.readFile(filePath, 'utf-8');

	// Extract frontmatter and content body
	const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
	if (!frontmatterMatch) {
		throw new Error('Invalid file format: no frontmatter found');
	}

	const [_, frontmatterStr, body] = frontmatterMatch;
	const frontmatter = yaml.parse(frontmatterStr) as ContentEntry;

	if (!frontmatter.thoughts) {
		frontmatter.thoughts = [];
	}

	frontmatter.thoughts.push(thoughtData);

	// Write back to file
	// const newFrontmatter = yaml.stringify(frontmatter, yamlCfg).trim();
	const doc = new yaml.Document(frontmatter);
	if (doc.get('tags')) (doc.get('tags') as any).flow = true;
	const newFrontmatter = doc.toString(yamlCfg).trim();
	const newContent = `---\n${newFrontmatter}\n---\n${body}`;

	await fs.writeFile(filePath, newContent, { encoding: 'utf-8' });
}

async function main() {
	try {
		console.log(chalk.blue('💭 Thought Manager\n'));

		// Select content type
		const contentType = await selectContentType();

		if (argv.verbose) {
			console.log(chalk.dim(`Selected content type: ${contentType}`));
		}

		// Get entries for selected content type
		const entries = await getEntriesByType(contentType);

		if (entries.length === 0) {
			console.log(chalk.yellow(`No entries found for content type: ${contentType}`));
			return;
		}

		// Select entry to add thoughts to
		const selectedEntry = await selectEntry(entries);

		if (argv.verbose) {
			console.log(chalk.dim(`Selected entry: ${selectedEntry.entry.title}`));
		}

		// Get thought input from user
		const thoughtStr = await input({
			message: 'Enter your thought:',
			validate: (v) => v.trim().length > 0 || 'Thought is required',
		});

		// Build the thought object with optional extra data
		const thoughtData: { [timestampOrOther: string]: string } = {};
		let currentTimestamp = Math.floor(Date.now() / 1000);
		thoughtData[currentTimestamp] = thoughtStr;

		// Ask for optional extra data
		let addMore = true;
		console.log('Would you like to add extra data for this thought?');
		while (addMore) {
			const extraKey = await input({
				message: 'Enter optional key (Enter to finish):',
				default: '',
			});

			if (!extraKey.trim()) {
				addMore = false;
				break;
			}

			const extraValue = await input({
				message: `Enter value for "${extraKey}":`,
			});

			thoughtData[extraKey] = extraValue.trim() || '';
		}

		console.log(chalk.blue('\n💭 Adding thought...\n'));

		await addThoughtToFile(contentType, selectedEntry.slug, thoughtData);

		console.log(chalk.green(`✓ Thought added to: ${selectedEntry.entry.title}`));
		console.log(chalk.dim(`  Timestamp: ${new Date().toLocaleString()}`));

	} catch (error) {
		console.error(chalk.red('Error:'), error);
		process.exit(1);
	}
}

main();
