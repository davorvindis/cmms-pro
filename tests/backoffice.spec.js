// @ts-check
const { test, expect } = require('@playwright/test');
const { mockApi, seedSession, FIXTURES } = require('./helpers');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open backoffice.html in a pre-authenticated state with all API routes mocked.
 */
async function openBackoffice(page) {
  await mockApi(page);
  await seedSession(page, 'admin');
  await page.goto('/backoffice.html');
  // Wait for the login overlay to be hidden (session restored from localStorage)
  await expect(page.locator('#login-overlay')).not.toHaveClass(/show/, { timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// 1. Login / session
// ---------------------------------------------------------------------------

test.describe('Login', () => {
  test('shows login overlay on first visit (no session)', async ({ page }) => {
    await mockApi(page);
    await page.goto('/backoffice.html');
    await expect(page.locator('#login-overlay')).toHaveClass(/show/);
  });

  test('shows error when both fields are empty', async ({ page }) => {
    await mockApi(page);
    await page.goto('/backoffice.html');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-error')).toHaveText('Complete ambos campos');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('shows error when only user is filled', async ({ page }) => {
    await mockApi(page);
    await page.goto('/backoffice.html');
    await page.fill('#login-id', 'admin');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await mockApi(page);
    await page.goto('/backoffice.html');
    await page.fill('#login-id', 'admin');
    await page.fill('#login-pin', '9999');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-error')).toHaveText('Credenciales invalidas');
  });

  test('successful login hides overlay and shows username', async ({ page }) => {
    await mockApi(page);
    await page.goto('/backoffice.html');
    await page.fill('#login-id', 'admin');
    await page.fill('#login-pin', '1234');
    await page.click('button:has-text("Entrar")');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#topbar-user')).toHaveText(FIXTURES.users.admin.nombre);
    await expect(page.locator('#topbar-avatar')).toHaveText('AD');
  });

  test('Enter key in PIN field triggers login', async ({ page }) => {
    await mockApi(page);
    await page.goto('/backoffice.html');
    await page.fill('#login-id', 'admin');
    await page.fill('#login-pin', '1234');
    await page.keyboard.press('Enter');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
  });

  test('logout restores login overlay and clears session', async ({ page }) => {
    await openBackoffice(page);
    await page.click('button:has-text("Salir")');
    await expect(page.locator('#login-overlay')).toHaveClass(/show/);
  });

  test('existing session skips login overlay on page load', async ({ page }) => {
    await openBackoffice(page);
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#topbar-user')).toHaveText(FIXTURES.users.admin.nombre);
  });
});

// ---------------------------------------------------------------------------
// 2. Navigation — showPage()
// ---------------------------------------------------------------------------

test.describe('Navigation (showPage)', () => {
  test('dashboard page is active by default', async ({ page }) => {
    await openBackoffice(page);
    await expect(page.locator('#page-dashboard')).toHaveClass(/active/);
    await expect(page.locator('#page-title')).toHaveText('Dashboard');
  });

  test('clicking Maquinas nav item activates equipos page', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await expect(page.locator('#page-equipos')).toHaveClass(/active/);
    await expect(page.locator('#page-dashboard')).not.toHaveClass(/active/);
    await expect(page.locator('#page-title')).toHaveText('Maquinas / Activos');
  });

  test('clicking Registros de Mant. activates ordenes page', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    await expect(page.locator('#page-ordenes')).toHaveClass(/active/);
    await expect(page.locator('#page-title')).toHaveText('Registros de Mantenimiento');
  });

  test('clicking Repuestos activates repuestos page', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await expect(page.locator('#page-repuestos')).toHaveClass(/active/);
    await expect(page.locator('#page-title')).toHaveText('Inventario de Repuestos');
  });

  test('clicking Usuarios activates usuarios page', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Tecnicos & Usuarios');
    await expect(page.locator('#page-usuarios')).toHaveClass(/active/);
    await expect(page.locator('#page-title')).toHaveText('Tecnicos & Usuarios');
  });

  test('active nav link gets .active class and removes it from others', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    const activeLinks = await page.locator('.sidebar a.active').count();
    expect(activeLinks).toBe(1);
  });

  test('only one page is visible at a time', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    const visiblePages = await page.locator('.page.active').count();
    expect(visiblePages).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Dashboard rendering
// ---------------------------------------------------------------------------

test.describe('Dashboard', () => {
  test('renders all four stat cards with API data', async ({ page }) => {
    await openBackoffice(page);
    const stats = FIXTURES.dashboardStats;
    await expect(page.locator('#stat-maquinas')).toHaveText(String(stats.maquinas_activas));
    await expect(page.locator('#stat-pendientes')).toHaveText(String(stats.mantenimientos_pendientes));
    await expect(page.locator('#stat-registros')).toHaveText(String(stats.registros_este_mes));
    await expect(page.locator('#stat-stockbajo')).toHaveText(String(stats.repuestos_stock_bajo));
  });

  test('renders vencidos count in change element', async ({ page }) => {
    await openBackoffice(page);
    await expect(page.locator('#stat-vencidos')).toHaveText(
      `${FIXTURES.dashboardStats.maquinas_vencidas} vencidos`
    );
  });

  test('renders actividad reciente from API', async ({ page }) => {
    await openBackoffice(page);
    await expect(page.locator('#dashboard-actividad .activity-item')).toHaveCount(1);
    await expect(page.locator('#dashboard-actividad')).toContainText('Carlos Gomez');
    await expect(page.locator('#dashboard-actividad')).toContainText('Turbina Principal');
  });

  test('renders alerts from API', async ({ page }) => {
    await openBackoffice(page);
    await expect(page.locator('#dashboard-alertas .alert-item')).toHaveCount(2);
    await expect(page.locator('#dashboard-alertas')).toContainText('Compresor Norte');
  });

  test('danger alert icon has .danger class for vencido tipo', async ({ page }) => {
    await openBackoffice(page);
    const firstAlert = page.locator('#dashboard-alertas .alert-item').first();
    await expect(firstAlert.locator('.alert-icon')).toHaveClass(/danger/);
  });

  test('monthly bar chart has 12 bar groups', async ({ page }) => {
    await openBackoffice(page);
    await expect(page.locator('.bar-group')).toHaveCount(12);
  });
});

// ---------------------------------------------------------------------------
// 4. Maquinas / Equipos table
// ---------------------------------------------------------------------------

test.describe('Maquinas page', () => {
  test('renders machine rows from API', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    const rows = page.locator('#equipos-tbody tr');
    await expect(rows).toHaveCount(FIXTURES.maquinas.length);
  });

  test('operativo machine shows green badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    const row = page.locator('#equipos-tbody tr').first();
    await expect(row.locator('.badge')).toHaveClass(/badge-green/);
    await expect(row.locator('.badge')).toHaveText('Operativo');
  });

  test('vencido machine shows red badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    const row = page.locator('#equipos-tbody tr').nth(1);
    await expect(row.locator('.badge')).toHaveClass(/badge-red/);
    await expect(row.locator('.badge')).toHaveText('Mant. vencido');
  });

  test('machine row shows QR link pointing to qr.html with correct id param', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    const qrLink = page.locator('#equipos-tbody tr').first().locator('a:has-text("QR")');
    await expect(qrLink).toHaveAttribute('href', `qr.html?maquina=${FIXTURES.maquinas[0].id}`);
  });

  test('machine components are shown as chips (max 3 + overflow badge)', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    // MAQ-001 has 4 components; expect 3 chips + 1 overflow chip
    const firstRow = page.locator('#equipos-tbody tr').first();
    const chips = firstRow.locator('.comp-chip-sm');
    await expect(chips).toHaveCount(4); // 3 named + "+1"
    await expect(chips.last()).toHaveText('+1');
  });

  test('search input is present and focusable', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    const search = page.locator('#page-equipos .search-input').first();
    await search.focus();
    await expect(search).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// 5. Modal — Nueva Maquina
// ---------------------------------------------------------------------------

test.describe('Modal: Nueva Maquina', () => {
  test('modal is hidden initially', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await expect(page.locator('#modal-equipo')).not.toHaveClass(/show/);
  });

  test('clicking + Nueva Maquina opens modal', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');
    await expect(page.locator('#modal-equipo')).toHaveClass(/show/);
  });

  test('clicking Cancelar closes modal', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');
    await page.click('#modal-equipo button:has-text("Cancelar")');
    await expect(page.locator('#modal-equipo')).not.toHaveClass(/show/);
  });

  test('clicking X button closes modal', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');
    await page.click('#modal-equipo .modal-close');
    await expect(page.locator('#modal-equipo')).not.toHaveClass(/show/);
  });

  test('saving with empty fields shows native alert', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');

    let alertText = '';
    page.once('dialog', async (dialog) => { alertText = dialog.message(); await dialog.accept(); });
    await page.click('button:has-text("Guardar y generar QR")');
    expect(alertText).toBe('Complete los campos obligatorios');
  });

  test('saving with valid data closes modal and reloads table', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');

    await page.fill('#eq-nombre', 'Bomba de Agua');
    await page.fill('#eq-id', 'MAQ-999');
    await page.fill('#eq-ubicacion', 'Sala de Bombas');
    await page.fill('#eq-componentes', 'Motor, Impulsor');

    await page.click('button:has-text("Guardar y generar QR")');
    await expect(page.locator('#modal-equipo')).not.toHaveClass(/show/);
  });

  test('modal form fields are cleared after successful save', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');

    await page.fill('#eq-nombre', 'Bomba Test');
    await page.fill('#eq-id', 'MAQ-TMP');
    await page.fill('#eq-ubicacion', 'Nave 5');
    await page.click('button:has-text("Guardar y generar QR")');

    // Re-open to check fields were cleared
    await page.click('button:has-text("+ Nueva Maquina")');
    await expect(page.locator('#eq-nombre')).toHaveValue('');
    await expect(page.locator('#eq-id')).toHaveValue('');
    await expect(page.locator('#eq-ubicacion')).toHaveValue('');
  });

  test('frecuencia select defaults to Trimestral', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await page.click('button:has-text("+ Nueva Maquina")');
    await expect(page.locator('#eq-frecuencia')).toHaveValue('Trimestral');
  });
});

// ---------------------------------------------------------------------------
// 6. Registros de Mantenimiento table
// ---------------------------------------------------------------------------

test.describe('Registros de Mantenimiento page', () => {
  test('renders registro rows from API', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    await expect(page.locator('#registros-tbody tr')).toHaveCount(FIXTURES.registros.length);
  });

  test('preventivo registro shows blue badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    const row = page.locator('#registros-tbody tr').first();
    await expect(row.locator('.badge').first()).toHaveClass(/badge-blue/);
  });

  test('filter select has all maintenance type options', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    const options = page.locator('#page-ordenes select option');
    await expect(options).toHaveCount(5); // Todos + 4 types
    await expect(options.nth(1)).toHaveText('Preventivo');
    await expect(options.nth(2)).toHaveText('Correctivo');
  });

  test('renders tecnico and registrado_por names in correct columns', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    const row = page.locator('#registros-tbody tr').first();
    const cells = row.locator('td');
    await expect(cells.nth(5)).toHaveText('Carlos Gomez');
    await expect(cells.nth(6)).toHaveText('Maciel Entry');
  });
});

// ---------------------------------------------------------------------------
// 7. Repuestos / Inventario
// ---------------------------------------------------------------------------

test.describe('Repuestos page', () => {
  test('agrupar toggle renders categories as collapsible group headers', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.check('#rep-agrupar');
    const headers = page.locator('.cat-header');
    // Fixtures have 3 categories: Rodamientos, Correas y Transmision, Lubricantes
    await expect(headers).toHaveCount(3);
  });

  test('stock OK shows green badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    // ROD-001 has stock 5, min 3 => OK
    await expect(page.locator('#repuestos-container .badge-green').first()).toBeVisible();
  });

  test('stock below minimum shows warning badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    // ROD-002 has stock 2, min 3 => Bajo
    await expect(page.locator('#repuestos-container .badge-yellow').first()).toBeVisible();
  });

  test('search filters repuestos across codigo and descripcion', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.fill('#rep-buscar', 'correa');
    await expect(page.locator('#repuestos-container tbody tr')).toHaveCount(1);
    await expect(page.locator('#repuestos-container')).toContainText('Correa A-42 Gates');
  });

  test('+ Nuevo Repuesto button opens modal', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.click('button:has-text("+ Nuevo Repuesto")');
    await expect(page.locator('#modal-repuesto')).toHaveClass(/show/);
  });

  test('saving repuesto with empty fields shows alert', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.click('button:has-text("+ Nuevo Repuesto")');

    let alertText = '';
    page.once('dialog', async (dialog) => { alertText = dialog.message(); await dialog.accept(); });
    await page.click('#modal-repuesto button:has-text("Guardar")');
    expect(alertText).toBe('Complete los campos obligatorios');
  });

  test('saving repuesto with valid data closes modal', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.click('button:has-text("+ Nuevo Repuesto")');

    await page.fill('#rep-codigo', 'ROD-TEST');
    await page.fill('#rep-descripcion', 'Rodamiento de prueba');
    await page.fill('#rep-stock', '10');
    await page.fill('#rep-minimo', '2');

    await page.click('#modal-repuesto button:has-text("Guardar")');
    await expect(page.locator('#modal-repuesto')).not.toHaveClass(/show/);
  });

  test('stock numeric inputs accept only numbers', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.click('button:has-text("+ Nuevo Repuesto")');
    await expect(page.locator('#rep-stock')).toHaveAttribute('type', 'number');
    await expect(page.locator('#rep-minimo')).toHaveAttribute('type', 'number');
  });
});

// ---------------------------------------------------------------------------
// 8. Usuarios page
// ---------------------------------------------------------------------------

test.describe('Usuarios page', () => {
  test('renders all users from API', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Tecnicos & Usuarios');
    const rows = page.locator('#usuarios-tbody tr');
    await expect(rows).toHaveCount(Object.keys(FIXTURES.users).length);
  });

  test('admin user shows with dark badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Tecnicos & Usuarios');
    // Find the admin row by name; each row has 2 badges (rol + estado), pick the first
    const adminRow = page.locator('#usuarios-tbody tr', { hasText: FIXTURES.users.admin.nombre });
    await expect(adminRow.locator('.badge').first()).toContainText('Administrador');
  });

  test('active users show badge-green estado badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Tecnicos & Usuarios');
    const estadoBadges = page.locator('#usuarios-tbody .badge-green');
    await expect(estadoBadges).toHaveCount(Object.keys(FIXTURES.users).length);
  });
});

// ---------------------------------------------------------------------------
// 9. Tareas Preventivas page
// ---------------------------------------------------------------------------

test.describe('Tareas page', () => {
  async function openTareas(page) {
    await openBackoffice(page);
    await page.click('text=Tareas Preventivas');
    await expect(page.locator('#page-tareas')).toHaveClass(/active/);
  }

  test('clicking Tareas Preventivas activates tareas page with title', async ({ page }) => {
    await openTareas(page);
    await expect(page.locator('#page-title')).toHaveText('Tareas Preventivas');
  });

  test('renders only active tareas by default', async ({ page }) => {
    await openTareas(page);
    // Fixtures: 3 tareas, 1 inactiva
    await expect(page.locator('#tareas-tbody tr')).toHaveCount(2);
    await expect(page.locator('#tareas-tbody')).toContainText('Inspeccion y limpieza Gral. Tableros');
  });

  test('ver inactivas checkbox shows all tareas', async ({ page }) => {
    await openTareas(page);
    await page.check('#tarea-ver-inactivas');
    await expect(page.locator('#tareas-tbody tr')).toHaveCount(3);
  });

  test('tiles count estados of active tareas', async ({ page }) => {
    await openTareas(page);
    await expect(page.locator('#tarea-tile-vencida')).toHaveText('1');
    await expect(page.locator('#tarea-tile-nunca')).toHaveText('1');
    await expect(page.locator('#tarea-tile-ok')).toHaveText('0');
  });

  test('maquina filter reduces rows', async ({ page }) => {
    await openTareas(page);
    await page.selectOption('#tarea-filtro-maquina', 'MAQ-001');
    await expect(page.locator('#tareas-tbody tr')).toHaveCount(2);
    await page.selectOption('#tarea-filtro-maquina', 'MAQ-002');
    // MAQ-002 solo tiene una tarea inactiva
    await expect(page.locator('#tareas-tbody')).toContainText('Sin tareas');
  });

  test('estado badges render with correct classes', async ({ page }) => {
    await openTareas(page);
    await expect(page.locator('#tareas-tbody .badge-red')).toHaveText('Vencida');
    await expect(page.locator('#tareas-tbody .badge-gray')).toHaveText('Nunca');
  });

  test('+ Nueva Tarea opens modal with frecuencia options', async ({ page }) => {
    await openTareas(page);
    await page.click('button:has-text("+ Nueva Tarea")');
    await expect(page.locator('#modal-tarea')).toHaveClass(/show/);
    await expect(page.locator('#ta-frecuencia option')).toHaveCount(7);
  });

  test('guardar tarea sends POST with full payload', async ({ page }) => {
    await openTareas(page);
    await page.click('button:has-text("+ Nueva Tarea")');
    await page.selectOption('#ta-maquina', 'MAQ-001');
    await page.fill('#ta-nombre', 'Control tablero nuevo');
    await page.fill('#ta-tiempo', '45');
    await page.selectOption('#ta-frecuencia', 'Trimestral');
    await page.fill('#ta-orden', '3');

    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/tareas') && req.method() === 'POST'
    );
    await page.click('#modal-tarea button:has-text("Guardar")');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload).toMatchObject({
      maquina_id: 'MAQ-001',
      nombre: 'Control tablero nuevo',
      tiempo_estimado_min: 45,
      frecuencia: 'Trimestral',
      orden: 3,
    });
    await expect(page.locator('#modal-tarea')).not.toHaveClass(/show/);
  });

  test('editar tarea sends PUT and disables maquina select', async ({ page }) => {
    await openTareas(page);
    await page.click('#tareas-tbody tr >> nth=0 >> button:has-text("Editar")');
    await expect(page.locator('#modal-tarea')).toHaveClass(/show/);
    await expect(page.locator('#ta-maquina')).toBeDisabled();
    await expect(page.locator('#ta-nombre')).toHaveValue('Inspeccion y limpieza Gral. Tableros');

    const requestPromise = page.waitForRequest(
      (req) => /\/api\/tareas\/1$/.test(req.url()) && req.method() === 'PUT'
    );
    await page.click('#modal-tarea button:has-text("Guardar")');
    await requestPromise;
  });
});

// ---------------------------------------------------------------------------
// 10. Repuestos — disciplina
// ---------------------------------------------------------------------------

test.describe('Repuestos disciplina', () => {
  test('rows show disciplina badge', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    // LUB-001 es Electrico en los fixtures
    await expect(page.locator('#repuestos-container tr:has-text("LUB-001")')).toContainText('Electrico');
    await expect(page.locator('#repuestos-container tr:has-text("ROD-001")')).toContainText('Mecanico');
  });

  test('disciplina filter shows only matching rows', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.selectOption('#rep-filtro-disc', 'Electrico');
    await expect(page.locator('#repuestos-container tbody tr')).toHaveCount(1);
    await expect(page.locator('#repuestos-container')).toContainText('LUB-001');
    await page.selectOption('#rep-filtro-disc', 'Mecanico');
    await expect(page.locator('#repuestos-container tbody tr')).toHaveCount(3);
  });

  test('nuevo repuesto POST includes disciplina', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Repuestos');
    await page.click('button:has-text("+ Nuevo Repuesto")');
    await page.fill('#rep-codigo', 'ELE-TEST');
    await page.fill('#rep-descripcion', 'Fotocelula de prueba');
    await page.selectOption('#rep-disciplina', 'Electrico');

    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/repuestos') && req.method() === 'POST'
    );
    await page.click('#modal-repuesto button:has-text("Guardar")');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload.disciplina).toBe('Electrico');
  });
});
