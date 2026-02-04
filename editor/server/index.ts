import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { type ViteDevServer } from 'vite';
import { readFileSync } from 'fs';

const yamlCfg = JSON.parse(readFileSync(path.resolve(__dirname, '../../scripts/yaml-cfg.json'), 'utf-8'));

const projectRoot = path.resolve(__dirname, '../../');
const inboxDir = path.resolve(projectRoot, 'src/data/inbox');
const contentDir = path.resolve(projectRoot, 'src/content');

// Helper to slugify
function titleToSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');
}

// Recursive file walker
async function getMdxFilesRecursively(dir: string, baseDir: string): Promise<string[]> {
	let results: string[] = [];
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...await getMdxFilesRecursively(fullPath, baseDir));
			} else if (entry.isFile() && entry.name.endsWith('.mdx')) {
				results.push(path.relative(baseDir, fullPath));
			}
		}
	} catch (e) {
		// Ignore errors
	}
	return results;
}

export default function editorBackend() {
	return {
		name: 'editor-backend',
		configureServer(server: ViteDevServer) {
			console.log('🔌 Editor Backend Plugin Initialized');
			server.middlewares.use(async (req, res, next) => {
				if (!req.url?.startsWith('/api/')) {
					return next();
				}

				const url = new URL(req.url, `http://${req.headers.host}`);
				const method = req.method;

				const sendJSON = (data: any) => {
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(data));
				};

				const sendError = (status: number, message: string) => {
					res.statusCode = status;
					res.end(JSON.stringify({ error: message }));
				};

				const readBody = async (): Promise<any> => {
					return new Promise((resolve, reject) => {
						let data = '';
						req.on('data', (chunk: any) => data += chunk);
						req.on('end', () => {
							try { resolve(JSON.parse(data)); } catch { resolve({}); }
						});
						req.on('error', reject);
					});
				};

				try {
					// --- INBOX API ---
					if (url.pathname === '/api/inbox' && method === 'GET') {
						const files = await fs.readdir(inboxDir);
						const inboxData: any[] = [];
						for (const file of files) {
							if (file.endsWith('.yaml') || file.endsWith('.yml')) {
								const content = await fs.readFile(path.join(inboxDir, file), 'utf-8');
								const parsed = yaml.parse(content);
								inboxData.push({ filename: file, data: parsed });
							}
						}
						return sendJSON(inboxData);
					}

					if (url.pathname === '/api/inbox/delete' && method === 'POST') {
						const body = await readBody();
						const { filename, category, title } = body;
						const filePath = path.join(inboxDir, filename);
						const content = await fs.readFile(filePath, 'utf-8');
						const fileData = yaml.parse(content);
						if (fileData[category]) {
							if (Array.isArray(fileData[category])) {
								fileData[category] = fileData[category].filter((e: any) => {
									const t = typeof e === 'string' ? e : Object.keys(e)[0];
									return t !== title;
								});
								if (fileData[category].length === 0) delete fileData[category];
							} else {
								delete fileData[category][title];
								if (Object.keys(fileData[category]).length === 0) delete fileData[category];
							}
							if (Object.keys(fileData).length === 0) {
								await fs.unlink(filePath);
							} else {
								await fs.writeFile(filePath, yaml.stringify(fileData, yamlCfg), 'utf-8');
							}
						}
						return sendJSON({ success: true });
					}

					// --- CONTENT API ---

					// CREATE
					if (url.pathname === '/api/content/create' && method === 'POST') {
						const body = await readBody();
						const { type, title, slug: providedSlug, tags, ...other } = body;
						if (!type || !title) return sendError(400, "Missing type or title");

						const slug = providedSlug || titleToSlug(title);
						const typeDir = path.join(contentDir, type);
						// Ensure dir exists (recursive)
						await fs.mkdir(typeDir, { recursive: true });

						const dest = path.join(typeDir, slug + '.mdx');
						try {
							await fs.access(dest);
							return sendError(409, "File already exists");
						} catch { }

						console.log(tags);
						const frontmatter = {
							title,
							created: Math.floor(Date.now() / 1000),
							tags: tags ? tags : undefined,
							...other
						};
						const doc = new yaml.Document(frontmatter);
						if (tags) {
							const tagsNode = doc.get('tags') as any;
							if (tagsNode) tagsNode.flow = true;
						}
						const fileContent = `---\n${doc.toString(yamlCfg)}---\n`;
						await fs.writeFile(dest, fileContent, 'utf-8');
						return sendJSON({ success: true, path: dest, slug });
					}

					// LIST TYPES (Top level only)
					if (url.pathname === '/api/content' && method === 'GET') {
						const dirs = (await fs.readdir(contentDir, { withFileTypes: true }))
							.filter(d => d.isDirectory())
							.map(d => d.name);
						return sendJSON(dirs);
					}

					// LIST FILES/GET FILE
					if (url.pathname.startsWith('/api/content/')) {
						const relativePath = decodeURIComponent(url.pathname.replace('/api/content/', ''));
						const fullPath = path.join(contentDir, relativePath);

						// 1. Try as Directory (List Files Recursively)
						try {
							const stats = await fs.stat(fullPath);
							if (stats.isDirectory() && method === 'GET') {
								// Return all .mdx files recursively
								const files = await getMdxFilesRecursively(fullPath, fullPath);
								const entries = [];
								for (const relFilePath of files) {
									const absPath = path.join(fullPath, relFilePath);
									const content = await fs.readFile(absPath, 'utf-8');
									const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
									const frontmatter = match ? yaml.parse(match[1]) : {};
									// Slug is relative path minus extension
									const slug = relFilePath.replace(/\.mdx$/, '');
									entries.push({
										slug,
										...frontmatter
									});
								}
								return sendJSON(entries);
							}
						} catch { }

						// 2. Try as File (Get/Update)
						// Check if relativePath + .mdx exists
						const filePath = fullPath + '.mdx';
						try {
							await fs.access(filePath);

							if (method === 'GET') {
								const content = await fs.readFile(filePath, 'utf-8');
								const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
								if (match) {
									return sendJSON({
										frontmatter: yaml.parse(match[1]),
										body: match[2]
									});
								}
								return sendJSON({ content });
							}
							else if (method === 'POST') {
								const body = await readBody();
								const { frontmatter, body: contentBody } = body;
								const doc = new yaml.Document(frontmatter);
								if (frontmatter.tags) {
									const tagsNode = doc.get('tags') as any;
									if (tagsNode) tagsNode.flow = true;
								}
								const newContent = `---\n${doc.toString(yamlCfg)}---\n\n${contentBody}`;
								await fs.writeFile(filePath, newContent, 'utf-8');
								return sendJSON({ success: true });
							}
						} catch { }

						return sendError(404, "Not found");
					}

					next();
				} catch (err: any) {
					console.error(err);
					sendError(500, err.message);
				}
			});
		},
	};
}
