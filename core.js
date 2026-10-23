const DEFAULT_CONTENT = {
  demoNotice: 'DEMO DE MARKETING BY OLI · Productos y precios ficticios',
  heroEyebrow: 'EL SABOR DE UN BUEN PLAN',
  heroTitle: 'Sushi que inspira',
  heroEmphasis: 'momentos.',
  heroDescription: 'Armá tu pedido, elegí tus favoritos y envialo por WhatsApp en segundos.',
  menuEyebrow: 'HECHO PARA TUS ANTOJOS',
  menuTitle: 'Nuestro menú',
  menuDescription: 'Elegí tu combinación perfecta. Nosotros nos encargamos del resto.',
  serviceEyebrow: '¿CÓMO FUNCIONA?',
  serviceTitle: 'Elegís. Pedís.',
  serviceEmphasis: 'Disfrutás.',
  footerText: 'Un buen momento empieza acá.',
  footerLegal: 'Menú ficticio de demostración · Diseño para Marketing by Oli'
};

const DEFAULT_THEME = {
  accent: '#d8a776',
  accentText: '#16211c',
  hero: '#112320',
  heroSoft: '#3b5b48',
  page: '#f8f7f3',
  surface: '#ffffff',
  text: '#1c2825',
  action: '#20362c',
  whatsapp: '#218453'
};

export const ORDER_MODES = {
  PICKUP: 'Retiro en el local',
  DELIVERY: 'Envío a domicilio'
};

export class ConfigError extends Error {
  constructor(issues) {
    super(`Configuración inválida: ${issues.join(' ')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

const isText = value => typeof value === 'string' && value.trim().length > 0;
const isMoney = value => Number.isFinite(value) && value >= 0;
const unique = values => new Set(values).size === values.length;

export function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function isValidPhone(value) {
  return /^\d{8,15}$/.test(normalizePhone(value));
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'menu';
}

export function isSafeImageSource(value) {
  if (!value) return true;
  return /^(https:\/\/|\.\.?\/|\/|assets\/)[^\s]+$/i.test(value);
}

export function normalizeConfig(raw) {
  const business = raw?.business ?? {};
  const products = Array.isArray(raw?.products) ? raw.products : [];
  return {
    schemaVersion: Number.isInteger(raw?.schemaVersion) ? raw.schemaVersion : 1,
    business: {
      name: String(business.name ?? '').trim(),
      shortName: String(business.shortName ?? business.name ?? '').trim(),
      type: String(business.type ?? '').trim(),
      slug: slugify(business.slug || business.name),
      tagline: String(business.tagline ?? '').trim(),
      whatsapp: String(business.whatsapp ?? '').trim(),
      currency: String(business.currency ?? '').trim().toUpperCase(),
      locale: String(business.locale ?? '').trim(),
      deliveryFee: Number(business.deliveryFee),
      minimumDelivery: Number(business.minimumDelivery),
      openingHours: String(business.openingHours ?? '').trim()
    },
    theme: { ...DEFAULT_THEME, ...(raw?.theme ?? {}), accent: raw?.theme?.accent ?? business.brandColor ?? DEFAULT_THEME.accent },
    content: { ...DEFAULT_CONTENT, ...(raw?.content ?? {}) },
    categories: Array.isArray(raw?.categories) ? raw.categories.map(value => String(value).trim()) : [],
    products: products.map(item => ({
      id: String(item?.id ?? '').trim(),
      name: String(item?.name ?? '').trim(),
      category: String(item?.category ?? '').trim(),
      description: String(item?.description ?? '').trim(),
      price: Number(item?.price),
      emoji: String(item?.emoji ?? '🍽️'),
      image: String(item?.image ?? '').trim(),
      imageAlt: String(item?.imageAlt ?? item?.name ?? '').trim(),
      popular: item?.popular === true,
      available: item?.available !== false
    })),
    suggestions: Array.isArray(raw?.suggestions)
      ? raw.suggestions.map(item => ({ trigger: String(item?.trigger ?? ''), recommend: String(item?.recommend ?? '') }))
      : []
  };
}

export function validateConfig(raw, { requireWhatsapp = false } = {}) {
  const config = normalizeConfig(raw);
  const issues = [];
  const { business, products, categories, suggestions, theme } = config;

  if (![1, 2].includes(config.schemaVersion)) issues.push('schemaVersion debe ser 1 o 2.');
  if (!isText(business.name)) issues.push('business.name es obligatorio.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(business.slug)) issues.push('business.slug no es válido.');
  if (!/^[A-Z]{3}$/.test(business.currency)) issues.push('business.currency debe ser un código ISO de tres letras.');
  try { new Intl.NumberFormat(business.locale, { style: 'currency', currency: business.currency }); }
  catch { issues.push('business.locale o business.currency no son compatibles.'); }
  if (typeof raw?.business?.deliveryFee !== 'number' || !isMoney(business.deliveryFee)) issues.push('business.deliveryFee debe ser un número no negativo.');
  if (typeof raw?.business?.minimumDelivery !== 'number' || !isMoney(business.minimumDelivery)) issues.push('business.minimumDelivery debe ser un número no negativo.');
  if (business.whatsapp && !isValidPhone(business.whatsapp)) issues.push('business.whatsapp debe tener entre 8 y 15 dígitos.');
  if (requireWhatsapp && !isValidPhone(business.whatsapp)) issues.push('Falta configurar un WhatsApp válido.');
  if (!categories.length || categories.some(value => !isText(value)) || !unique(categories)) issues.push('categories debe contener nombres únicos.');
  if (!products.length) issues.push('products debe contener al menos un producto.');
  if (!unique(products.map(item => item.id))) issues.push('Los IDs de productos deben ser únicos.');

  for (const [index, item] of products.entries()) {
    const source = raw.products[index];
    const label = item.id || '(sin id)';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(item.id) || !isText(item.name) || !isText(item.description)) issues.push(`Producto ${label}: id, name y description son obligatorios; el id solo admite letras, números y guiones.`);
    if (!categories.includes(item.category)) issues.push(`Producto ${label}: categoría inexistente.`);
    if (typeof source?.price !== 'number' || !isMoney(item.price)) issues.push(`Producto ${label}: precio inválido.`);
    if (source?.available !== undefined && typeof source.available !== 'boolean') issues.push(`Producto ${label}: available debe ser booleano.`);
    if (source?.popular !== undefined && typeof source.popular !== 'boolean') issues.push(`Producto ${label}: popular debe ser booleano.`);
    if (!isSafeImageSource(item.image)) issues.push(`Producto ${label}: origen de imagen no permitido.`);
  }

  const ids = new Set(products.map(item => item.id));
  for (const item of suggestions) {
    if (!ids.has(item.trigger) || !ids.has(item.recommend) || item.trigger === item.recommend) {
      issues.push(`Sugerencia ${item.trigger || '?'} → ${item.recommend || '?'} inválida.`);
    }
  }

  for (const [name, color] of Object.entries(theme)) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) issues.push(`theme.${name} debe ser un color hexadecimal de seis dígitos.`);
  }

  if (issues.length) throw new ConfigError(issues);
  return config;
}

export function sanitizeCart(value, products, maximum = 99) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowed = new Set(products.filter(item => item.available).map(item => item.id));
  return Object.fromEntries(Object.entries(value).filter(([id, quantity]) =>
    allowed.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= maximum
  ));
}

export function getCartItems(config, cart) {
  return config.products
    .filter(item => item.available && (cart[item.id] ?? 0) > 0)
    .map(item => ({ ...item, quantity: cart[item.id], lineTotal: item.price * cart[item.id] }));
}

export function calculateTotals(config, cart, mode = ORDER_MODES.PICKUP) {
  const subtotal = getCartItems(config, cart).reduce((sum, item) => sum + item.lineTotal, 0);
  const delivery = mode === ORDER_MODES.DELIVERY ? config.business.deliveryFee : 0;
  return { subtotal, delivery, total: subtotal + delivery };
}

export function formatMoney(config, value) {
  return new Intl.NumberFormat(config.business.locale, {
    style: 'currency',
    currency: config.business.currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function validateCheckout(config, cart, details) {
  const items = getCartItems(config, cart);
  const name = String(details?.name ?? '').trim();
  const address = String(details?.address ?? '').trim();
  const mode = details?.mode;
  if (!items.length) return { code: 'EMPTY_CART', message: 'Agregá al menos un producto para continuar.' };
  if (!name) return { code: 'NAME_REQUIRED', message: 'Completá tu nombre para continuar.', field: 'customerName' };
  if (![ORDER_MODES.PICKUP, ORDER_MODES.DELIVERY].includes(mode)) return { code: 'MODE_INVALID', message: 'Elegí una modalidad válida.' };
  if (mode === ORDER_MODES.DELIVERY && !address) return { code: 'ADDRESS_REQUIRED', message: 'Ingresá la dirección de entrega.', field: 'address' };
  const totals = calculateTotals(config, cart, mode);
  if (mode === ORDER_MODES.DELIVERY && totals.subtotal < config.business.minimumDelivery) {
    return { code: 'MINIMUM_DELIVERY', message: `El pedido mínimo para delivery es ${formatMoney(config, config.business.minimumDelivery)}.` };
  }
  if (!isValidPhone(config.business.whatsapp)) {
    return { code: 'WHATSAPP_MISSING', message: 'Este menú todavía no tiene un número de WhatsApp configurado.' };
  }
  return null;
}

export function buildOrderMessage(config, cart, details) {
  const items = getCartItems(config, cart);
  const totals = calculateTotals(config, cart, details.mode);
  const lines = [
    `¡Hola! Quisiera realizar un pedido en ${config.business.name}:`,
    '',
    ...items.map(item => `• ${item.quantity} x ${item.name} — ${formatMoney(config, item.lineTotal)}`),
    '',
    `Subtotal: ${formatMoney(config, totals.subtotal)}`
  ];
  if (details.mode === ORDER_MODES.DELIVERY) lines.push(`Envío estimado: ${formatMoney(config, totals.delivery)}`);
  lines.push(
    `TOTAL ESTIMADO: ${formatMoney(config, totals.total)}`,
    '',
    `Nombre: ${String(details.name).trim()}`,
    `Modalidad: ${details.mode}`
  );
  if (details.mode === ORDER_MODES.DELIVERY) lines.push(`Dirección: ${String(details.address).trim()}`);
  if (String(details.notes ?? '').trim()) lines.push(`Aclaraciones: ${String(details.notes).trim()}`);
  lines.push('', '¿Me confirman disponibilidad y total final?');
  return lines.join('\n');
}

export function buildWhatsappUrl(config, message) {
  const digits = normalizePhone(config.business.whatsapp);
  return isValidPhone(digits) ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
