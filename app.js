import {
  ORDER_MODES,
  buildOrderMessage,
  buildWhatsappUrl,
  calculateTotals,
  formatMoney,
  getCartItems,
  sanitizeCart,
  validateCheckout,
  validateConfig
} from './core.js';

'use strict';

const $ = id => document.getElementById(id);
const safe = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

let config;
let cart = {};
let category = 'Todos';
let query = '';
let lastFocus = null;
let cartKey = '';

const products = () => config.products;
const product = id => products().find(item => item.id === id);
const quantity = id => cart[id] ?? 0;
const count = () => Object.values(cart).reduce((sum, value) => sum + value, 0);
const mode = () => document.querySelector('input[name="mode"]:checked')?.value ?? ORDER_MODES.PICKUP;

function persist() {
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); }
  catch { showToast('No se pudo guardar el carrito en este dispositivo.'); }
}

function change(id, delta) {
  const item = product(id);
  if (!item?.available || !Number.isInteger(delta)) return;
  cart[id] = Math.max(0, Math.min(99, quantity(id) + delta));
  if (!cart[id]) delete cart[id];
  persist();
  render();
}

function productVisual(item) {
  const emoji = `<span class="food" aria-hidden="true">${safe(item.emoji)}</span>`;
  const image = item.image
    ? `<img class="product-image" data-product-image src="${safe(item.image)}" alt="${safe(item.imageAlt)}" loading="lazy" decoding="async"/>`
    : '';
  const label = !item.available
    ? '<span class="pill unavailable-pill">AGOTADO</span>'
    : item.popular ? '<span class="pill">MÁS PEDIDO</span>' : '';
  return `<div class="product-visual">${emoji}${image}${label}</div>`;
}

function productCard(item) {
  const current = quantity(item.id);
  let control;
  if (!item.available) {
    control = '<button class="add-button" type="button" disabled aria-label="Producto agotado">×</button>';
  } else if (current) {
    control = `<div class="qty-control"><button type="button" data-change="-1" data-id="${safe(item.id)}" aria-label="Quitar una unidad de ${safe(item.name)}">−</button><span>${current}</span><button type="button" data-change="1" data-id="${safe(item.id)}" aria-label="Agregar una unidad de ${safe(item.name)}">+</button></div>`;
  } else {
    control = `<button class="add-button" type="button" data-change="1" data-id="${safe(item.id)}" aria-label="Agregar ${safe(item.name)}">+</button>`;
  }
  return `<article class="product${item.available ? '' : ' unavailable'}">${productVisual(item)}<div class="product-body"><span class="product-cat">${safe(item.category)}</span><h3>${safe(item.name)}</h3><p>${safe(item.description)}</p><div class="product-bottom"><strong>${formatMoney(config, item.price)}</strong>${control}</div></div></article>`;
}

function bindImageFallbacks() {
  document.querySelectorAll('[data-product-image]').forEach(image => image.addEventListener('error', () => {
    image.hidden = true;
  }, { once: true }));
}

function renderProducts() {
  const matches = products().filter(item =>
    (category === 'Todos' || category === item.category) &&
    `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase(config.business.locale).includes(query)
  );
  $('productGrid').innerHTML = matches.map(productCard).join('');
  $('empty').hidden = matches.length > 0;
  $('resultsStatus').textContent = `${matches.length} producto${matches.length === 1 ? '' : 's'} encontrado${matches.length === 1 ? '' : 's'}.`;
  document.querySelectorAll('.category').forEach(element => {
    const active = element.dataset.category === category;
    element.classList.toggle('active', active);
    element.setAttribute('aria-pressed', String(active));
  });
  bindImageFallbacks();
}

function renderCart() {
  const items = getCartItems(config, cart);
  $('cartItems').innerHTML = items.length ? items.map(item => `
    <div class="cart-item">
      <span class="mini-emoji" aria-hidden="true">${safe(item.emoji)}</span>
      <div class="cart-item-main"><strong>${safe(item.name)}</strong><small>${formatMoney(config, item.lineTotal)}</small>
        <div class="qty-control"><button type="button" data-id="${safe(item.id)}" data-change="-1" aria-label="Quitar ${safe(item.name)}">−</button><span>${item.quantity}</span><button type="button" data-id="${safe(item.id)}" data-change="1" aria-label="Sumar ${safe(item.name)}">+</button></div>
      </div>
    </div>`).join('') : '<p class="empty">Tu carrito está vacío. ¡Agregá algo rico!</p>';

  const suggestion = config.suggestions.find(item => quantity(item.trigger) && !quantity(item.recommend));
  const recommended = suggestion && product(suggestion.recommend);
  $('upsell').hidden = !recommended?.available;
  if (recommended?.available) $('upsell').innerHTML = `<button type="button" data-id="${safe(recommended.id)}" data-change="1">+ Agregar</button><b>¿Algo más?</b><br/>${safe(recommended.name)} · ${formatMoney(config, recommended.price)}`;

  const delivery = mode() === ORDER_MODES.DELIVERY;
  const totals = calculateTotals(config, cart, mode());
  $('addressField').hidden = !delivery;
  $('address').required = delivery;
  $('deliveryRow').hidden = !delivery;
  $('deliveryPolicy').hidden = !delivery;
  $('deliveryPolicy').textContent = delivery
    ? `Pedido mínimo ${formatMoney(config, config.business.minimumDelivery)} · Envío estimado ${formatMoney(config, config.business.deliveryFee)}`
    : '';
  $('subtotal').textContent = formatMoney(config, totals.subtotal);
  $('delivery').textContent = formatMoney(config, totals.delivery);
  $('total').textContent = formatMoney(config, totals.total);
  $('checkoutButton').disabled = !items.length;
}

function render() {
  renderProducts();
  renderCart();
  $('navCount').textContent = count();
  $('floatingCount').textContent = count();
  $('floatingTotal').textContent = formatMoney(config, calculateTotals(config, cart).subtotal);
  $('floatingCart').hidden = !count();
}

function setPageInert(value) {
  for (const element of document.querySelectorAll('body > :not(#drawer):not(#overlay):not(#toast)')) element.inert = value;
}

function openCart() {
  lastFocus = document.activeElement;
  $('overlay').hidden = false;
  $('drawer').classList.add('open');
  $('drawer').setAttribute('aria-hidden', 'false');
  setPageInert(true);
  document.body.style.overflow = 'hidden';
  $('closeCart').focus();
}

function closeCart() {
  $('overlay').hidden = true;
  $('drawer').classList.remove('open');
  $('drawer').setAttribute('aria-hidden', 'true');
  setPageInert(false);
  document.body.style.overflow = '';
  lastFocus?.focus();
}

function trapFocus(event) {
  if (event.key !== 'Tab' || !$('drawer').classList.contains('open')) return;
  const focusable = [...$('drawer').querySelectorAll('button:not(:disabled), input:not([type="hidden"]), textarea, [href], [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.closest('[hidden]'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function showToast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  window.setTimeout(() => $('toast').classList.remove('show'), 2800);
}

function showCheckoutError(error) {
  const target = error?.field ? $(error.field) : null;
  $('checkoutError').textContent = error.message;
  $('checkoutError').hidden = false;
  target?.setAttribute('aria-invalid', 'true');
  target?.focus();
}

function clearCheckoutError() {
  $('checkoutError').hidden = true;
  for (const field of [$('customerName'), $('address')]) field.removeAttribute('aria-invalid');
}

function checkout() {
  clearCheckoutError();
  const details = {
    name: $('customerName').value,
    mode: mode(),
    address: $('address').value,
    notes: $('notes').value
  };
  const error = validateCheckout(config, cart, details);
  if (error) { showCheckoutError(error); return; }
  const message = buildOrderMessage(config, cart, details);
  const url = buildWhatsappUrl(config, message);
  if (!url) { showCheckoutError({ message: 'Este menú todavía no tiene un número de WhatsApp configurado.' }); return; }
  window.open(url, '_blank', 'noopener,noreferrer');
  showToast('WhatsApp se abrió con el mensaje. Revisalo y pulsá Enviar.');
}

function applyBranding() {
  const { business, content, theme } = config;
  const variables = {
    '--accent': theme.accent, '--accent-text': theme.accentText, '--hero': theme.hero,
    '--hero-soft': theme.heroSoft, '--page': theme.page, '--surface': theme.surface,
    '--text': theme.text, '--action': theme.action, '--whatsapp': theme.whatsapp
  };
  for (const [name, value] of Object.entries(variables)) document.documentElement.style.setProperty(name, value);
  $('themeColor').content = theme.hero;
  document.title = `${business.name} · Menú digital`;
  const values = {
    demoNotice: content.demoNotice, brandMark: business.shortName, businessType: business.type,
    heroEyebrow: content.heroEyebrow, heroTitle: content.heroTitle, heroEmphasis: content.heroEmphasis,
    heroDescription: content.heroDescription, hours: business.openingHours ? `◷  ${business.openingHours}` : '',
    menuEyebrow: content.menuEyebrow, menuTitleText: content.menuTitle, menuDescription: content.menuDescription,
    serviceEyebrow: content.serviceEyebrow, serviceTitle: content.serviceTitle,
    serviceEmphasis: content.serviceEmphasis, footerLogo: business.shortName,
    footerText: content.footerText || business.tagline, footerLegal: content.footerLegal
  };
  for (const [id, value] of Object.entries(values)) $(id).textContent = value;
  $('demoNotice').hidden = !content.demoNotice;
}

function bindEvents() {
  $('categories').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    renderProducts();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-change]');
    if (button) change(button.dataset.id, Number(button.dataset.change));
  });
  $('search').addEventListener('input', event => {
    query = event.target.value.trim().toLocaleLowerCase(config.business.locale);
    renderProducts();
  });
  for (const id of ['topCart', 'floatingCart']) $(id).addEventListener('click', openCart);
  $('closeCart').addEventListener('click', closeCart);
  $('overlay').addEventListener('click', closeCart);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('drawer').classList.contains('open')) closeCart();
    trapFocus(event);
  });
  document.querySelectorAll('input[name="mode"]').forEach(element => element.addEventListener('change', () => {
    clearCheckoutError();
    renderCart();
  }));
  for (const id of ['customerName', 'address']) $(id).addEventListener('input', clearCheckoutError);
  $('checkoutButton').addEventListener('click', checkout);
}

function renderFatalError(error) {
  const details = Array.isArray(error?.issues) ? `<ul>${error.issues.map(issue => `<li>${safe(issue)}</li>`).join('')}</ul>` : '';
  $('productGrid').innerHTML = `<section class="fatal-error" role="alert"><h2>No se pudo cargar el menú</h2><p>Revisá la configuración o abrí la demo mediante un servidor local.</p>${details}</section>`;
  console.error(error);
}

async function init() {
  try {
    const response = await fetch('config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`config.json no disponible (${response.status})`);
    config = validateConfig(await response.json());
    cartKey = `marketingbyoli_${config.business.slug}_cart_v${config.schemaVersion}`;
    try { cart = sanitizeCart(JSON.parse(localStorage.getItem(cartKey) || '{}'), config.products); }
    catch { cart = {}; }
    applyBranding();
    $('categories').innerHTML = ['Todos', ...config.categories].map(name => `<button type="button" class="category${name === 'Todos' ? ' active' : ''}" data-category="${safe(name)}" aria-pressed="${name === 'Todos'}">${safe(name)}</button>`).join('');
    bindEvents();
    render();
  } catch (error) {
    renderFatalError(error);
  }
}

init();
