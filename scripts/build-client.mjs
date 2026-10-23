import { cp, copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { validateConfig } from '../core.js';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Uso: node scripts/build-client.mjs <slug>');
  process.exit(1);
}

const root = resolve('.');
const clientRoot = resolve(root, 'clientes', slug);
const distRoot = resolve(root, 'dist');
const output = resolve(distRoot, slug);
if (!output.startsWith(`${distRoot}${sep}`)) throw new Error('Directorio de salida inválido.');

const configPath = resolve(clientRoot, 'config.json');
const config = validateConfig(JSON.parse(await readFile(configPath, 'utf8')));
if (config.business.slug !== slug) throw new Error(`El slug configurado (${config.business.slug}) no coincide con la carpeta (${slug}).`);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(['index.html', 'styles.css', 'cart-layout.css', 'app.js', 'core.js'].map(file => copyFile(resolve(root, file), resolve(output, file))));
await copyFile(configPath, resolve(output, 'config.json'));

try { await cp(resolve(clientRoot, 'assets'), resolve(output, 'assets'), { recursive: true }); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

console.log(`Sitio generado en dist/${slug} para ${config.business.name}.`);
