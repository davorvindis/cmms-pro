#!/usr/bin/env python3
"""Genera seed.sql desde "Planilla Protos 100 ESPERT.xlsx".

Modelo: una sola maquina (PROTOS-100) con secciones (VE 100 / SE 100 / MAX 100),
cada seccion con sus conjuntos (tabla Componentes) y cada conjunto con sus
repuestos (tabla ComponenteRepuestos). Cuando una pieza tiene Nº de pieza y
Nº Hauni, el primero va en Repuestos.codigo y el segundo en Repuestos.nro_hauni.
"""
import zipfile, re, unicodedata
from xml.etree import ElementTree as ET

XLSX = '/Users/davorvindis/Downloads/Planilla Protos 100 ESPERT.xlsx'
OUT = '/Users/davorvindis/Desktop/TabacaleraEspert/Produccion/cmms/backend/db/seed/seed.sql'
M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

MAQUINA_ID = 'PROTOS-100'
MAQUINA_NOMBRE = 'Protos 100 - Fabricadora de cigarrillos'
MAQUINA_SERIE = 'VE/SE 989 - MAX 3227'
UBICACION = 'Planta - Sector Produccion'

SECCIONES = [
    # (sheet idx, seccion)
    (1, 'VE 100'),
    (2, 'SE 100'),
    (3, 'MAX 100'),
]

CAT_RULES = [
    ('Neumatica', ['cilindro neumatico', 'festo', 'valvula', 'aire comprimido', 'venturi',
                   'silenciador', 'manguera', 'racor', 'regulador de presion', 'neumatic']),
    ('Rodamientos', ['rodamiento', 'ruleman', 'pista de rodamiento', 'rodamientos', 'axial']),
    ('Sellos y Retenes', ['reten', 'sello', "o'ring", 'oring', 'o-ring', 'junta', 'guardapolvo',
                          'fuelle', 'empaquetadura']),
    ('Correas y Transmision', ['correa', 'polea', 'engranaje', 'cadena', 'pinon', 'cremallera',
                               'tensor', 'dentada', 'transmision']),
    ('Resortes', ['resorte', 'amortiguador', 'ballesta']),
    ('Cuchillas y Corte', ['cuchilla', 'afilador', 'piedra de afilar', 'rascador', 'widia', 'rasador']),
    ('Lubricantes', ['grasa', 'aceite', 'lubric']),
    ('Turbina', ['turbina']),
    ('Ventilacion', ['ventilador', 'aspa ', 'soplador']),
    ('Filtros', ['filtro de aire', 'filtro de aceite', 'filtro regulador']),
    ('Electricidad', ['motor', 'sensor', 'fotocelula', 'encoder', 'cable', 'lampara',
                      'solenoide', 'micro switch', 'electrico']),
]

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

def categoria(desc):
    d = strip_accents(desc.lower())
    for cat, kws in CAT_RULES:
        for kw in kws:
            if kw in d:
                return cat
    return 'Mecanica General'

def q(s):
    return "'" + s.replace("'", "''") + "'"

def qn(s):
    return q(s) if s else 'NULL'

def norm_ws(s):
    # sin ';': el runner del seed corta los statements por punto y coma
    return re.sub(r'\s+', ' ', s.replace(';', ',')).strip()

z = zipfile.ZipFile(XLSX)
sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
SS = [''.join(t.text or '' for t in si.iter(M + 't')) for si in sst.iter(M + 'si')]

def read_sheet(i):
    root = ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
    rows = []
    for row in root.iter(M + 'row'):
        cells = {}
        for c in row.iter(M + 'c'):
            v = c.find(M + 'v')
            val = v.text if v is not None else ''
            if c.get('t') == 's' and val != '':
                val = SS[int(val)]
            col = ''.join(ch for ch in c.get('r') if ch.isalpha())
            cells[col] = norm_ws(str(val))
        rows.append(cells)
    return rows

# ---- parse ----
repuestos = {}        # dedup_key -> {codigo, nro_hauni, descripcion, categoria}
links = {}            # (seccion, conjunto, dedup_key) -> cantidad(str)
conjuntos = {}        # seccion -> [conjunto...]
warn = []
gen_seq = {}

def dedup_key(codigo):
    return re.sub(r'[^A-Z0-9]', '', codigo.upper())

for sheet_i, seccion in SECCIONES:
    conjunto = None
    conjuntos[seccion] = []
    last_desc = None
    for cells in read_sheet(sheet_i):
        B, C, D, E, F = (cells.get(k, '') for k in 'BCDEF')
        if not any([B, C, D, E]):
            continue
        if C.upper().startswith('LISTA') or B.upper().startswith('LISTA'):
            continue
        if B == 'Nº' or C.upper() in ('DESCRIPCION', 'DESCRIPCIÓN'):
            continue
        if 'CONJUNTO' in strip_accents(C.upper()) and not B:
            conjunto = C[:100]
            conjuntos[seccion].append(conjunto)
            last_desc = None
            continue
        if not B:
            continue  # fila suelta sin numero de item
        if conjunto is None:
            conjunto = 'General'
            conjuntos[seccion].append(conjunto)
        desc = C or last_desc
        if not desc:
            warn.append(f'{seccion} fila {B}: sin descripcion ni anterior, salteada')
            continue
        last_desc = desc
        codigo = D or E
        hauni = E if (D and E) else ''
        if not codigo:
            gen_seq[seccion] = gen_seq.get(seccion, 0) + 1
            codigo = f'{seccion.replace(" ", "")}-SN{gen_seq[seccion]:03d}'
        codigo = norm_ws(codigo)[:50]
        hauni = norm_ws(hauni)[:50]
        key = dedup_key(codigo)
        if key not in repuestos:
            repuestos[key] = {'codigo': codigo, 'nro_hauni': hauni,
                              'descripcion': desc[:200], 'categoria': categoria(desc)}
        elif hauni and not repuestos[key]['nro_hauni']:
            repuestos[key]['nro_hauni'] = hauni
        lk = (seccion, conjunto, key)
        if lk in links:
            a, b = links[lk], F or '1'
            try:
                links[lk] = str(int(a) + int(b))
            except ValueError:
                pass  # cantidades no numericas: se queda la primera
        else:
            links[lk] = F or '1'

for sec, lst in conjuntos.items():
    dups = {x for x in lst if lst.count(x) > 1}
    if dups:
        warn.append(f'{sec} conjuntos duplicados: {dups}')

# ---- emit ----
L = []
L.append('-- CMMS Pro - Seed Data')
L.append('-- Generado desde "Planilla Protos 100 ESPERT.xlsx" (maquina Hauni Protos 100)')
L.append('')
L.append('-- Usuarios (login por DNI, PIN inicial 000000)')
L.append("INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('admin', 'Administrador', 'Administrador', '1234');")
L.append("INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('23526066', 'Marcelo Maciel', 'Data Entry', '000000');")
L.append("INSERT INTO Usuarios (id, nombre, rol, pin) VALUES ('30102815', 'Gonzalo Gonzalez', 'Tecnico', '000000');")
L.append('')
L.append('-- Maquina')
L.append(f"INSERT INTO Maquinas (id, nombre, ubicacion, serie) VALUES ({q(MAQUINA_ID)}, {q(MAQUINA_NOMBRE)}, {q(UBICACION)}, {q(MAQUINA_SERIE)});")
L.append('')
for _, sec in SECCIONES:
    L.append(f'-- Conjuntos seccion {sec}')
    for cj in conjuntos[sec]:
        L.append(f'INSERT INTO Componentes (nombre, seccion, maquina_id) VALUES ({q(cj)}, {q(sec)}, {q(MAQUINA_ID)});')
    L.append('')
L.append('-- Repuestos')
for r in repuestos.values():
    L.append(f"INSERT INTO Repuestos (codigo, descripcion, nro_hauni, categoria) VALUES ({q(r['codigo'])}, {q(r['descripcion'])}, {qn(r['nro_hauni'])}, {q(r['categoria'])});")
L.append('')
L.append('-- Repuestos por conjunto')
for (sec, cj, key), cant in links.items():
    r = repuestos[key]
    L.append(
        'INSERT INTO ComponenteRepuestos (componente_id, repuesto_codigo, cantidad) '
        f'SELECT id, {q(r["codigo"])}, {q(cant)} FROM Componentes '
        f'WHERE maquina_id = {q(MAQUINA_ID)} AND seccion = {q(sec)} AND nombre = {q(cj)};'
    )
L.append('')

open(OUT, 'w', encoding='utf-8').write('\n'.join(L))

from collections import Counter
cats = Counter(r['categoria'] for r in repuestos.values())
con_hauni = sum(1 for r in repuestos.values() if r['nro_hauni'])
print(f'repuestos unicos: {len(repuestos)} (con ambos codigos: {con_hauni})')
print(f'links: {len(links)}')
for sec, lst in conjuntos.items():
    print(f'{sec}: {len(lst)} conjuntos')
print('categorias:', dict(cats.most_common()))
print('codigos generados:', gen_seq)
print('--- warnings ---')
for w in warn:
    print(' !', w)
