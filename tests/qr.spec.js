// @ts-check
const { test, expect } = require('@playwright/test');
const { mockApi, seedSession, FIXTURES } = require('./helpers');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open qr.html pre-authenticated, loading MAQ-001 by default.
 *
 * The login overlay uses class .login-overlay (not .success-modal or .modal-overlay).
 * Session is seeded via localStorage using addInitScript so the overlay is
 * already hidden when the page loads.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} maquinaId
 */
async function openQr(page, maquinaId = 'MAQ-001') {
  await mockApi(page);
  await seedSession(page, 'dataEntry');
  await page.goto(`/qr.html?maquina=${maquinaId}`);
  // Wait for login overlay to be hidden
  await expect(page.locator('#login-overlay')).not.toHaveClass(/show/, { timeout: 5_000 });
  // Wait for machine card to render (replaced from loading placeholder)
  await expect(page.locator('#equipo-card h2')).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1. Login / session
// ---------------------------------------------------------------------------

test.describe('QR — Login', () => {
  test('shows login overlay on first visit', async ({ page }) => {
    await mockApi(page);
    await page.goto('/qr.html');
    await expect(page.locator('#login-overlay')).toHaveClass(/show/);
  });

  test('shows error when both fields are empty', async ({ page }) => {
    await mockApi(page);
    await page.goto('/qr.html');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-error')).toHaveText('Complete ambos campos');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('invalid credentials shows error message', async ({ page }) => {
    await mockApi(page);
    await page.goto('/qr.html');
    await page.fill('#login-id', 'maciel');
    await page.fill('#login-pin', '0000');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-error')).toHaveText('Credenciales invalidas');
  });

  test('successful login hides overlay and inits the form', async ({ page }) => {
    await mockApi(page);
    await page.goto('/qr.html?maquina=MAQ-001');
    await page.fill('#login-id', 'maciel');
    await page.fill('#login-pin', '1234');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#equipo-card h2')).toBeVisible();
  });

  test('Enter key in PIN field triggers login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/qr.html?maquina=MAQ-001');
    await page.fill('#login-id', 'maciel');
    await page.fill('#login-pin', '1234');
    await page.keyboard.press('Enter');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
  });
});

// ---------------------------------------------------------------------------
// 2. Equipo card rendering
// ---------------------------------------------------------------------------

test.describe('Equipo card', () => {
  test('shows machine name', async ({ page }) => {
    await openQr(page, 'MAQ-001');
    await expect(page.locator('#equipo-card h2')).toHaveText(FIXTURES.maquinas[0].nombre);
  });

  test('shows machine ID', async ({ page }) => {
    await openQr(page, 'MAQ-001');
    await expect(page.locator('#equipo-card')).toContainText(FIXTURES.maquinas[0].id);
  });

  test('shows ubicacion', async ({ page }) => {
    await openQr(page, 'MAQ-001');
    await expect(page.locator('#equipo-card')).toContainText(FIXTURES.maquinas[0].ubicacion);
  });

  test('operativo machine shows operativo status badge', async ({ page }) => {
    await openQr(page, 'MAQ-001');
    const status = page.locator('#equipo-card .status');
    await expect(status).toHaveClass(/operativo/);
    await expect(status).toHaveText('Operativo');
  });

  test('Mant. vencido machine shows vencido status badge', async ({ page }) => {
    await openQr(page, 'MAQ-002');
    const status = page.locator('#equipo-card .status');
    // renderEquipoCard: 'Mant. vencido' → 'vencido' class
    await expect(status).toHaveClass(/vencido/);
  });

  test('shows all component chips for the machine', async ({ page }) => {
    await openQr(page, 'MAQ-001');
    const chips = page.locator('#equipo-card .comp-chip');
    await expect(chips).toHaveCount(FIXTURES.maquinas[0].componentes.length);
  });

  test('shows ultimo and proximo mantenimiento dates', async ({ page }) => {
    await openQr(page, 'MAQ-001');
    const card = page.locator('#equipo-card');
    // Dates formatted as DD/MM/YYYY
    await expect(card).toContainText('15/01/2026'); // ultimo
    await expect(card).toContainText('15/04/2026'); // proximo
  });

  test('user badge shows role and name from session', async ({ page }) => {
    await openQr(page);
    const badge = page.locator('#user-badge');
    await expect(badge).toContainText(FIXTURES.users.dataEntry.rol);
    await expect(badge).toContainText(FIXTURES.users.dataEntry.nombre);
  });

  test('scan-info shows scan timestamp', async ({ page }) => {
    await openQr(page);
    await expect(page.locator('#scan-info')).not.toHaveText('Cargando...');
    await expect(page.locator('#scan-info')).toContainText('Escaneado:');
  });
});

// ---------------------------------------------------------------------------
// 3. Tab switching — switchTab()
// ---------------------------------------------------------------------------

test.describe('Tab switching', () => {
  test('Nuevo Registro tab is active by default', async ({ page }) => {
    await openQr(page);
    await expect(page.locator('#tab-registro')).toHaveClass(/active/);
    await expect(page.locator('.tab').first()).toHaveClass(/active/);
  });

  test('Historial tab content is hidden by default', async ({ page }) => {
    await openQr(page);
    await expect(page.locator('#tab-historial')).not.toHaveClass(/active/);
  });

  test('clicking Historial tab makes it active', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    await expect(page.locator('#tab-historial')).toHaveClass(/active/);
    await expect(page.locator('#tab-registro')).not.toHaveClass(/active/);
  });

  test('clicking Historial tab makes Historial button active', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    await expect(page.locator('.tab').nth(1)).toHaveClass(/active/);
    await expect(page.locator('.tab').first()).not.toHaveClass(/active/);
  });

  test('clicking back to Nuevo Registro restores registro tab', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    await page.click('button:has-text("Nuevo Registro")');
    await expect(page.locator('#tab-registro')).toHaveClass(/active/);
    await expect(page.locator('#tab-historial')).not.toHaveClass(/active/);
  });

  test('only one tab-content is visible at a time', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    const activeContents = await page.locator('.tab-content.active').count();
    expect(activeContents).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Historial rendering
// ---------------------------------------------------------------------------

test.describe('Historial', () => {
  test('historial loads and shows registros', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    await expect(page.locator('#historial-container .historial-entry')).toHaveCount(
      FIXTURES.registros.length
    );
  });

  test('historial entry shows formatted date', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    const entry = page.locator('#historial-container .historial-entry').first();
    await expect(entry.locator('.hist-date')).toContainText('20/04/2026');
  });

  test('historial entry shows tipo badge with correct class', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    const entry = page.locator('#historial-container .historial-entry').first();
    await expect(entry.locator('.hist-tipo')).toHaveClass(/preventivo/);
    await expect(entry.locator('.hist-tipo')).toHaveText('Preventivo');
  });

  test('historial entry shows tecnico in meta line', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    const meta = page.locator('#historial-container .hist-meta').first();
    await expect(meta).toContainText('Carlos Gomez');
    await expect(meta).toContainText('Maciel Entry');
  });

  test('historial shows component detail blocks', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    await expect(page.locator('.hist-comp')).toHaveCount(1);
    await expect(page.locator('.hist-comp-name')).toHaveText('Turbina');
  });

  test('historial shows repuesto used with quantity', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("Historial")');
    const repText = page.locator('.hist-comp-repuestos span').first();
    await expect(repText).toContainText('Rodamiento 6205-2RS SKF');
    await expect(repText).toContainText('x2');
  });
});

// ---------------------------------------------------------------------------
// 5. Nuevo Registro form — general data section
// ---------------------------------------------------------------------------

test.describe('Nuevo Registro — form general', () => {
  test('fecha field is pre-filled with today', async ({ page }) => {
    await openQr(page);
    const today = new Date().toISOString().slice(0, 10);
    await expect(page.locator('#reg-fecha')).toHaveValue(today);
  });

  test('hora field is pre-filled with HH:MM pattern', async ({ page }) => {
    await openQr(page);
    const val = await page.locator('#reg-hora').inputValue();
    expect(val).toMatch(/^\d{2}:\d{2}$/);
  });

  test('tipo dropdown shows all maintenance types', async ({ page }) => {
    await openQr(page);
    const options = page.locator('#reg-tipo option');
    await expect(options).toHaveCount(4);
    const texts = await options.allInnerTexts();
    expect(texts).toEqual(['Correctivo', 'Preventivo', 'Predictivo', 'Emergencia']);
  });

  test('tecnico select is populated from API', async ({ page }) => {
    await openQr(page);
    const options = page.locator('#reg-tecnico option');
    const tecnicosCount = Object.values(FIXTURES.users).filter((u) => u.rol === 'Tecnico').length;
    await expect(options).toHaveCount(tecnicosCount);
  });

  test('registrado-por field is readonly', async ({ page }) => {
    await openQr(page);
    await expect(page.locator('#reg-registrado-por')).toHaveAttribute('readonly');
  });

  test('registrado-por field shows current user name', async ({ page }) => {
    await openQr(page);
    // init() sets this field after the API returns; wait for it to be populated
    await expect(page.locator('#reg-registrado-por')).not.toHaveValue('-', { timeout: 5_000 });
    const val = await page.locator('#reg-registrado-por').inputValue();
    expect(val).toContain(FIXTURES.users.dataEntry.nombre);
  });
});

// ---------------------------------------------------------------------------
// 6. Dynamic components — addComponente() / addRepuesto()
// ---------------------------------------------------------------------------

test.describe('Dynamic components — addComponente()', () => {
  test('one componente block is added by init()', async ({ page }) => {
    await openQr(page);
    await expect(page.locator('#componentes-list .componente-block')).toHaveCount(1);
  });

  test('clicking + Agregar componente adds a second block', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("+ Agregar componente")');
    await expect(page.locator('#componentes-list .componente-block')).toHaveCount(2);
  });

  test('clicking + Agregar componente multiple times adds multiple blocks', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("+ Agregar componente")');
    await page.click('button:has-text("+ Agregar componente")');
    await expect(page.locator('#componentes-list .componente-block')).toHaveCount(3);
  });

  test('each componente block contains a component select, textarea, and add-repuesto button', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await expect(block.locator('.comp-header select')).toBeVisible();
    await expect(block.locator('.comp-trabajo textarea')).toBeVisible();
    await expect(block.locator('.btn-add')).toBeVisible();
  });

  test('component select is populated with machine components plus placeholder', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    const options = block.locator('.comp-header select option');
    // MAQ-001 has 4 components + 1 placeholder
    await expect(options).toHaveCount(FIXTURES.maquinas[0].componentes.length + 1);
  });

  test('first option in component select is the placeholder', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await expect(block.locator('.comp-header select option').first()).toHaveText(
      '-- Seleccionar componente --'
    );
  });

  test('clicking X on a componente block removes it', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("+ Agregar componente")');
    await expect(page.locator('#componentes-list .componente-block')).toHaveCount(2);
    await page.locator('#componentes-list .componente-block').first().locator('.btn-remove').click();
    await expect(page.locator('#componentes-list .componente-block')).toHaveCount(1);
  });

  test('each block shows a sequential block number', async ({ page }) => {
    await openQr(page);
    await page.click('button:has-text("+ Agregar componente")');
    const numbers = page.locator('#componentes-list .comp-number');
    await expect(numbers).toHaveCount(2);
    await expect(numbers.first()).toHaveText('1');
    await expect(numbers.nth(1)).toHaveText('2');
  });
});

test.describe('Dynamic repuestos — addRepuesto()', () => {
  test('no repuesto rows exist initially', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await expect(block.locator('.repuesto-row')).toHaveCount(0);
  });

  test('clicking + Agregar repuesto adds a repuesto row', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    await expect(block.locator('.repuesto-row')).toHaveCount(1);
  });

  test('adding two repuestos creates two rows', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    await block.locator('.btn-add').click();
    await expect(block.locator('.repuesto-row')).toHaveCount(2);
  });

  test('repuesto row contains a select, cantidad input, and remove button', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    const row = block.locator('.repuesto-row').first();
    await expect(row.locator('select')).toBeVisible();
    await expect(row.locator('input.cant')).toBeVisible();
    await expect(row.locator('.btn-remove')).toBeVisible();
  });

  test('repuesto select includes a placeholder as first option', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    const repSelect = block.locator('.repuesto-row select').first();
    await expect(repSelect.locator('option').first()).toHaveText('-- Seleccionar repuesto --');
  });

  test('repuesto rows are grouped by categoria as optgroups', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    const repSelect = block.locator('.repuesto-row select').first();
    const groups = repSelect.locator('optgroup');
    const uniqueCats = [...new Set(FIXTURES.repuestos.map((r) => r.categoria))];
    await expect(groups).toHaveCount(uniqueCats.length);
  });

  test('cantidad input defaults to 1', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    await expect(block.locator('input.cant').first()).toHaveValue('1');
  });

  test('clicking X on repuesto row removes that row only', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.btn-add').click();
    await block.locator('.btn-add').click();
    await expect(block.locator('.repuesto-row')).toHaveCount(2);
    await block.locator('.repuesto-row .btn-remove').first().click();
    await expect(block.locator('.repuesto-row')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Form submission — guardar()
// ---------------------------------------------------------------------------

test.describe('Guardar registro', () => {
  test('shows alert when no componentes are present', async ({ page }) => {
    await openQr(page);
    // Remove the default componente block
    await page.locator('#componentes-list .componente-block .btn-remove').click();
    await expect(page.locator('#componentes-list .componente-block')).toHaveCount(0);

    let alertText = '';
    page.once('dialog', async (dialog) => { alertText = dialog.message(); await dialog.accept(); });
    await page.click('.btn-submit');
    expect(alertText).toBe('Agregue al menos un componente');
  });

  test('shows alert when a componente block has no component selected', async ({ page }) => {
    await openQr(page);
    // Block exists but placeholder (value="") is still selected

    let alertText = '';
    page.once('dialog', async (dialog) => { alertText = dialog.message(); await dialog.accept(); });
    await page.click('.btn-submit');
    expect(alertText).toBe('Seleccione un componente en cada bloque');
  });

  test('successful submit shows success modal', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });
    await page.click('.btn-submit');
    await expect(page.locator('#success-modal')).toHaveClass(/show/);
  });

  test('success modal summary message includes component count', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });
    await page.click('.btn-submit');
    // Wait for modal to be visible and the dynamic text to be set by guardar()
    await expect(page.locator('#success-modal')).toHaveClass(/show/);
    // guardar() sets: `Se registraron ${n} componente(s) con ${r} repuesto(s).`
    await expect(page.locator('#success-msg')).toContainText('1 componente');
  });

  test('success modal summary reflects zero spare parts when none added', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });
    await page.click('.btn-submit');
    await expect(page.locator('#success-modal')).toHaveClass(/show/);
    await expect(page.locator('#success-msg')).toContainText('0 repuesto');
  });

  test('success modal summary reflects repuesto quantity when added', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });
    await block.locator('.btn-add').click();
    // Select the first real repuesto (index 1 skips the placeholder)
    await block.locator('.repuesto-row select').selectOption({ index: 1 });
    await block.locator('input.cant').fill('3');
    await page.click('.btn-submit');
    await expect(page.locator('#success-modal')).toHaveClass(/show/);
    await expect(page.locator('#success-msg')).toContainText('3 repuesto');
  });

  test('closing success modal hides it', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });
    await page.click('.btn-submit');
    await expect(page.locator('#success-modal')).toHaveClass(/show/);
    await page.locator('#success-modal button').click();
    await expect(page.locator('#success-modal')).not.toHaveClass(/show/);
  });

  test('submit sends correct payload structure to API', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });
    await block.locator('.comp-trabajo textarea').fill('Revision de rodamientos');
    await block.locator('.btn-add').click();
    // Select first real repuesto so it is included in payload (placeholder "" is filtered out)
    await block.locator('.repuesto-row select').selectOption({ index: 1 });
    await block.locator('input.cant').fill('2');

    // Register listener BEFORE clicking submit so we don't miss the request
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/registros') && req.method() === 'POST'
    );

    await page.click('.btn-submit');

    const req = await requestPromise;
    const capturedPayload = JSON.parse(req.postData() || '{}');

    expect(capturedPayload).toHaveProperty('maquina_id', FIXTURES.maquinas[0].id);
    expect(capturedPayload).toHaveProperty('tipo');
    expect(capturedPayload).toHaveProperty('tecnico_id');
    expect(capturedPayload.componentes).toHaveLength(1);
    expect(capturedPayload.componentes[0]).toHaveProperty('trabajo_realizado', 'Revision de rodamientos');
    expect(capturedPayload.componentes[0].repuestos[0]).toHaveProperty('cantidad', 2);
  });

  test('submit payload includes fecha as YYYY-MM-DD HH:MM format', async ({ page }) => {
    await openQr(page);
    const block = page.locator('#componentes-list .componente-block').first();
    await block.locator('.comp-header select').selectOption({ index: 1 });

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/registros') && req.method() === 'POST'
    );
    await page.click('.btn-submit');

    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload.fecha).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
