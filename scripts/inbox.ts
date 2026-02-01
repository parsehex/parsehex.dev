#!/usr/bin/env node
// recommended way to run:
//   npm i -g @antfu/ni
//   then (nr = npm run):
//     nr inbox
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { select, input, confirm, checkbox } from '@inquirer/prompts';
import { spawn } from 'child_process';
import { titleToSlug } from '../src/utils';

// TODO: look through thing references within the content to find any un-linked
//   should be displayed under "Uncategorized" or similar
//   of course, if the thing is in the inbox then use the inbox version

// TODO: allow typing from the start as way to filter Things in inbox
// TODO: 		same for `think`

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const argv = await yargs(hideBin(process.argv)).option('verbose', {
	type: 'boolean',
}).parse();

const inboxDir = path.resolve(__dirname, '../src/data/inbox');
const contentDir = path.resolve(__dirname, '../src/content');

interface InboxEntry {
	title: string;
	notes?: string;
}

interface InboxCategory {
	[key: string]: (string | InboxEntry)[];
}

interface InboxFile {
	[key: string]: InboxCategory;
}

async function loadInboxFiles(): Promise<{ [filename: string]: InboxFile }> {
	const files = await fs.readdir(inboxDir);
	const inboxFiles: { [filename: string]: InboxFile } = {};

	for (const file of files) {
		if (file.endsWith('.yaml') || file.endsWith('.yml')) {
			const filePath = path.join(inboxDir, file);
			const content = await fs.readFile(filePath, 'utf-8');
			const parsed = yaml.parse(content) as InboxFile;
			inboxFiles[file] = parsed;
		}
	}

	return inboxFiles;
}

function extractContentTypes(inboxFiles: { [filename: string]: InboxFile }): string[] {
	const contentTypes = new Set<string>();

	for (const filename of Object.keys(inboxFiles)) {
		// Extract content type from filename (e.g., 'movies.yaml' -> 'movies')
		const contentType = filename.replace(/\.(yaml|yml)$/, '');
		contentTypes.add(contentType);
	}

	return Array.from(contentTypes);
}

function getEntriesByType(inboxFiles: { [filename: string]: InboxFile }, contentType: string): { category: string; entries: InboxEntry[]; filename: string }[] {
	const entries: { category: string; entries: InboxEntry[]; filename: string }[] = [];

	for (const [filename, file] of Object.entries(inboxFiles)) {
		if (filename.startsWith(contentType)) {
			for (const [category, categoryEntries] of Object.entries(file)) {
				const parsedEntries: InboxEntry[] = categoryEntries.map((entry: any) => {
					if (typeof entry === 'string') {
						return { title: entry };
					} else if (entry && typeof entry === 'object' && Object.keys(entry).length === 1) {
						const [title] = Object.keys(entry);
						return { title, notes: entry[title] };
					}
					return { title: String(entry) };
				}).filter((entry: any) => entry.title);

				if (parsedEntries.length > 0) {
					entries.push({ category, entries: parsedEntries, filename });
				}
			}
		}
	}

	return entries;
}

async function selectContentType(contentTypes: string[]): Promise<string> {
	return await select({
		message: 'Select content type:',
		choices: contentTypes.map(type => ({
			name: type.charAt(0).toUpperCase() + type.slice(1),
			value: type,
		})),
	});
}

interface EntryWithContext extends InboxEntry {
	category: string;
	filename: string;
	originalIndex: number;
}

async function selectEntriesFromAllCategories(
	entriesByCategory: { category: string; entries: InboxEntry[]; filename: string }[]
): Promise<EntryWithContext[]> {
	const choices: Array<{ name: string; value: EntryWithContext; }> = [];

	let globalIndex = 0;
	for (const group of entriesByCategory) {
		// Add entries for this category with category prefix
		for (let i = 0; i < group.entries.length; i++) {
			const entry = group.entries[i];
			const categoryPrefix = chalk.cyan(chalk.dim('[') + group.category + chalk.dim(']'));
			choices.push({
				name: `${categoryPrefix} ${entry.title}${entry.notes ? chalk.dim(` - ${entry.notes}`) : ''}`,
				value: {
					...entry,
					category: group.category,
					filename: group.filename,
					originalIndex: i,
				},
			});
			globalIndex++;
		}
	}

	choices.sort((a, b) => a.name.localeCompare(b.name));

	const selectedEntries = await checkbox({
		message: 'Select entries to create (Space to select, Enter to confirm):',
		choices,
		required: true,
	});

	return selectedEntries.filter(e => e !== null);
}

async function createContentFile(entry: InboxEntry, contentType: string, category = ''): Promise<string> {
	return new Promise((resolve, reject) => {
		const slug = titleToSlug(entry.title);
		const child = spawn('vite-node', ['scripts/new.ts', `${contentType}:${slug}`, entry.title, category], {
			stdio: 'pipe',
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve(stdout.trim());
			} else {
				reject(new Error(stderr));
			}
		});
	});
}

async function removeEntryFromFile(filename: string, category: string, entryTitle: string): Promise<void> {
	const filePath = path.join(inboxDir, filename);
	const content = await fs.readFile(filePath, 'utf-8');
	const fileData = yaml.parse(content) as InboxFile;

	if (fileData[category]) {
		fileData[category] = fileData[category].filter((entry: any) => {
			if (typeof entry === 'string') {
				return entry !== entryTitle;
			} else if (entry && typeof entry === 'object' && Object.keys(entry).length === 1) {
				const [title] = Object.keys(entry);
				return title !== entryTitle;
			}
			return true;
		});

		// Remove empty categories
		if ((fileData[category] as any).length === 0) {
			delete fileData[category];
		}

		// Remove empty files
		if (Object.keys(fileData).length === 0) {
			await fs.unlink(filePath);
		} else {
			await fs.writeFile(filePath, yaml.stringify(fileData), { encoding: 'utf-8' });
		}
	}
}

async function main() {
	try {
		console.log(chalk.blue('📥 Inbox Content Manager\n'));

		// Load all inbox files
		const inboxFiles = await loadInboxFiles();

		if (Object.keys(inboxFiles).length === 0) {
			console.log(chalk.yellow('No inbox files found.'));
			return;
		}

		// Get available content types
		const contentTypes = extractContentTypes(inboxFiles);

		if (contentTypes.length === 0) {
			console.log(chalk.yellow('No content entries found in inbox files.'));
			return;
		}

		// Select content type
		const contentType = await selectContentType(contentTypes);

		if (argv.verbose) {
			console.log(chalk.dim(`Selected content type: ${contentType}`));
		}

		// Get entries for selected content type
		const entries = getEntriesByType(inboxFiles, contentType);

		if (entries.length === 0) {
			console.log(chalk.yellow(`No entries found for content type: ${contentType}`));
			return;
		}

		// Select entries from all categories
		const selectedEntries = await selectEntriesFromAllCategories(entries);

		if (selectedEntries.length === 0) {
			console.log(chalk.yellow('No entries selected.'));
			return;
		}

		console.log(chalk.blue(`\n📝 Creating ${selectedEntries.length} entry${selectedEntries.length > 1 ? 's' : ''}...\n`));

		for (const entry of selectedEntries) {
			try {
				console.log(chalk.dim(`Creating: ${entry.title} (${entry.category})`));

				// Create content file using existing new.ts script
				const result = await createContentFile(entry, contentType, entry.category);
				console.log(chalk.green(`✓ Created: ${result}`));

				// Remove entry from inbox file
				await removeEntryFromFile(entry.filename, entry.category, entry.title);
				console.log(chalk.dim(`  Removed from: ${entry.filename}`));

			} catch (error) {
				console.error(chalk.red(`✗ Failed to create ${entry.title}: ${error}`));
			}
		}

		console.log(chalk.green('\n🎉 All selected entries have been processed!'));

	} catch (error) {
		console.error(chalk.red('Error:'), error);
		process.exit(1);
	}
}

main();
