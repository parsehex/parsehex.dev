#!/usr/bin/env node
// recommended way to run:
//   npm i -g @antfu/ni
//   then (nr = npm run):
//     nr new [type[:id-slug] ["Title of Thing"]]
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml, { parseDocument, Document } from 'yaml';
import * as YAML from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { slugToTitle, titleToSlug } from '../src/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const argv = await yargs(hideBin(process.argv)).option('overwrite', {
	type: 'boolean',
}).option('verbose', {
	type: 'boolean',
}).parse();

const contentDir = path.resolve(__dirname, '../src/content');

let type = '';
let idSlug = '';
let title = '';
let tags = '';

if (argv._.length > 0) {
	const args = argv._ as string[];

	if (args[0].includes(':') === false) {
		type = args[0];
	} else {
		[type, idSlug] = args[0].split(':');
	}

	if (args[1]) title = args[1];

	if (args[2]) tags = args[2];
}

if (argv.verbose) {
	console.log(argv);
	console.log('type:', type);
	console.log('id:', idSlug);
	console.log('title:', title);
}

const availTypes = (await fs.readdir(contentDir, { withFileTypes: true })).filter((v) => v.isDirectory()).map((v) => v.name);

if (!type) {
	type = await select({
		message: 'Content Type:',
		choices: availTypes.map((v) => ({
			name: v,
			value: v,
		})),
	});
}

if (!availTypes.includes(type)) {
	console.log('Invalid content type:', chalk.bold.red(type));
	console.log('Available types:', availTypes.map((v) => chalk.bold.underline.green(v)).join(', '));
	process.exit(1);
}

if (!title) {
	const suggested = slugToTitle(idSlug);

	title = await input({
		message: 'Title:',
		default: suggested,
		validate: (v) => v.trim().length > 0 || 'Title is required',
	});
}

if (!idSlug) {
	const suggested = titleToSlug(title);

	idSlug = await input({
		message: 'ID (slug):',
		default: suggested,
		validate: (v) =>
			/^[a-z0-9-]+$/.test(v) ||
			'Slug must be lowercase and contain only letters, numbers, and dashes',
	});
}

// TODO prompt for optional tags (reuse from think)

const typeDir = path.join(contentDir, type);
const dest = path.join(typeDir, idSlug + '.mdx');

let exists = false;
try {
	await fs.access(dest, fs.constants.R_OK | fs.constants.W_OK);
	exists = true;
} catch { }
if (exists && !argv.overwrite) {
	const ok = await confirm({
		message: `File already exists. Overwrite ${chalk.bold(idSlug + '.mdx')}?`,
		default: false,
	});
	if (!ok) {
		console.log(chalk.dim('Aborted.'));
		process.exit(0);
	}
}

const doc = new Document({
	title,
	created: Math.floor(Date.now() / 1000),
	tags: tags ? tags.split(',') : undefined,
});

// use single-line syntax for tags list:
(doc.get('tags') as any).flow = true;

const fileContent = `---
${doc.toString({ flowCollectionPadding: false })}
---\n`;


await fs.writeFile(dest, fileContent, { encoding: 'utf-8' });

console.log('Created:', dest);

// TODO: we should look through thing references to find any un-linked that appear to be the newly created page
//   if so, offer to update with full_id
