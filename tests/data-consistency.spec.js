/**
 * Data consistency tests — static analysis of both HTML files.
 *
 * These tests parse the raw HTML source to verify that hardcoded data
 * (machine types, maintenance type options, spare-part categories) stays
 * in sync between backoffice.html and qr.html.
 *
 * These tests run in Node via Playwright's test runner but do NOT open a
 * browser — they use Node's built-in `fs` module to read the source files.
 *
 * Why: the two files have inline JS with duplicated data. If one is updated
 * and the other is not, these tests will catch the drift without needing a
 * running server.
 */

// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKOFFICE_SRC = fs.readFileSync(path.join(ROOT, 'backoffice.html'), 'utf8');
const QR_SRC = fs.readFileSync(path.join(ROOT, 'qr.html'), 'utf8');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all <option> text values from a named <select> block.
 * Works on the raw HTML string.
 *
 * @param {string} html
 * @param {string} selectId  id attribute of the select element
 * @returns {string[]}
 */
function extractSelectOptions(html, selectId) {
  // Match the <select id="..."> ... </select> block
  const re = new RegExp(`<select[^>]+id="${selectId}"[^>]*>([\\s\\S]*?)</select>`, 'i');
  const match = html.match(re);
  if (!match) return [];
  const inner = match[1];
  const optionRe = /<option[^>]*>(.*?)<\/option>/gi;
  const results = [];
  let m;
  while ((m = optionRe.exec(inner)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/**
 * Extract all <option> text values from a named <optgroup> or any <option>
 * elements whose parent select has the given id.
 */
function extractCategoryOptions(html, selectId) {
  return extractSelectOptions(html, selectId);
}

/**
 * Extract all quoted string values from a JS object literal in the source.
 * Used to pull cat names out of catColors in backoffice.html.
 *
 * @param {string} src
 * @param {string} varName  Variable name assigned the object literal
 * @returns {string[]}
 */
function extractObjectKeys(src, varName) {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\{([^}]+)\\}`, 's');
  const match = src.match(re);
  if (!match) return [];
  const inner = match[1];
  // Match 'key' or "key" from 'key': ... or "key": ...
  const keyRe = /['"]([^'"]+)['"]\s*:/g;
  const keys = [];
  let m;
  while ((m = keyRe.exec(inner)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// 1. Maintenance type options
// ---------------------------------------------------------------------------

test.describe('Maintenance type options consistency', () => {
  test('backoffice filter select contains the same types as qr reg-tipo select', async () => {
    // In backoffice.html, the filter select for ordenes page does NOT have an id.
    // The reg-tipo select is only in qr.html; what we compare is the set of
    // maintenance types to ensure both files know about the same types.
    const qrTypes = extractSelectOptions(QR_SRC, 'reg-tipo');
    expect(qrTypes).toHaveLength(4);
    expect(qrTypes).toEqual(
      expect.arrayContaining(['Correctivo', 'Preventivo', 'Predictivo', 'Emergencia'])
    );

    // backoffice has a type filter (inline, no id) — check via substring search
    ['Preventivo', 'Correctivo', 'Predictivo', 'Emergencia'].forEach((tipo) => {
      expect(BACKOFFICE_SRC).toContain(`<option>${tipo}</option>`);
      expect(QR_SRC).toContain(tipo);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Spare-part categories
// ---------------------------------------------------------------------------

test.describe('Spare-part category consistency', () => {
  /**
   * The canonical list of categories is the key set of catColors in
   * backoffice.html. The rep-categoria select in backoffice.html must have
   * the same set. qr.html does not hard-code categories (it receives them
   * from the API), so only the backoffice-internal consistency is checked here.
   */

  const canonicalCategories = [
    'Rodamientos',
    'Correas y Transmision',
    'Ventilacion',
    'Lubricantes',
    'Turbina',
    'Electricidad',
    'Filtros',
  ];

  test('catColors in backoffice.html has all canonical categories', () => {
    const keys = extractObjectKeys(BACKOFFICE_SRC, 'catColors');
    expect(keys.sort()).toEqual(canonicalCategories.sort());
  });

  test('rep-categoria select in backoffice.html has all canonical categories', () => {
    const options = extractSelectOptions(BACKOFFICE_SRC, 'rep-categoria');
    expect(options.sort()).toEqual(canonicalCategories.sort());
  });

  test('catColors keys match rep-categoria select options exactly', () => {
    const colorKeys = extractObjectKeys(BACKOFFICE_SRC, 'catColors').sort();
    const selectOpts = extractSelectOptions(BACKOFFICE_SRC, 'rep-categoria').sort();
    expect(colorKeys).toEqual(selectOpts);
  });
});

// ---------------------------------------------------------------------------
// 3. Shared API base URL
// ---------------------------------------------------------------------------

test.describe('API_BASE consistency', () => {
  test('both files use the same API_BASE value', () => {
    const extractApiBase = (src) => {
      const m = src.match(/const API_BASE\s*=\s*['"]([^'"]+)['"]/);
      return m ? m[1] : null;
    };
    const backBase = extractApiBase(BACKOFFICE_SRC);
    const qrBase = extractApiBase(QR_SRC);
    expect(backBase).not.toBeNull();
    expect(qrBase).not.toBeNull();
    expect(backBase).toEqual(qrBase);
  });
});

// ---------------------------------------------------------------------------
// 4. Auth field IDs (login forms in both files must have compatible field IDs)
// ---------------------------------------------------------------------------

test.describe('Login form field ID consistency', () => {
  test('backoffice.html has login-id field', () => {
    expect(BACKOFFICE_SRC).toContain('id="login-id"');
  });
  test('backoffice.html has login-pin field', () => {
    expect(BACKOFFICE_SRC).toContain('id="login-pin"');
  });
  test('backoffice.html has login-error element', () => {
    expect(BACKOFFICE_SRC).toContain('id="login-error"');
  });
  test('qr.html has login-id field', () => {
    expect(QR_SRC).toContain('id="login-id"');
  });
  test('qr.html has login-pin field', () => {
    expect(QR_SRC).toContain('id="login-pin"');
  });
  test('qr.html has login-error element', () => {
    expect(QR_SRC).toContain('id="login-error"');
  });
});

// ---------------------------------------------------------------------------
// 5. localStorage key consistency
// ---------------------------------------------------------------------------

test.describe('localStorage key consistency', () => {
  test('backoffice.html uses localStorage key cmms_user', () => {
    expect(BACKOFFICE_SRC).toContain("'cmms_user'");
  });
  test('backoffice.html uses localStorage key cmms_pin', () => {
    expect(BACKOFFICE_SRC).toContain("'cmms_pin'");
  });
  test('qr.html uses localStorage key cmms_user', () => {
    expect(QR_SRC).toContain("'cmms_user'");
  });
  test('qr.html uses localStorage key cmms_pin', () => {
    expect(QR_SRC).toContain("'cmms_pin'");
  });

  test('both files use the same cmms_user key spelling', () => {
    const backCount = (BACKOFFICE_SRC.match(/'cmms_user'/g) || []).length;
    const qrCount = (QR_SRC.match(/'cmms_user'/g) || []).length;
    // Both must reference it (at least setItem + getItem)
    expect(backCount).toBeGreaterThanOrEqual(2);
    expect(qrCount).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 6. Auth header field names
// ---------------------------------------------------------------------------

test.describe('Auth header names consistency', () => {
  test('backoffice.html sends X-User-ID auth header', () => {
    expect(BACKOFFICE_SRC).toContain("'X-User-ID'");
  });
  test('backoffice.html sends X-Pin auth header', () => {
    expect(BACKOFFICE_SRC).toContain("'X-Pin'");
  });
  test('qr.html sends X-User-ID auth header', () => {
    expect(QR_SRC).toContain("'X-User-ID'");
  });
  test('qr.html sends X-Pin auth header', () => {
    expect(QR_SRC).toContain("'X-Pin'");
  });
});

// ---------------------------------------------------------------------------
// 7. QR link format from backoffice to qr.html
// ---------------------------------------------------------------------------

test.describe('QR link format', () => {
  test('backoffice generates qr.html?maquina= links', () => {
    expect(BACKOFFICE_SRC).toContain('qr.html?maquina=');
  });

  test('qr.html reads the "maquina" URL parameter', () => {
    expect(QR_SRC).toContain("get('maquina')");
  });
});

// ---------------------------------------------------------------------------
// 8. Frecuencia de mantenimiento options
// ---------------------------------------------------------------------------

test.describe('Frecuencia de mantenimiento options', () => {
  const expectedFrecuencias = ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];

  test('eq-frecuencia select in backoffice.html has all frequency options', () => {
    const options = extractSelectOptions(BACKOFFICE_SRC, 'eq-frecuencia');
    expect(options.sort()).toEqual(expectedFrecuencias.sort());
  });

  test('Trimestral is marked as selected by default in backoffice', () => {
    const re = /id="eq-frecuencia"[\s\S]*?<option selected>Trimestral<\/option>/;
    // Alternate: option Trimestral with selected attribute
    const hasSelected =
      re.test(BACKOFFICE_SRC) ||
      BACKOFFICE_SRC.includes('<option selected>Trimestral</option>');
    expect(hasSelected).toBe(true);
  });
});
