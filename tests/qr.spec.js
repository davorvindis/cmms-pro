// @ts-check
/**
 * Tests de qr.html — la vista mobile que abre el operario al escanear el QR
 * de una maquina.
 *
 * Todo el backend esta mockeado via helpers.mockApi() (mismo patron que
 * backoffice.spec.js). La vista es publica; el login solo se exige para
 * registrar mantenimientos o completar planificados.
 */
const { test, expect } = require('@playwright/test');
const { mockApi, seedSession, FIXTURES } = require('./helpers');

const MAQ = FIXTURES.maquinas[0]; // MAQ-001 Turbina Principal

// ---------------------------------------------------------------------------
// Helpers locales
// ---------------------------------------------------------------------------

/** Abre qr.html como vista publica (sin sesion). */
async function openQR(page, maquinaId = MAQ.id) {
  await mockApi(page);
  await page.goto(`/qr.html?maquina=${maquinaId}`);
  await expect(page.locator('#equipo-card h2')).toBeVisible();
}

/** Abre qr.html con sesion ya iniciada (localStorage sembrado). */
async function openQRLogged(page, role = 'admin', maquinaId = MAQ.id) {
  await mockApi(page);
  await seedSession(page, role);
  await page.goto(`/qr.html?maquina=${maquinaId}`);
  await expect(page.locator('#equipo-card h2')).toBeVisible();
}

/** Abre el formulario de nuevo registro ya logueado. */
async function openFormRegistro(page) {
  await openQRLogged(page);
  await page.click('button:has-text("+ Registrar mantenimiento")');
  await expect(page.locator('#form-registro')).toHaveClass(/show/);
}

// ---------------------------------------------------------------------------
// 1. Login
// ---------------------------------------------------------------------------

test.describe('Login', () => {
  test('la vista es publica: no aparece overlay de login al cargar', async ({ page }) => {
    await openQR(page);
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#user-badge')).toHaveText('Vista publica');
  });

  test('registrar mantenimiento sin sesion abre el login', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await expect(page.locator('#login-overlay')).toHaveClass(/show/);
    await expect(page.locator('#form-registro')).not.toHaveClass(/show/);
  });

  test('campos vacios muestran error', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await page.click('.btn-login:has-text("Entrar")');
    await expect(page.locator('#login-error')).toHaveText('Complete ambos campos');
    await expect(page.locator('#login-error')).toBeVisible();
  });

  test('credenciales invalidas muestran error', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await page.fill('#login-id', 'admin');
    await page.fill('#login-pin', '9999');
    await page.click('.btn-login:has-text("Entrar")');
    await expect(page.locator('#login-error')).toHaveText('Credenciales invalidas');
  });

  test('login por formulario oculta overlay, muestra badge y retoma la accion pendiente', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await page.fill('#login-id', 'tec01');
    await page.fill('#login-pin', '1234');
    await page.click('.btn-login:has-text("Entrar")');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#user-badge')).toContainText('Tecnico: Carlos Gomez');
    // La accion pendiente (registro) se retoma sola
    await expect(page.locator('#form-registro')).toHaveClass(/show/);
  });

  test('Enter en el PIN dispara el login', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await page.fill('#login-id', 'admin');
    await page.fill('#login-pin', '1234');
    await page.locator('#login-pin').press('Enter');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
  });

  test('quick-login DEV es visible en localhost con sus 3 botones', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await expect(page.locator('#dev-quick-login')).toBeVisible();
    await expect(page.locator('#dev-quick-login .btn-login')).toHaveCount(3);
  });

  test('quick-login Admin loguea y retoma la accion pendiente', async ({ page }) => {
    await openQR(page);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await page.click('#dev-quick-login button:has-text("Admin")');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#user-badge')).toContainText('Administrador: Admin Beto');
    await expect(page.locator('#form-registro')).toHaveClass(/show/);
  });

  test('sesion sembrada en localStorage muestra el badge sin pasar por el login', async ({ page }) => {
    await openQRLogged(page, 'admin');
    await expect(page.locator('#user-badge')).toContainText('Administrador: Admin Beto');
    await expect(page.locator('#login-overlay')).not.toHaveClass(/show/);
  });

  test('cerrar sesion desde el badge vuelve a vista publica', async ({ page }) => {
    await openQRLogged(page, 'admin');
    page.on('dialog', (d) => d.accept());
    await page.click('#user-badge');
    await expect(page.locator('#user-badge')).toHaveText('Vista publica');
  });

  test('respuesta 401 de la API desloguea y reabre el login', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await expect(page.locator('#equipo-card h2')).toBeVisible();
    // La sesion "expira": /usuarios responde 401
    await page.route(/\/api\/usuarios/, (route) => route.fulfill({ status: 401, body: 'Unauthorized' }));
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await expect(page.locator('#login-overlay')).toHaveClass(/show/);
    await expect(page.locator('#user-badge')).toHaveText('Vista publica');
  });
});

// ---------------------------------------------------------------------------
// 2. Ficha del equipo
// ---------------------------------------------------------------------------

test.describe('Ficha del equipo', () => {
  test('sin parametro maquina pide PROTOS-100 por defecto', async ({ page }) => {
    await mockApi(page);
    const req = page.waitForRequest((r) => r.url().includes('/api/maquinas/'));
    await page.goto('/qr.html');
    expect((await req).url()).toContain('/api/maquinas/PROTOS-100');
  });

  test('scan-info muestra fecha y hora del escaneo', async ({ page }) => {
    await openQR(page);
    await expect(page.locator('#scan-info')).toContainText('Escaneado:');
    await expect(page.locator('#scan-info')).toContainText('hs');
  });

  test('muestra nombre, id, serie y ubicacion de la maquina', async ({ page }) => {
    await openQR(page);
    await expect(page.locator('#equipo-card h2')).toHaveText(MAQ.nombre);
    await expect(page.locator('#equipo-card .equipo-id')).toContainText(MAQ.id);
    await expect(page.locator('#equipo-card .equipo-id')).toContainText('Serie: T-001');
    await expect(page.locator('#equipo-card .ubicacion')).toContainText(MAQ.ubicacion);
  });

  test('estado Operativo muestra badge verde', async ({ page }) => {
    await openQR(page);
    const status = page.locator('#equipo-card .status');
    await expect(status).toHaveClass(/operativo/);
    await expect(status).toHaveText('Operativo');
  });

  test('estado Mant. vencido muestra badge vencido y proximo en rojo', async ({ page }) => {
    await openQR(page, 'MAQ-002');
    await expect(page.locator('#equipo-card .status')).toHaveClass(/vencido/);
    await expect(page.locator('#equipo-card .status')).toHaveText('Mant. vencido');
    await expect(page.locator('.ultimo-mant-item').nth(1).locator('.mant-value')).toHaveCSS('color', 'rgb(220, 38, 38)');
  });

  test('componentes sin seccion se muestran como chips por nombre', async ({ page }) => {
    await openQR(page);
    const chips = page.locator('#equipo-card .comp-chip');
    await expect(chips).toHaveCount(MAQ.componentes.length);
    await expect(chips.first()).toHaveText('Turbina');
  });

  test('componentes con seccion se agrupan como "seccion · N conjuntos"', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/maquinas\/MAQ-001$/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        ...MAQ,
        componentes: [
          { id: 1, nombre: 'Turbina', seccion: 'Turbinas' },
          { id: 2, nombre: 'Motor principal', seccion: 'Turbinas' },
          { id: 3, nombre: 'Rodamiento delantero', seccion: 'Transmision' },
        ],
      }) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    const chips = page.locator('#equipo-card .comp-chip');
    await expect(chips).toHaveCount(2);
    await expect(chips.first()).toHaveText('Turbinas · 2 conjuntos');
    await expect(chips.nth(1)).toHaveText('Transmision · 1 conjuntos');
  });

  test('fechas de ultimo y proximo mantenimiento en formato dd/mm/aaaa', async ({ page }) => {
    await openQR(page);
    const items = page.locator('.ultimo-mant-item .mant-value');
    await expect(items.first()).toHaveText('15/01/2026');
    await expect(items.nth(1)).toHaveText('15/04/2026');
  });

  test('linea de electronica muestra PLC, HMI con estado y link de documentacion', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/maquinas\/MAQ-001$/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        ...MAQ, plc: 'S7-1500', hmi: 'KTP700', hmi_estado: 'Vigente', doc_url: 'https://docs.example.com/maq',
      }) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    const line = page.locator('.electronica-line');
    await expect(line).toContainText('PLC S7-1500');
    await expect(line).toContainText('HMI: KTP700 (Vigente)');
    const doc = line.locator('a');
    await expect(doc).toContainText('Documentación');
    await expect(doc).toHaveAttribute('href', 'https://docs.example.com/maq');
    await expect(doc).toHaveAttribute('target', '_blank');
  });

  test('doc_url que no es http(s) no genera link', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/maquinas\/MAQ-001$/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...MAQ, plc: 'S7-300', doc_url: 'javascript:alert(1)' }) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await expect(page.locator('.electronica-line')).toContainText('PLC S7-300');
    await expect(page.locator('.electronica-line a')).toHaveCount(0);
  });

  test('maquina sin datos de electronica no muestra la linea', async ({ page }) => {
    await openQR(page);
    await expect(page.locator('.electronica-line')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Historial
// ---------------------------------------------------------------------------

test.describe('Historial', () => {
  test('lista el registro con resumen, tipo y rango visible', async ({ page }) => {
    await openQR(page);
    await expect(page.locator('.historial-entry')).toHaveCount(1);
    await expect(page.locator('.hist-date')).toContainText('20/04/2026');
    await expect(page.locator('.hist-resumen')).toHaveText('1 conjunto · 1 tarea · 2 repuestos · Carlos Gomez');
    await expect(page.locator('.hist-tipo')).toHaveClass(/preventivo/);
    await expect(page.locator('.hist-rango')).toHaveText('Ultimos 3 meses · mostrando 1 de 1');
  });

  test('pide los registros con desde= (3 meses atras)', async ({ page }) => {
    await mockApi(page);
    const req = page.waitForRequest((r) => r.url().includes('/registros?desde='));
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    const desde = new URL((await req).url()).searchParams.get('desde');
    expect(desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('la primera entrada arranca abierta con detalle completo', async ({ page }) => {
    await openQR(page);
    const entry = page.locator('.historial-entry').first();
    await expect(entry).toHaveClass(/abierto/);
    await expect(entry.locator('.hist-meta')).toContainText('Tecnico: Carlos Gomez | Registro: Maciel Entry');
    await expect(entry.locator('.hist-comp-name').first()).toHaveText('Inspeccion tableros');
    await expect(entry).toContainText('Realizado, Ajustado');
    await expect(entry).toContainText('Revision general');
    await expect(entry.locator('.hist-comp-repuestos span')).toHaveText('Rodamiento 6205-2RS SKF x2');
    await expect(entry.locator('.hist-observacion')).toContainText('Cinta lateral gastada');
  });

  test('click en el header colapsa y expande la entrada', async ({ page }) => {
    await openQR(page);
    const entry = page.locator('.historial-entry').first();
    await entry.locator('.hist-header').click();
    await expect(entry).not.toHaveClass(/abierto/);
    await entry.locator('.hist-header').click();
    await expect(entry).toHaveClass(/abierto/);
  });

  test('sin registros muestra el mensaje vacio', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/maquinas\/[^/]+\/registros/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await expect(page.locator('.hist-empty p')).toHaveText('Sin registros en los ultimos 3 meses');
  });

  test('pagina de a 5 con boton "Ver anteriores"', async ({ page }) => {
    await mockApi(page);
    const many = Array.from({ length: 7 }, (_, i) => ({
      ...FIXTURES.registros[0], id: 200 + i, fecha: `2026-09-${String(20 - i).padStart(2, '0')} 10:00:00`,
    }));
    await page.route(/\/api\/maquinas\/[^/]+\/registros/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(many) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await expect(page.locator('.historial-entry')).toHaveCount(5);
    await expect(page.locator('.hist-rango')).toHaveText('Ultimos 3 meses · mostrando 5 de 7');
    await page.click('button:has-text("Ver anteriores (2 mas)")');
    await expect(page.locator('.historial-entry')).toHaveCount(7);
    await expect(page.locator('button.hist-mas:has-text("Ver anteriores")')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Mantenimientos planificados pendientes
// ---------------------------------------------------------------------------

test.describe('Mantenimientos pendientes', () => {
  test('la seccion lista los pendientes de la maquina', async ({ page }) => {
    await openQR(page);
    await expect(page.locator('#qr-mants-seccion')).toBeVisible();
    const card = page.locator('#qr-mants-list .tarea-card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.tarea-nombre')).toContainText('Mantenimiento VE serie 989');
    await expect(card.locator('.tarea-desc')).toHaveText('2 tareas · Horas: 6.222 hs');
  });

  test('maquina sin pendientes oculta la seccion', async ({ page }) => {
    await openQR(page, 'MAQ-002'); // solo tiene un mantenimiento Completado
    await expect(page.locator('#qr-mants-seccion')).toBeHidden();
  });

  test('Completar sin sesion pide login y retoma el mantenimiento', async ({ page }) => {
    await openQR(page);
    await page.click('#qr-mants-list button:has-text("Completar")');
    await expect(page.locator('#login-overlay')).toHaveClass(/show/);
    await page.click('#dev-quick-login button:has-text("Admin")');
    await expect(page.locator('#form-mant')).toHaveClass(/show/);
    await expect(page.locator('#qr-mant-titulo')).toHaveText('Mantenimiento VE serie 989');
  });

  test('el formulario lista los items con mecanico, novedades y fecha de hoy', async ({ page }) => {
    await openQRLogged(page);
    await page.click('#qr-mants-list button:has-text("Completar")');
    const items = page.locator('#qr-mant-items [data-item-id]');
    await expect(items).toHaveCount(2);
    await expect(items.first().locator('.tarea-nombre')).toHaveText('Turbina');
    await expect(items.first().locator('.tarea-desc')).toHaveText('limpieza');
    // Selects poblados con los usuarios activos
    await expect(items.first().locator('.qr-mant-mecanico option')).toHaveCount(Object.keys(FIXTURES.users).length + 1);
    const hoy = new Date().toISOString().slice(0, 10);
    await expect(items.first().locator('.qr-mant-fecha')).toHaveValue(hoy);
  });

  test('guardar avance manda PUT con los items sin exigir responsable', async ({ page }) => {
    await openQRLogged(page);
    await page.click('#qr-mants-list button:has-text("Completar")');
    const item11 = page.locator('#qr-mant-items [data-item-id="11"]');
    await item11.locator('.qr-mant-mecanico').selectOption('tec01');
    await item11.locator('.qr-mant-novedades').fill('cambio de pernos');

    const reqPromise = page.waitForRequest((r) => /\/api\/mantenimientos\/1$/.test(r.url()) && r.method() === 'PUT');
    await page.click('button:has-text("Guardar avance sin completar")');
    const payload = JSON.parse((await reqPromise).postData() || '{}');
    expect(payload.items).toHaveLength(2);
    expect(payload.items.find((i) => i.item_id === 11)).toMatchObject({ mecanico_id: 'tec01', novedades: 'cambio de pernos' });
    await expect(page.locator('#form-mant')).not.toHaveClass(/show/);
    await expect(page.locator('.toast-ok')).toContainText('Avance guardado');
  });

  test('completar sin responsable general avisa y no envia', async ({ page }) => {
    await openQRLogged(page);
    await page.click('#qr-mants-list button:has-text("Completar")');
    await page.click('button:has-text("Completar mantenimiento")');
    await expect(page.locator('.toast-error')).toContainText('Seleccione el responsable general');
    await expect(page.locator('#form-mant')).toHaveClass(/show/);
  });

  test('completar manda tecnico, observaciones e items y cierra con toast', async ({ page }) => {
    await openQRLogged(page);
    await page.click('#qr-mants-list button:has-text("Completar")');
    await page.selectOption('#qr-mant-tecnico', 'tec02');
    await page.fill('#qr-mant-obs', 'quedo andando');
    const item11 = page.locator('#qr-mant-items [data-item-id="11"]');
    await item11.locator('.qr-mant-mecanico').selectOption('tec01');

    page.on('dialog', (d) => d.accept());
    const reqPromise = page.waitForRequest((r) => /\/api\/mantenimientos\/1\/completar$/.test(r.url()) && r.method() === 'POST');
    await page.click('button:has-text("Completar mantenimiento")');
    const payload = JSON.parse((await reqPromise).postData() || '{}');
    expect(payload.tecnico_id).toBe('tec02');
    expect(payload.observaciones).toBe('quedo andando');
    expect(payload.items.find((i) => i.item_id === 11)).toMatchObject({ mecanico_id: 'tec01' });
    await expect(page.locator('#form-mant')).not.toHaveClass(/show/);
    await expect(page.locator('.toast-ok')).toContainText('Mantenimiento completado');
  });

  test('la X cierra el formulario sin enviar', async ({ page }) => {
    await openQRLogged(page);
    await page.click('#qr-mants-list button:has-text("Completar")');
    await page.click('#form-mant .form-overlay-close');
    await expect(page.locator('#form-mant')).not.toHaveClass(/show/);
  });
});

// ---------------------------------------------------------------------------
// 5. Formulario de nuevo registro — basicos
// ---------------------------------------------------------------------------

test.describe('Nuevo registro: basicos', () => {
  test('abre con los selects de tipo y disciplina y una parte vacia', async ({ page }) => {
    await openFormRegistro(page);
    await expect(page.locator('#qr-reg-tipo option')).toHaveCount(4);
    await expect(page.locator('#qr-reg-tipo')).toHaveValue('Preventivo');
    await expect(page.locator('#qr-reg-disciplina option')).toHaveCount(2);
    await expect(page.locator('#qr-reg-partes .componente-block')).toHaveCount(1);
  });

  test('la X cierra el formulario', async ({ page }) => {
    await openFormRegistro(page);
    await page.click('#form-registro .form-overlay-close');
    await expect(page.locator('#form-registro')).not.toHaveClass(/show/);
  });

  test('el select de tecnicos lista los activos mas la opcion de alta', async ({ page }) => {
    await openFormRegistro(page);
    const opts = page.locator('#qr-reg-tecnico option');
    // placeholder + usuarios activos + "+ Agregar persona..."
    await expect(opts).toHaveCount(Object.keys(FIXTURES.users).length + 2);
    await expect(opts.last()).toHaveText('+ Agregar persona...');
  });

  test('guardar sin tecnico avisa', async ({ page }) => {
    await openFormRegistro(page);
    await page.click('button:has-text("Guardar registro")');
    await expect(page.locator('.toast-error')).toContainText('Seleccione un tecnico');
  });

  test('guardar sin partes ni checklist avisa', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tecnico', 'tec01');
    await page.click('button:has-text("Guardar registro")');
    await expect(page.locator('.toast-error')).toContainText('Agregue una parte intervenida o complete el checklist');
  });

  test('parte con trabajo pero sin conjunto elegido avisa', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tecnico', 'tec01');
    await page.fill('#qr-parte-trabajo-0', 'algo hecho');
    await page.click('button:has-text("Guardar registro")');
    await expect(page.locator('.toast-error')).toContainText('Hay partes sin conjunto seleccionado');
  });

  test('+ Agregar parte suma bloques numerados y la X los quita', async ({ page }) => {
    await openFormRegistro(page);
    await page.click('button:has-text("+ Agregar parte")');
    await expect(page.locator('#qr-reg-partes .componente-block')).toHaveCount(2);
    await expect(page.locator('#qr-parte-1 .comp-number')).toHaveText('2');
    await page.click('#qr-parte-0 .btn-remove-sm');
    await expect(page.locator('#qr-reg-partes .componente-block')).toHaveCount(1);
  });

  test('registro completo manda el payload con maquina, tipo, disciplina y componentes', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tipo', 'Correctivo');
    await page.selectOption('#qr-reg-tecnico', 'tec01');
    await page.fill('#qr-reg-proximo', '2026-12-01');
    await page.fill('#qr-reg-observaciones', 'quedo pendiente pintura');
    await page.selectOption('#qr-parte-sel-0', '1');
    await page.fill('#qr-parte-trabajo-0', 'Cambio de rodamiento');

    const reqPromise = page.waitForRequest((r) => r.url().endsWith('/api/registros') && r.method() === 'POST');
    await page.click('button:has-text("Guardar registro")');
    const payload = JSON.parse((await reqPromise).postData() || '{}');
    expect(payload).toMatchObject({
      maquina_id: 'MAQ-001',
      tipo: 'Correctivo',
      disciplina: 'Mecanico',
      tecnico_id: 'tec01',
      registrado_por_id: 'admin',
      proximo_mantenimiento: '2026-12-01',
      observaciones: 'quedo pendiente pintura',
      componentes: [{ componente_id: 1, trabajo_realizado: 'Cambio de rodamiento', repuestos: [] }],
      tareas: [],
    });
    await expect(page.locator('#form-registro')).not.toHaveClass(/show/);
    await expect(page.locator('.toast-ok')).toContainText('Registro guardado correctamente');
  });
});

// ---------------------------------------------------------------------------
// 6. Checklist preventivo
// ---------------------------------------------------------------------------

test.describe('Nuevo registro: checklist preventivo', () => {
  test('con tipo Preventivo y tareas activas se muestra el checklist', async ({ page }) => {
    await openFormRegistro(page);
    await expect(page.locator('#qr-seccion-tareas')).toBeVisible();
    // MAQ-001 tiene 2 tareas activas en los fixtures
    await expect(page.locator('#qr-tareas-list .tarea-card')).toHaveCount(2);
    await expect(page.locator('#qr-tareas-list')).toContainText('Inspeccion y limpieza Gral. Tableros');
  });

  test('cambiar el tipo a Correctivo oculta el checklist', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tipo', 'Correctivo');
    await expect(page.locator('#qr-seccion-tareas')).toBeHidden();
    await page.selectOption('#qr-reg-tipo', 'Preventivo');
    await expect(page.locator('#qr-seccion-tareas')).toBeVisible();
  });

  test('cada tarea muestra badge de estado y los 5 resultados posibles', async ({ page }) => {
    await openFormRegistro(page);
    const card1 = page.locator('#qr-tareas-list [data-tarea-id="1"]');
    await expect(card1.locator('.tarea-badge')).toHaveClass(/vencida/);
    await expect(card1.locator('.tarea-badge')).toHaveText('Vencida');
    await expect(card1.locator('.chip-res')).toHaveCount(5);
    const card2 = page.locator('#qr-tareas-list [data-tarea-id="2"]');
    await expect(card2.locator('.tarea-badge')).toHaveText('Nunca hecha');
  });

  test('los chips de resultado togglean la seleccion', async ({ page }) => {
    await openFormRegistro(page);
    const chip = page.locator('#qr-tareas-list [data-tarea-id="1"] .chip-res[data-res="Realizado"]');
    await chip.click();
    await expect(chip).toHaveClass(/sel/);
    await chip.click();
    await expect(chip).not.toHaveClass(/sel/);
  });

  test('guardar con checklist tildado manda tareas en el payload', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tecnico', 'tec01');
    const card = page.locator('#qr-tareas-list [data-tarea-id="1"]');
    await card.locator('.chip-res[data-res="Realizado"]').click();
    await card.locator('.chip-res[data-res="Ajustado"]').click();
    await card.locator('input.tarea-obs').fill('con juego, revisar');

    const reqPromise = page.waitForRequest((r) => r.url().endsWith('/api/registros') && r.method() === 'POST');
    await page.click('button:has-text("Guardar registro")');
    const payload = JSON.parse((await reqPromise).postData() || '{}');
    expect(payload.tareas).toEqual([{ tarea_id: 1, resultados: ['Realizado', 'Ajustado'], observacion: 'con juego, revisar' }]);
    expect(payload.componentes).toEqual([]);
  });

  test('las tareas se piden filtradas por la disciplina del usuario', async ({ page }) => {
    await mockApi(page);
    // Tecnico de electronica: el form arranca en su disciplina
    await page.addInitScript(({ user }) => {
      localStorage.setItem('cmms_user', JSON.stringify(user));
      localStorage.setItem('cmms_pin', '1234');
    }, { user: { ...FIXTURES.users.tecnico1, disciplina: 'Electrico' } });
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await expect(page.locator('#equipo-card h2')).toBeVisible();

    const reqPromise = page.waitForRequest((r) => r.url().includes('/tareas?disciplina='));
    await page.click('button:has-text("+ Registrar mantenimiento")');
    expect((await reqPromise).url()).toContain('disciplina=Electrico');
    await expect(page.locator('#qr-reg-disciplina')).toHaveValue('Electrico');
  });

  test('cambiar la disciplina recarga el checklist con esa disciplina', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    // Mock por disciplina: Electrico devuelve 1 tarea distinta
    await page.route(/\/api\/maquinas\/[^/]+\/tareas/, (route) => {
      const disc = new URL(route.request().url()).searchParams.get('disciplina');
      const body = disc === 'Electrico'
        ? [{ id: 9, nombre: 'Chequeo de sensores', descripcion: null, tiempo_estimado_min: 20, estado: 'nunca' }]
        : FIXTURES.tareas.filter((t) => t.maquina_id === 'MAQ-001' && t.activa);
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await expect(page.locator('#qr-tareas-list .tarea-card')).toHaveCount(2);

    const reqPromise = page.waitForRequest((r) => r.url().includes('tareas?disciplina=Electrico'));
    await page.selectOption('#qr-reg-disciplina', 'Electrico');
    await reqPromise;
    await expect(page.locator('#qr-tareas-list .tarea-card')).toHaveCount(1);
    await expect(page.locator('#qr-tareas-list')).toContainText('Chequeo de sensores');
  });

  test('maquina sin tareas no muestra la seccion aunque sea Preventivo', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    await page.route(/\/api\/maquinas\/[^/]+\/tareas/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await expect(page.locator('#form-registro')).toHaveClass(/show/);
    await expect(page.locator('#qr-seccion-tareas')).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// 7. Partes, secciones y repuestos con referencia
// ---------------------------------------------------------------------------

test.describe('Nuevo registro: partes y repuestos', () => {
  /** Selecciona el conjunto 1 (Turbina) en la parte 0 y espera sus repuestos. */
  async function elegirConjunto(page) {
    const respPromise = page.waitForResponse((r) => r.url().includes('/componentes/1/repuestos'));
    await page.selectOption('#qr-parte-sel-0', '1');
    await respPromise;
  }

  test('el select de conjunto lista los componentes mas "+ Nuevo conjunto..."', async ({ page }) => {
    await openFormRegistro(page);
    // placeholder + 4 componentes + nuevo
    await expect(page.locator('#qr-parte-sel-0 option')).toHaveCount(MAQ.componentes.length + 2);
    await expect(page.locator('#qr-parte-sel-0 option').last()).toHaveText('+ Nuevo conjunto...');
  });

  test('maquina con secciones: primero se elige seccion y filtra los conjuntos', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    await page.route(/\/api\/maquinas\/MAQ-001$/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        ...MAQ,
        componentes: [
          { id: 1, nombre: 'Turbina', seccion: 'Turbinas' },
          { id: 2, nombre: 'Motor principal', seccion: 'Turbinas' },
          { id: 3, nombre: 'Rodamiento delantero', seccion: 'Transmision' },
        ],
      }) })
    );
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await page.click('button:has-text("+ Registrar mantenimiento")');
    await expect(page.locator('#qr-parte-secc-0')).toBeVisible();
    await expect(page.locator('#qr-parte-sel-0 option').first()).toHaveText('Seleccione seccion primero...');
    await page.selectOption('#qr-parte-secc-0', 'Turbinas');
    // placeholder + 2 conjuntos de la seccion + nuevo
    await expect(page.locator('#qr-parte-sel-0 option')).toHaveCount(4);
    await expect(page.locator('#qr-parte-sel-0')).toContainText('Motor principal');
  });

  test('agregar repuesto sin conjunto elegido avisa', async ({ page }) => {
    await openFormRegistro(page);
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    await expect(page.locator('.toast-error')).toContainText('Seleccione el conjunto primero');
  });

  test('elegido el conjunto, el select de repuestos lista los del conjunto con codigo y Hauni', async ({ page }) => {
    await openFormRegistro(page);
    await elegirConjunto(page);
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    const sel = page.locator('#qr-rep-0-0 .repuesto-row select').first();
    // placeholder + 2 repuestos + nuevo
    await expect(sel.locator('option')).toHaveCount(4);
    await expect(sel).toContainText('Rodamiento 6205-2RS SKF — ROD-001 / Hauni H-4711');
    await expect(sel).toContainText('Correa A-42 Gates — COR-001');
  });

  test('repuesto con Nº Hauni habilita el selector de referencia Pieza/Hauni', async ({ page }) => {
    await openFormRegistro(page);
    await elegirConjunto(page);
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    const row = page.locator('#qr-rep-0-0');
    const refSel = row.locator('.ref-sel');
    await expect(refSel).toBeHidden();
    await row.locator('.repuesto-row select').first().selectOption('ROD-001');
    await expect(refSel).toBeVisible();
    await expect(refSel.locator('option')).toHaveText(['Pieza: ROD-001', 'Hauni: H-4711']);
    // Repuesto sin Hauni: el selector se oculta
    await row.locator('.repuesto-row select').first().selectOption('COR-001');
    await expect(refSel).toBeHidden();
  });

  test('payload incluye repuestos con cantidad y referencia elegida', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tecnico', 'tec01');
    await elegirConjunto(page);
    await page.fill('#qr-parte-trabajo-0', 'Recambio');
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    const row = page.locator('#qr-rep-0-0');
    await row.locator('.repuesto-row select').first().selectOption('ROD-001');
    await row.locator('.ref-sel').selectOption('Hauni');
    await row.locator('input.cant').fill('2');

    const reqPromise = page.waitForRequest((r) => r.url().endsWith('/api/registros') && r.method() === 'POST');
    await page.click('button:has-text("Guardar registro")');
    const payload = JSON.parse((await reqPromise).postData() || '{}');
    expect(payload.componentes).toEqual([{
      componente_id: 1,
      trabajo_realizado: 'Recambio',
      repuestos: [{ repuesto_codigo: 'ROD-001', cantidad: 2, referencia: 'Hauni' }],
    }]);
  });

  test('la X de la fila quita el repuesto', async ({ page }) => {
    await openFormRegistro(page);
    await elegirConjunto(page);
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    await expect(page.locator('#qr-parte-reps-0 .repuesto-row')).toHaveCount(2);
    await page.click('#qr-rep-0-0 .btn-remove-sm');
    await expect(page.locator('#qr-parte-reps-0 .repuesto-row')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// 8. Altas inline (persona / conjunto / repuesto)
// ---------------------------------------------------------------------------

test.describe('Nuevo registro: altas inline', () => {
  test('alta de persona: POST /usuarios sin acceso al sistema y queda seleccionada', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    // Mock con estado: el POST agrega y el GET siguiente la incluye
    const users = Object.values(FIXTURES.users).map((u) => ({ ...u }));
    await page.route(/\/api\/usuarios/, (route) => {
      if (route.request().method() === 'POST') {
        const b = JSON.parse(route.request().postData() || '{}');
        users.push({ id: b.id, nombre: b.nombre, rol: b.rol, estado: 'Activo' });
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
      } else {
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(users) });
      }
    });
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await page.click('button:has-text("+ Registrar mantenimiento")');

    await expect(page.locator('#qr-nueva-persona')).toBeHidden();
    await page.selectOption('#qr-reg-tecnico', '__nueva');
    await expect(page.locator('#qr-nueva-persona')).toBeVisible();
    await page.fill('#qr-np-nombre', 'Juan Externo');
    await page.fill('#qr-np-dni', '22333444');
    await page.fill('#qr-np-rol', 'Contratista');

    const reqPromise = page.waitForRequest((r) => r.url().endsWith('/api/usuarios') && r.method() === 'POST');
    await page.click('#qr-nueva-persona button:has-text("Crear")');
    const payload = JSON.parse((await reqPromise).postData() || '{}');
    expect(payload).toMatchObject({ id: '22333444', nombre: 'Juan Externo', rol: 'Contratista', puede_ingresar: false });
    await expect(page.locator('#qr-reg-tecnico')).toHaveValue('22333444');
    await expect(page.locator('#qr-nueva-persona')).toBeHidden();
  });

  test('alta de persona con campos incompletos avisa y no envia', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-reg-tecnico', '__nueva');
    await page.fill('#qr-np-nombre', 'Sin DNI');
    await page.click('#qr-nueva-persona button:has-text("Crear")');
    await expect(page.locator('.toast-error')).toContainText('Complete nombre, DNI y rol');
  });

  test('alta de conjunto: POST /componentes y queda elegido en la parte', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    const comps = MAQ.componentes.map((c) => ({ ...c }));
    await page.route(/\/api\/maquinas\/MAQ-001$/, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...MAQ, componentes: comps }) })
    );
    await page.route(/\/api\/maquinas\/[^/]+\/componentes$/, (route) => {
      const b = JSON.parse(route.request().postData() || '{}');
      comps.push({ id: 77, nombre: b.nombre, seccion: b.seccion || '' });
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 77, message: 'Componente agregado' }) });
    });
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await page.click('button:has-text("+ Registrar mantenimiento")');

    await expect(page.locator('#qr-nuevo-conjunto-0')).toBeHidden();
    await page.selectOption('#qr-parte-sel-0', '__nuevo');
    await expect(page.locator('#qr-nuevo-conjunto-0')).toBeVisible();
    await page.fill('#qr-nc-nombre-0', 'Bancada auxiliar');

    const reqPromise = page.waitForRequest((r) => /\/api\/maquinas\/MAQ-001\/componentes$/.test(r.url()) && r.method() === 'POST');
    await page.click('#qr-nuevo-conjunto-0 button:has-text("Crear")');
    expect(JSON.parse((await reqPromise).postData() || '{}')).toMatchObject({ nombre: 'Bancada auxiliar' });
    await expect(page.locator('#qr-parte-sel-0')).toHaveValue('77');
    await expect(page.locator('#qr-nuevo-conjunto-0')).toBeHidden();
  });

  test('alta de conjunto sin nombre avisa', async ({ page }) => {
    await openFormRegistro(page);
    await page.selectOption('#qr-parte-sel-0', '__nuevo');
    await page.click('#qr-nuevo-conjunto-0 button:has-text("Crear")');
    await expect(page.locator('.toast-error')).toContainText('Escriba el nombre del conjunto');
  });

  test('alta de repuesto: POST con codigo/Hauni, queda elegido y con referencia', async ({ page }) => {
    await mockApi(page);
    await seedSession(page, 'admin');
    const reps = FIXTURES.componenteRepuestos.map((r) => ({ ...r }));
    await page.route(/\/api\/maquinas\/[^/]+\/componentes\/\d+\/repuestos$/, (route) => {
      if (route.request().method() === 'POST') {
        const b = JSON.parse(route.request().postData() || '{}');
        reps.push({ codigo: b.codigo, descripcion: b.descripcion, nro_hauni: b.nro_hauni });
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
      } else {
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(reps) });
      }
    });
    await page.goto(`/qr.html?maquina=${MAQ.id}`);
    await page.click('button:has-text("+ Registrar mantenimiento")');

    const respPromise = page.waitForResponse((r) => r.url().includes('/componentes/1/repuestos'));
    await page.selectOption('#qr-parte-sel-0', '1');
    await respPromise;
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    const row = page.locator('#qr-rep-0-0');
    await expect(row.locator('.qr-nuevo-rep')).toBeHidden();
    await row.locator('.repuesto-row select').first().selectOption('__nuevo');
    await expect(row.locator('.qr-nuevo-rep')).toBeVisible();
    await row.locator('.nr-desc').fill('Sensor inductivo M12');
    await row.locator('.nr-codigo').fill('SEN-001');
    await row.locator('.nr-hauni').fill('H-9999');

    const reqPromise = page.waitForRequest((r) => /\/componentes\/1\/repuestos$/.test(r.url()) && r.method() === 'POST');
    await row.locator('.qr-nuevo-rep button:has-text("Crear")').click();
    expect(JSON.parse((await reqPromise).postData() || '{}')).toEqual({ codigo: 'SEN-001', descripcion: 'Sensor inductivo M12', nro_hauni: 'H-9999' });
    await expect(row.locator('.repuesto-row select').first()).toHaveValue('SEN-001');
    await expect(row.locator('.qr-nuevo-rep')).toBeHidden();
    await expect(row.locator('.ref-sel')).toBeVisible();
    await expect(row.locator('.ref-sel')).toContainText('Hauni: H-9999');
  });

  test('alta de repuesto sin codigo avisa', async ({ page }) => {
    await openFormRegistro(page);
    const respPromise = page.waitForResponse((r) => r.url().includes('/componentes/1/repuestos'));
    await page.selectOption('#qr-parte-sel-0', '1');
    await respPromise;
    await page.click('#qr-parte-0 button:has-text("+ Agregar repuesto")');
    const row = page.locator('#qr-rep-0-0');
    await row.locator('.repuesto-row select').first().selectOption('__nuevo');
    await row.locator('.nr-desc').fill('Solo descripcion');
    await row.locator('.qr-nuevo-rep button:has-text("Crear")').click();
    await expect(page.locator('.toast-error')).toContainText('Complete descripcion y Nº de pieza');
  });
});
