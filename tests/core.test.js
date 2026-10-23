import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ConfigError,
  ORDER_MODES,
  buildOrderMessage,
  buildWhatsappUrl,
  calculateTotals,
  sanitizeCart,
  validateCheckout,
  validateConfig
} from '../core.js';

const raw = JSON.parse(await readFile(new URL('../config.json', import.meta.url), 'utf8'));
const withPhone = (value = '5491112345678') => ({
  ...raw,
  business: { ...raw.business, whatsapp: value }
});
const withoutPhone = () => ({
  ...raw,
  business: { ...raw.business, whatsapp: '' }
});

test('valida y normaliza la configuración vigente', () => {
  const config = validateConfig(raw);
  assert.equal(config.schemaVersion, 2);
  assert.equal(config.products.length, 12);
  assert.equal(config.products[0].available, true);
  assert.equal(config.business.slug, 'nori');
});

test('rechaza IDs duplicados, precios inválidos y categorías inexistentes', () => {
  const broken = structuredClone(raw);
  broken.products[1].id = broken.products[0].id;
  broken.products[1].price = -1;
  broken.products[1].category = 'No existe';
  assert.throws(() => validateConfig(broken), ConfigError);
});

test('sanea el carrito persistido y descarta productos agotados', () => {
  const config = validateConfig(raw);
  config.products[0].available = false;
  assert.deepEqual(sanitizeCart({ c1: 1, c2: 2, nope: 4, r1: 0, r2: 100, r3: 1.5 }, config.products), { c2: 2 });
});

test('calcula retiro y delivery sin modificar el carrito', () => {
  const config = validateConfig(withPhone());
  const cart = { c1: 2, b1: 1 };
  assert.deepEqual(calculateTotals(config, cart, ORDER_MODES.PICKUP), { subtotal: 60900, delivery: 0, total: 60900 });
  assert.deepEqual(calculateTotals(config, cart, ORDER_MODES.DELIVERY), { subtotal: 60900, delivery: 2500, total: 63400 });
});

test('valida nombre, dirección, mínimo y WhatsApp antes de continuar', () => {
  const config = validateConfig(withoutPhone());
  assert.equal(validateCheckout(config, { c1: 1 }, { name: '', mode: ORDER_MODES.PICKUP }).code, 'NAME_REQUIRED');
  assert.equal(validateCheckout(config, { c1: 1 }, { name: 'Oli', mode: ORDER_MODES.DELIVERY, address: '' }).code, 'ADDRESS_REQUIRED');
  assert.equal(validateCheckout(config, { b1: 1 }, { name: 'Oli', mode: ORDER_MODES.DELIVERY, address: 'Calle 1' }).code, 'MINIMUM_DELIVERY');
  assert.equal(validateCheckout(config, { c1: 1 }, { name: 'Oli', mode: ORDER_MODES.PICKUP }).code, 'WHATSAPP_MISSING');
});

test('acepta delivery cuando el subtotal alcanza exactamente el mínimo', () => {
  const adjusted = withPhone();
  adjusted.business.minimumDelivery = 3900;
  const config = validateConfig(adjusted);
  assert.equal(validateCheckout(config, { b1: 1 }, { name: 'Oli', mode: ORDER_MODES.DELIVERY, address: 'Calle 1' }), null);
});

test('incluye dirección cuando el delivery es gratuito', () => {
  const freeDelivery = withPhone();
  freeDelivery.business.deliveryFee = 0;
  const config = validateConfig(freeDelivery);
  const details = { name: 'Oli', mode: ORDER_MODES.DELIVERY, address: 'Calle 123', notes: 'Sin salsa' };
  const message = buildOrderMessage(config, { c1: 1 }, details);
  assert.match(message, /Envío estimado: \$\s?0/);
  assert.match(message, /Dirección: Calle 123/);
  assert.match(message, /Aclaraciones: Sin salsa/);
});

test('genera una URL codificada sin afirmar que el pedido fue enviado', () => {
  const config = validateConfig(withPhone('+54 9 11 1234-5678'));
  const message = buildOrderMessage(config, { c1: 1 }, { name: 'Oli', mode: ORDER_MODES.PICKUP, address: '', notes: '' });
  const url = buildWhatsappUrl(config, message);
  assert.ok(url.startsWith('https://wa.me/5491112345678?text='));
  assert.equal(decodeURIComponent(url.split('?text=')[1]), message);
  assert.match(message, /¿Me confirman disponibilidad y total final\?/);
});

test('no genera enlace si falta un teléfono válido', () => {
  const config = validateConfig(withoutPhone());
  assert.equal(buildWhatsappUrl(config, 'hola'), null);
});
