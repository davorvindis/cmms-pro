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
 *   GET  /api/maquinas/:id/tareas
 *   GET  /api/registros
 *   POST /api/registros
 *   GET  /api/repuestos
 *   POST /api/repuestos
 *   GET  /api/tareas
 *   POST /api/tareas
 *   PUT  /api/tareas/:id
 *   GET  /api/usuarios
 *   GET  /api/usuarios?rol=Tecnico
 */

const API = 'http://localhost:8080/api';

/** Canonical fixture data shared between both HTML files. */
const FIXTURES = {
  users: {
    admin: { id: 'admin', nombre: 'Admin Beto', rol: 'Administrador', estado: 'Activo', puede_ingresar: false },
    dataEntry: { id: 'maciel', nombre: 'Maciel Entry', rol: 'Data Entry', estado: 'Activo', puede_ingresar: false },
    tecnico1: { id: 'tec01', nombre: 'Carlos Gomez', rol: 'Tecnico', estado: 'Activo', puede_ingresar: false },
    tecnico2: { id: 'tec02', nombre: 'Roberto Silva', rol: 'Tecnico', estado: 'Activo', puede_ingresar: false },
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
    { codigo: 'ROD-001', descripcion: 'Rodamiento 6205-2RS SKF', categoria: 'Rodamientos', disciplina: 'Mecanico', stock_actual: 5, stock_minimo: 3 },
    { codigo: 'ROD-002', descripcion: 'Rodamiento 6208-2RS SKF', categoria: 'Rodamientos', disciplina: 'Mecanico', stock_actual: 2, stock_minimo: 3 },
    { codigo: 'COR-001', descripcion: 'Correa A-42 Gates', categoria: 'Correas y Transmision', disciplina: 'Mecanico', stock_actual: 4, stock_minimo: 2 },
    { codigo: 'LUB-001', descripcion: 'Grasa Shell Alvania EP2', categoria: 'Lubricantes', disciplina: 'Electrico', stock_actual: 8, stock_minimo: 5 },
  ],

  tareas: [
    { id: 1, maquina_id: 'MAQ-001', nombre: 'Inspeccion y limpieza Gral. Tableros', descripcion: null, tiempo_estimado_min: 60, frecuencia: 'Mensual', asignado_id: 'tec01', asignado_nombre: 'Carlos Gomez', orden: 1, activa: true, ultima_ejecucion: '2026-04-20 09:30', proxima_fecha: '2026-05-20', estado: 'vencida' },
    { id: 2, maquina_id: 'MAQ-001', nombre: 'Control tablero operador', descripcion: 'botones, lamparas, torqueado', tiempo_estimado_min: 45, frecuencia: 'Mensual', asignado_id: null, asignado_nombre: null, orden: 2, activa: true, ultima_ejecucion: null, proxima_fecha: null, estado: 'nunca' },
    { id: 3, maquina_id: 'MAQ-002', nombre: 'Inspeccion de iluminacion Gral.', descripcion: null, tiempo_estimado_min: 45, frecuencia: 'Trimestral', asignado_id: null, asignado_nombre: null, orden: 1, activa: false, ultima_ejecucion: null, proxima_fecha: null, estado: 'nunca' },
  ],

  mantenimientos: [
    {
      id: 1, maquina_id: 'MAQ-001', maquina_nombre: 'Turbina Principal',
      titulo: 'Mantenimiento VE serie 989', horas_marcha: '6.222 hs', horas_turbinas: '7.724 hs',
      estado: 'Pendiente', creado_por_id: 'admin', creado_por_nombre: 'Admin Beto',
      fecha_completado: null, registro_id: null, created_at: '2026-08-10 09:00',
      items: [
        { id: 11, componente_id: 1, componente_nombre: 'Turbina', seccion: '', tarea: 'limpieza', novedades: null, mecanico_id: null, mecanico_nombre: null, fecha: null, orden: 1 },
        { id: 12, componente_id: 2, componente_nombre: 'Motor principal', seccion: '', tarea: 'control de correas', novedades: null, mecanico_id: null, mecanico_nombre: null, fecha: null, orden: 2 },
      ],
    },
    {
      id: 2, maquina_id: 'MAQ-002', maquina_nombre: 'Compresor Norte',
      titulo: 'Mantenimiento compresor', horas_marcha: null, horas_turbinas: null,
      estado: 'Completado', creado_por_id: 'admin', creado_por_nombre: 'Admin Beto',
      fecha_completado: '2026-08-01 10:00', registro_id: 101, created_at: '2026-07-28 09:00',
      items: [
        { id: 21, componente_id: 5, componente_nombre: 'Compresor', seccion: '', tarea: 'lubricacion', novedades: 'ok', mecanico_id: 'tec01', mecanico_nombre: 'Carlos Gomez', fecha: '2026-08-01', orden: 1 },
      ],
    },
  ],

  dashboardStats: {
    maquinas_activas: 5,
    mantenimientos_pendientes: 3,
    maquinas_vencidas: 1,
    registros_este_mes: 23,
    repuestos_stock_bajo: 2,
    tareas_vencidas: 3,
    mantenimientos_planificados_pendientes: 1,
  },

  auditoria: [
    { id: 2, fecha: '2026-08-12 10:05', usuario_id: 'admin', usuario_nombre: 'Admin Beto', metodo: 'PUT', ruta: '/api/repuestos/ROD-001', entidad: 'repuestos', detalle: '{"stock_actual":9}' },
    { id: 1, fecha: '2026-08-12 10:00', usuario_id: 'maciel', usuario_nombre: 'Maciel Entry', metodo: 'POST', ruta: '/api/registros', entidad: 'registros', detalle: '{"maquina_id":"MAQ-001"}' },
  ],

  registros: [
    {
      id: 101,
      fecha: '2026-04-20 09:30:00',
      maquina_nombre: 'Turbina Principal',
      tipo: 'Preventivo',
      tecnico_nombre: 'Carlos Gomez',
      registrado_por_nombre: 'Maciel Entry',
      observaciones: 'Cinta lateral gastada, pedir repuesto',
      tareas: [{ tarea_id: 1, tarea_nombre: 'Inspeccion tableros', resultados: ['Realizado', 'Ajustado'], observacion: null }],
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

  // Alta de componente/conjunto (POST /maquinas/:id/componentes)
  await page.route(/\/api\/maquinas\/[^/]+\/componentes$/, (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 77, message: 'Componente agregado' }) });
    } else {
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    }
  });

  // Update / delete de un conjunto puntual
  await page.route(/\/api\/maquinas\/[^/]+\/componentes\/\d+$/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) })
  );

  // Repuesto puntual (GET/PUT/DELETE /repuestos/:codigo)
  await page.route(/\/api\/repuestos\/[^/?]+$/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) })
  );

  // Registro puntual (DELETE /registros/:id)
  await page.route(/\/api\/registros\/\d+$/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) })
  );

  // Auditoria
  await page.route(/\/api\/auditoria/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.auditoria) })
  );

  // Maquina registros (GET /maquinas/:id/registros)
  await page.route(/\/api\/maquinas\/[^/]+\/registros/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.registros) })
  );

  // Maquina tareas (GET /maquinas/:id/tareas) — publica, solo activas
  await page.route(/\/api\/maquinas\/([^/]+)\/tareas/, (route) => {
    const m = route.request().url().match(/maquinas\/([^/]+)\/tareas/);
    const items = FIXTURES.tareas.filter((t) => t.maquina_id === m[1] && t.activa);
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(items) });
  });

  // Maquina mantenimientos pendientes (GET /maquinas/:id/mantenimientos) — publica
  await page.route(/\/api\/maquinas\/([^/]+)\/mantenimientos/, (route) => {
    const m = route.request().url().match(/maquinas\/([^/]+)\/mantenimientos/);
    const url = new URL(route.request().url());
    const estado = url.searchParams.get('estado');
    const items = FIXTURES.mantenimientos.filter(
      (x) => x.maquina_id === m[1] && (!estado || x.estado === estado)
    );
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(items) });
  });

  // Mantenimientos list + create
  await page.route(`${API}/mantenimientos`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 99, message: 'Mantenimiento creado' }) });
    } else {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.mantenimientos) });
    }
  });

  // Mantenimiento get/update + completar
  await page.route(/\/api\/mantenimientos\/\d+$/, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.mantenimientos[0]) });
    } else {
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
    }
  });
  await page.route(/\/api\/mantenimientos\/\d+\/completar$/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'Mantenimiento completado', registro_id: 999 }) })
  );

  // Sugerencias de tareas para el datalist
  await page.route(`${API}/tareas-sugeridas`, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(['limpieza', 'control de correas', 'lubricacion']) })
  );

  // Tareas list + create
  await page.route(`${API}/tareas`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 99, message: 'Tarea creada' }) });
    } else {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(FIXTURES.tareas) });
    }
  });

  // Tarea update / delete
  await page.route(/\/api\/tareas\/\d+$/, (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) })
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
