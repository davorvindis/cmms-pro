/**
 * Shared test helpers for CMMS Playwright tests.
 *
 * Every test that needs the app in a logged-in state should call
 * `mockApi(page)` first, then `loginAs(page, ...)`.
 *
 * API route structure (mirroring backoffice.html and qr.html):
 *   POST /api/auth/login
 *   GET  /api/dashboard/stats
 *   GET  /api/dashboard/alertas
 *   GET  /api/dashboard/actividad
 *   GET  /api/maquinas
 *   POST /api/maquinas
 *   GET  /api/maquinas/:id
 *   GET  /api/maquinas/:id/registros
 *   GET  /api/registros
 *   POST /api/registros
 *   GET  /api/repuestos
 *   POST /api/repuestos
 *   GET  /api/usuarios
 *   GET  /api/usuarios?rol=Tecnico
 */

const API = 'http://localhost:8080/api';

/** Canonical fixture data shared between both HTML files. */
const FIXTURES = {
  users: {
    admin: { id: 'admin', nombre: 'Admin Beto', rol: 'Administrador', estado: 'Activo' },
    dataEntry: { id: 'maciel', nombre: 'Maciel Entry', rol: 'Data Entry', estado: 'Activo' },
    tecnico1: { id: 'tec01', nombre: 'Carlos Gomez', rol: 'Tecnico', estado: 'Activo' },
    tecnico2: { id: 'tec02', nombre: 'Roberto Silva', rol: 'Tecnico', estado: 'Activo' },
  },

  maquinas: [
    {
      id: 'MAQ-001',
      nombre: 'Turbina Principal',
      ubicacion: 'Planta Principal - Nave 1',
      estado: 'Operativo',
      serie: 'T-001',
      frecuencia_mantenimiento: 'Trimestral',
      ultimo_mantenimiento: '2026-01-15',
      proximo_mantenimiento: '2026-04-15',
      componentes: [
        { id: 1, nombre: 'Turbina' },
        { id: 2, nombre: 'Motor principal' },
        { id: 3, nombre: 'Rodamiento delantero' },
        { id: 4, nombre: 'Correa de transmision' },
      ],
    },
    {
      id: 'MAQ-002',
      nombre: 'Compresor Norte',
      ubicacion: 'Planta Norte - Nave 2',
      estado: 'Mant. vencido',
      serie: null,
      frecuencia_mantenimiento: 'Mensual',
      ultimo_mantenimiento: '2026-02-01',
      proximo_mantenimiento: '2026-03-01',
      componentes: [
        { id: 5, nombre: 'Compresor' },
        { id: 6, nombre: 'Ventilador' },
      ],
    },
  ],

  repuestos: [
    { codigo: 'ROD-001', descripcion: 'Rodamiento 6205-2RS SKF', categoria: 'Rodamientos', stock_actual: 5, stock_minimo: 3 },
    { codigo: 'ROD-002', descripcion: 'Rodamiento 6208-2RS SKF', categoria: 'Rodamientos', stock_actual: 2, stock_minimo: 3 },
    { codigo: 'COR-001', descripcion: 'Correa A-42 Gates', categoria: 'Correas y Transmision', stock_actual: 4, stock_minimo: 2 },
    { codigo: 'LUB-001', descripcion: 'Grasa Shell Alvania EP2', categoria: 'Lubricantes', stock_actual: 8, stock_minimo: 5 },
  ],

  dashboardStats: {
    maquinas_activas: 5,
    mantenimientos_pendientes: 3,
    maquinas_vencidas: 1,
    registros_este_mes: 23,
    repuestos_stock_bajo: 2,
  },

  registros: [
    {
      id: 101,
      fecha: '2026-04-20 09:30:00',
      maquina_nombre: 'Turbina Principal',
      tipo: 'Preventivo',
      tecnico_nombre: 'Carlos Gomez',
      registrado_por_nombre: 'Maciel Entry',
      componentes: [
        {
          componente_nombre: 'Turbina',
          trabajo_realizado: 'Revision general',
          repuestos: [{ repuesto_descripcion: 'Rodamiento 6205-2RS SKF', cantidad: 2 }],
        },
      ],
    },
  ],
};

/**
 * Register `page.route` intercepts for every API endpoint the apps call.
 * Must be called BEFORE navigating to a page.
 *
 * @param {import('@playwright/test').Page} page
 */
async function mockApi(page) {
  // Auth
  await page.route(`${API}/auth/login`, async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    const user = Object.values(FIXTURES.users).find(
      (u) => u.id === body.id && body.pin === '1234'
    );
    if (user) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    } else {
      await route.fulfill({ status: 401, body: 'Unauthorized' });
    }
  });

  // Dashboard
  await page.route(`${API}/dashboard/stats`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.dashboardStats) })
  );
  await page.route(`${API}/dashboard/alertas`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        { tipo: 'mantenimiento_vencido', descripcion: 'Compresor Norte — mant. vencido desde 01/03/2026' },
        { tipo: 'stock_bajo', descripcion: 'Rodamiento 6208-2RS SKF — stock bajo (2 / min 3)' },
      ]),
    })
  );
  await page.route(`${API}/dashboard/actividad`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        { tecnico_nombre: 'Carlos Gomez', tipo: 'Preventivo', maquina_nombre: 'Turbina Principal', componentes: 2, repuestos: 3, fecha: '20/04/2026 09:30hs' },
      ]),
    })
  );

  // Maquinas list
  await page.route(`${API}/maquinas`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      if (!body.id || !body.nombre || !body.ubicacion) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Faltan campos' }) });
      } else {
        const newMaq = {
          ...body,
          estado: 'Operativo',
          ultimo_mantenimiento: null,
          proximo_mantenimiento: null,
          componentes: (body.componentes || []).map((nombre, i) => ({ id: 100 + i, nombre })),
        };
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newMaq) });
      }
    } else {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.maquinas) });
    }
  });

  // Single maquina (GET /maquinas/:id)
  await page.route(/\/api\/maquinas\/([^/]+)$/, async (route) => {
    const url = route.request().url();
    const id = url.split('/').pop();
    const maq = FIXTURES.maquinas.find((m) => m.id === id) || FIXTURES.maquinas[0];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(maq) });
  });

  // Maquina registros (GET /maquinas/:id/registros)
  await page.route(/\/api\/maquinas\/[^/]+\/registros/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.registros) })
  );

  // Registros list + create
  await page.route(`${API}/registros`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999 }) });
    } else {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.registros) });
    }
  });

  // Repuestos list + create
  await page.route(`${API}/repuestos`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      if (!body.codigo || !body.descripcion) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Faltan campos' }) });
      } else {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...body, id: 50 }) });
      }
    } else {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.repuestos) });
    }
  });

  // Usuarios (all roles and filtered by Tecnico)
  await page.route(/\/api\/usuarios/, (route) => {
    const url = route.request().url();
    const rol = new URL(url).searchParams.get('rol');
    const users = Object.values(FIXTURES.users);
    const filtered = rol ? users.filter((u) => u.rol === rol) : users;
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(filtered) });
  });
}

/**
 * Seed localStorage with a valid session, bypassing the login form.
 * Use this to start tests already authenticated without going through the UI.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'admin'|'dataEntry'|'tecnico1'} role
 */
async function seedSession(page, role = 'admin') {
  const user = FIXTURES.users[role];
  await page.addInitScript(
    ({ user, pin }) => {
      localStorage.setItem('cmms_user', JSON.stringify(user));
      localStorage.setItem('cmms_pin', pin);
    },
    { user, pin: '1234' }
  );
}

module.exports = { mockApi, seedSession, FIXTURES, API };
