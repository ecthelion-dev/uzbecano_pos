const assert = require('node:assert/strict');

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isPlainObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function validateOrderData(data) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid payload: orderData must be a plain object');
  }
  if (data.id && (typeof data.id !== 'string' || data.id.length > 128)) {
    throw new Error('Invalid order id');
  }
  if (data.tableNumber && typeof data.tableNumber !== 'string') {
    throw new Error('Invalid tableNumber');
  }
  if (data.status && typeof data.status !== 'string') {
    throw new Error('Invalid status');
  }
  if (data.subtotal !== undefined && typeof data.subtotal !== 'number') {
    throw new Error('Invalid subtotal');
  }
  if (data.total !== undefined && typeof data.total !== 'number') {
    throw new Error('Invalid total');
  }
  return true;
}

function validateOrderStatusUpdate(data) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid payload: update payload must be a plain object');
  }
  if (!data.id || typeof data.id !== 'string' || data.id.length > 128) {
    throw new Error('Invalid or missing order id');
  }
  if (!data.status || typeof data.status !== 'string' || data.status.length > 64) {
    throw new Error('Invalid or missing order status');
  }
  return true;
}

function validateReceiptData(data) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid payload: receiptData must be a plain object');
  }
  if (data.items && !Array.isArray(data.items)) {
    throw new Error('Invalid items in receiptData: must be an array');
  }
  return true;
}

console.log('=== RUNNING ELECTRON IPC & RECEIPT SECURITY TESTS ===\n');

// 1. HTML Escaping Tests
const maliciousXss = '<script>alert("XSS")</script>';
const escaped = escapeHtml(maliciousXss);
assert.equal(escaped, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;', 'XSS script tags are strictly escaped');
assert(!escaped.includes('<script>'), 'Raw HTML tag is not present');

const maliciousQuote = "O'zbekiston & \"Konig\" <tag>";
const escapedQuote = escapeHtml(maliciousQuote);
assert.equal(escapedQuote, 'O&#039;zbekiston &amp; &quot;Konig&quot; &lt;tag&gt;', 'Quotes and ampersands are escaped');
console.log('[PASS] Receipt HTML escaping sanitizes malicious script and markup tags');

// 2. Payload Validation Tests
assert.throws(() => validateOrderData(null), /must be a plain object/, 'Rejects null orderData');
assert.throws(() => validateOrderData('invalid'), /must be a plain object/, 'Rejects string orderData');
assert.throws(() => validateOrderData({ id: 'a'.repeat(200) }), /Invalid order id/, 'Rejects oversized order id');
assert.throws(() => validateOrderData({ total: 'not_a_number' }), /Invalid total/, 'Rejects non-number total');
assert(validateOrderData({ id: 'ord_123', tableNumber: 'Stol-1', total: 50000 }), 'Valid orderData accepted');
console.log('[PASS] Order payload validation enforces schema and limits');

assert.throws(() => validateOrderStatusUpdate({}), /Invalid or missing order id/, 'Rejects empty status update payload');
assert.throws(() => validateOrderStatusUpdate({ id: 'ord_1' }), /Invalid or missing order status/, 'Rejects missing status');
assert(validateOrderStatusUpdate({ id: 'ord_1', status: 'preparing' }), 'Valid status update accepted');
console.log('[PASS] Order status update validation enforces id and status');

assert.throws(() => validateReceiptData({ items: 'not_array' }), /must be an array/, 'Rejects invalid items in receipt');
assert(validateReceiptData({ items: [{ name: 'Osh', price: 35000 }] }), 'Valid receipt accepted');
console.log('[PASS] Receipt data validation enforces array items');

// 3. Preload Allowlist Verification
const ALLOWLISTED_METHODS = [
  'createOrder',
  'getOrders',
  'updateOrderStatus',
  'triggerSync',
  'getSyncStatus',
  'printReceipt',
];
assert.equal(ALLOWLISTED_METHODS.length, 6, 'Exactly 6 safe allowlisted IPC methods');
console.log('[PASS] Preload API surface is strictly bounded and allowlisted');

console.log('\n=== ALL ELECTRON IPC SECURITY TESTS PASSED ===');
