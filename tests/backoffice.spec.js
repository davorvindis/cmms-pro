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

// ---------------------------------------------------------------------------
// 11. Eliminar maquina
// ---------------------------------------------------------------------------

test.describe('Eliminar maquina', () => {
  test('admin ve el boton Eliminar en cada fila', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    await expect(page.locator('#equipos-tbody button:has-text("Eliminar")')).toHaveCount(FIXTURES.maquinas.length);
  });

  test('codigo mal escrito no elimina y avisa', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    const dialogs = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.type());
      if (d.type() === 'prompt') await d.accept('OTRA-COSA');
      else await d.accept();
    });
    await page.locator('#equipos-tbody button:has-text("Eliminar")').first().click();
    await expect.poll(() => dialogs).toContain('alert');
  });

  test('confirmando con el codigo exacto manda DELETE', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Maquinas / Activos');
    page.on('dialog', (d) => d.accept('MAQ-001'));
    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/maquinas/MAQ-001') && req.method() === 'DELETE'
    );
    await page.locator('#equipos-tbody button:has-text("Eliminar")').first().click();
    await requestPromise;
  });
});

// ---------------------------------------------------------------------------
// 12. Checklist preventivo en modal de registro
// ---------------------------------------------------------------------------

test.describe('Checklist en modal registro', () => {
  test('elegir maquina con tareas y tipo Preventivo muestra el checklist', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    await page.click('button:has-text("+ Nuevo Registro")');
    await page.selectOption('#reg-maquina', 'MAQ-001');
    await expect(page.locator('#reg-seccion-tareas')).toBeVisible();
    await expect(page.locator('#reg-tareas-list .tarea-card')).toHaveCount(2);
    await page.selectOption('#reg-tipo', 'Correctivo');
    await expect(page.locator('#reg-seccion-tareas')).toBeHidden();
  });

  test('guardar con checklist tildado manda tareas en el payload', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    await page.click('button:has-text("+ Nuevo Registro")');
    await page.selectOption('#reg-maquina', 'MAQ-001');
    await page.selectOption('#reg-tecnico', 'tec01');
    const card = page.locator('#reg-tareas-list .tarea-card[data-tarea-id="1"]');
    await card.locator('.chip-res', { hasText: 'Realizado' }).last().click();

    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/registros') && req.method() === 'POST'
    );
    await page.click('#modal-registro button:has-text("Guardar Registro")');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload.tareas).toEqual([{ tarea_id: 1, resultados: ['Realizado'], observacion: null }]);
    expect(payload.componentes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 13. Detalle de registro
// ---------------------------------------------------------------------------

test.describe('Detalle de registro', () => {
  test('click en Detalle abre modal con observacion, checklist y componentes', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Registros de Mant.');
    await page.click('#registros-tbody button:has-text("Detalle")');
    await expect(page.locator('#modal-detalle')).toHaveClass(/show/);
    await expect(page.locator('#detalle-body')).toContainText('Cinta lateral gastada');
    await expect(page.locator('#detalle-body')).toContainText('Inspeccion tableros');
    await expect(page.locator('#detalle-body')).toContainText('Realizado, Ajustado');
    await expect(page.locator('#detalle-body')).toContainText('Revision general');
    await expect(page.locator('#detalle-body')).toContainText('Rodamiento 6205-2RS SKF x2');
  });
});

// ---------------------------------------------------------------------------
// 14. Mantenimientos planificados
// ---------------------------------------------------------------------------

test.describe('Mantenimientos', () => {
  async function openMants(page) {
    await openBackoffice(page);
    await page.click('nav >> text=Mantenimientos');
    await expect(page.locator('#page-mantenimientos')).toHaveClass(/active/);
  }

  test('pagina lista mantenimientos con estados y tiles', async ({ page }) => {
    await openMants(page);
    await expect(page.locator('#mants-tbody tr')).toHaveCount(2);
    await expect(page.locator('#mant-tile-pendientes')).toHaveText('1');
    await expect(page.locator('#mant-tile-completados')).toHaveText('1');
    await expect(page.locator('#mants-tbody .badge-yellow')).toHaveText('Pendiente');
  });

  test('crear mantenimiento manda payload con items', async ({ page }) => {
    await openMants(page);
    await page.click('button:has-text("+ Nuevo Mantenimiento")');
    await page.selectOption('#mant-maquina', 'MAQ-001');
    await page.fill('#mant-titulo', 'Mantenimiento de prueba');
    await page.fill('#mant-horas', '1.000 hs');
    // La primera fila se agrega sola al elegir maquina; el conjunto se busca escribiendo
    await page.fill('#mant-items-list input[id^="mant-item-comp-"]', 'Turbina');
    await page.fill('#mant-items-list input[id^="mant-item-tarea-"]', 'limpieza');

    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/mantenimientos') && req.method() === 'POST'
    );
    await page.click('#modal-mant button:has-text("Crear Mantenimiento")');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload).toMatchObject({
      maquina_id: 'MAQ-001',
      titulo: 'Mantenimiento de prueba',
      horas_marcha: '1.000 hs',
      items: [{ componente_id: 1, tarea: 'limpieza', orden: 1 }],
    });
  });

  test('completar manda tecnico, observaciones e items', async ({ page }) => {
    await openMants(page);
    await page.click('#mants-tbody button:has-text("Completar")');
    await expect(page.locator('#modal-mant-comp')).toHaveClass(/show/);
    await expect(page.locator('#mant-comp-items [data-item-id]')).toHaveCount(2);

    const card = page.locator('#mant-comp-items [data-item-id="11"]');
    await card.locator('.mant-it-mecanico').selectOption('tec01');
    await card.locator('.mant-it-novedades').fill('cambio de pernos');

    await page.selectOption('#mant-comp-tecnico', 'tec02');
    page.on('dialog', (d) => d.accept());
    const requestPromise = page.waitForRequest(
      (req) => /\/api\/mantenimientos\/1\/completar$/.test(req.url()) && req.method() === 'POST'
    );
    await page.click('button:has-text("Completar mantenimiento")');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload.tecnico_id).toBe('tec02');
    expect(payload.items.find((i) => i.item_id === 11)).toMatchObject({ mecanico_id: 'tec01', novedades: 'cambio de pernos' });
  });

  test('hoja imprimible abre popup con las columnas del papel', async ({ page }) => {
    await openMants(page);
    const popupPromise = page.waitForEvent('popup');
    await page.click('#mants-tbody button:has-text("Hoja")');
    const popup = await popupPromise;
    await expect(popup.locator('table')).toContainText('Novedades');
    await expect(popup.locator('table')).toContainText('Mecanico');
    await expect(popup.locator('body')).toContainText('Mantenimiento VE serie 989');
  });
});

// ---------------------------------------------------------------------------
// 15. Editar usuarios
// ---------------------------------------------------------------------------

test.describe('Editar usuario', () => {
  test('admin ve boton Editar y el modal precarga los datos', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Tecnicos & Usuarios');
    await expect(page.locator('#usuarios-tbody button:has-text("Editar")')).toHaveCount(Object.keys(FIXTURES.users).length);
    await page.locator('#usuarios-tbody tr:has-text("Carlos Gomez") button:has-text("Editar")').click();
    await expect(page.locator('#modal-usuario')).toHaveClass(/show/);
    await expect(page.locator('#modal-usuario-title')).toHaveText('Editar Usuario');
    await expect(page.locator('#us-nombre')).toHaveValue('Carlos Gomez');
    await expect(page.locator('#us-dni')).toHaveValue('tec01');
  });

  test('guardar cambios manda PUT solo con lo modificado y sin pin vacio', async ({ page }) => {
    await openBackoffice(page);
    await page.click('text=Tecnicos & Usuarios');
    await page.locator('#usuarios-tbody tr:has-text("Carlos Gomez") button:has-text("Editar")').click();
    await page.fill('#us-nombre', 'Carlos Gomez Perez');

    const requestPromise = page.waitForRequest(
      (req) => req.url().endsWith('/api/usuarios/tec01') && req.method() === 'PUT'
    );
    await page.click('#btn-guardar-usuario');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload).toEqual({ nombre: 'Carlos Gomez Perez' });
  });
});

test.describe('Mantenimientos — buscador de conjuntos', () => {
  test('conjunto tipeado que no existe muestra alerta y no envia', async ({ page }) => {
    await openBackoffice(page);
    await page.click('nav >> text=Mantenimientos');
    await page.click('button:has-text("+ Nuevo Mantenimiento")');
    await page.selectOption('#mant-maquina', 'MAQ-001');
    await page.fill('#mant-titulo', 'Prueba');
    await page.fill('#mant-items-list input[id^="mant-item-comp-"]', 'NoExiste');
    await page.fill('#mant-items-list input[id^="mant-item-tarea-"]', 'limpieza');
    let alertText = '';
    page.once('dialog', async (d) => { alertText = d.message(); await d.accept(); });
    await page.click('#modal-mant button:has-text("Crear Mantenimiento")');
    expect(alertText).toContain('Conjunto no reconocido');
  });

  test('el datalist de conjuntos se llena con los de la maquina', async ({ page }) => {
    await openBackoffice(page);
    await page.click('nav >> text=Mantenimientos');
    await page.click('button:has-text("+ Nuevo Mantenimiento")');
    await page.selectOption('#mant-maquina', 'MAQ-001');
    await expect(page.locator('#mant-conjuntos-list option')).toHaveCount(FIXTURES.maquinas[0].componentes.length);
  });
});

test.describe('Mantenimientos — crear conjunto inline', () => {
  test('crea el conjunto sin salir y lo pone en la fila con el buscador actualizado', async ({ page }) => {
    await openBackoffice(page);
    await page.click('nav >> text=Mantenimientos');
    await page.click('button:has-text("+ Nuevo Mantenimiento")');
    await page.selectOption('#mant-maquina', 'MAQ-001');

    await page.click('text=¿No encontras el conjunto?');
    await page.fill('#mant-nc-nombre', 'Conjunto nuevo de prueba');

    const requestPromise = page.waitForRequest(
      (req) => /\/api\/maquinas\/MAQ-001\/componentes$/.test(req.url()) && req.method() === 'POST'
    );
    await page.click('#mant-nuevo-conj button:has-text("Crear")');
    const req = await requestPromise;
    expect(JSON.parse(req.postData() || '{}')).toMatchObject({ nombre: 'Conjunto nuevo de prueba' });

    // Queda en la fila y en el datalist
    await expect(page.locator('#mant-items-list input[id^="mant-item-comp-"]').first()).toHaveValue('Conjunto nuevo de prueba');
    await expect(page.locator('#mant-conjuntos-list option[value="Conjunto nuevo de prueba"]')).toHaveCount(1);
    // El payload final resuelve el id nuevo (77 del mock)
    await page.fill('#mant-titulo', 'Prueba inline');
    await page.fill('#mant-items-list input[id^="mant-item-tarea-"]', 'limpieza');
    const createPromise = page.waitForRequest(
      (r) => r.url().endsWith('/api/mantenimientos') && r.method() === 'POST'
    );
    await page.click('#modal-mant button:has-text("Crear Mantenimiento")');
    const createReq = await createPromise;
    expect(JSON.parse(createReq.postData() || '{}').items[0]).toMatchObject({ componente_id: 77, tarea: 'limpieza' });
  });
});

test.describe('Mantenimientos — editar', () => {
  test('editar precarga filas y manda diff de modificados/eliminados/nuevos', async ({ page }) => {
    await openBackoffice(page);
    await page.click('nav >> text=Mantenimientos');
    await page.locator('#mants-tbody tr:has-text("Pendiente") button:has-text("Editar")').click();
    await expect(page.locator('#modal-mant')).toHaveClass(/show/);
    await expect(page.locator('#modal-mant-title')).toHaveText('Editar Mantenimiento');
    await expect(page.locator('#mant-maquina')).toBeDisabled();
    await expect(page.locator('#mant-items-list .mant-item-row')).toHaveCount(2);
    await expect(page.locator('#mant-titulo')).toHaveValue('Mantenimiento VE serie 989');

    // Cambiar tarea de la fila 1 (item 11), borrar fila 2 (item 12), agregar una nueva
    const filas = page.locator('#mant-items-list .mant-item-row');
    await filas.nth(0).locator('input[id^="mant-item-tarea-"]').fill('lubricacion');
    await filas.nth(1).locator('.btn-remove-sm').click();
    await page.click('button:has-text("+ Agregar fila")');
    await page.locator('#mant-items-list .mant-item-row').last().locator('input[id^="mant-item-comp-"]').fill('Motor principal');
    await page.locator('#mant-items-list .mant-item-row').last().locator('input[id^="mant-item-tarea-"]').fill('limpieza');

    const requestPromise = page.waitForRequest(
      (req) => /\/api\/mantenimientos\/1$/.test(req.url()) && req.method() === 'PUT'
    );
    await page.click('#btn-guardar-mant');
    const req = await requestPromise;
    const payload = JSON.parse(req.postData() || '{}');
    expect(payload.items).toEqual([{ item_id: 11, tarea: 'lubricacion' }]);
    expect(payload.eliminar_items).toEqual([12]);
    expect(payload.nuevos_items).toEqual([{ componente_id: 2, tarea: 'limpieza', orden: 2 }]);
  });
});
