import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateConfig } from '../core.js';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Uso: node scripts/validate-client.mjs <slug>');
  process.exit(1);
}

const path = resolve('clientes', slug, 'config.json');
try {
  const config = validateConfig(JSON.parse(await readFile(path, 'utf8')));
  if (config.business.slug !== slug) throw new Error(`El slug configurado (${config.business.slug}) no coincide con la carpeta (${slug}).`);
  console.log(`Configuración válida: ${config.business.name} · ${config.products.length} productos.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
