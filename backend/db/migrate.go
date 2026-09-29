package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
	"strings"
)

//go:embed migrations/001_create_tables_sqlite.sql
var sqliteMigration string

//go:embed migrations/001_create_tables.sql
var sqlserverMigration string

//go:embed migrations/002_tareas_sqlite.sql
var sqliteMigration002 string

//go:embed migrations/002_tareas.sql
var sqlserverMigration002 string

//go:embed migrations/003_mantenimientos_sqlite.sql
var sqliteMigration003 string

//go:embed migrations/003_mantenimientos.sql
var sqlserverMigration003 string

//go:embed migrations/004_auditoria_sqlite.sql
var sqliteMigration004 string

//go:embed migrations/004_auditoria.sql
var sqlserverMigration004 string

//go:embed migrations/005_auditoria_v2_sqlite.sql
var sqliteMigration005 string

//go:embed migrations/005_auditoria_v2.sql
var sqlserverMigration005 string

// migration es una migracion versionada con su SQL por dialecto.
type migration struct {
	version string
	sqlite  string
	mssql   string
}

var migrationsList = []migration{
	{"001_create_tables", sqliteMigration, sqlserverMigration},
	{"002_tareas", sqliteMigration002, sqlserverMigration002},
	{"003_mantenimientos", sqliteMigration003, sqlserverMigration003},
	{"004_auditoria", sqliteMigration004, sqlserverMigration004},
	{"005_auditoria_v2", sqliteMigration005, sqlserverMigration005},
}

func Migrate(database *sql.DB, dialect Dialect) {
	ensureSchemaMigrations(database, dialect)

	for _, m := range migrationsList {
		if migrationApplied(database, dialect, m.version) {
			continue
		}
		sqlText := m.mssql
		if dialect.Type == SQLite {
			sqlText = m.sqlite
		}
		for _, stmt := range splitStatements(sqlText) {
			if _, err := database.Exec(stmt); err != nil {
				// Primera corrida con SchemaMigrations sobre una DB existente
				// (prod ya tiene 001-004): los CREATE fallan con "already
				// exists" y se tolera SOLO ese error, para poder registrar la
				// version y seguir. Cualquier otro error aborta el arranque.
				if isAlreadyExists(err) {
					continue
				}
				log.Fatalf("Migracion %s fallo en: %.80s...\nError: %v", m.version, stmt, err)
			}
		}
		if err := registerMigration(database, dialect, m.version); err != nil {
			log.Fatalf("Migracion %s aplicada pero no se pudo registrar en SchemaMigrations: %v", m.version, err)
		}
		fmt.Printf("Migracion %s aplicada\n", m.version)
	}

	// Columnas agregadas despues del release inicial: los CREATE TABLE IF NOT
	// EXISTS no alteran tablas existentes (Turso en prod), hay que ALTERarlas.
	ensureColumn(database, dialect, "Repuestos", "disciplina",
		"TEXT NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico'))",
		"NVARCHAR(10) NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico'))")

	// Disciplina transversal (absorcion app Electronica, 2026-09). Mismo
	// vocabulario que Repuestos; Usuarios ademas admite 'Ambas'.
	if ensureColumn(database, dialect, "Usuarios", "disciplina",
		"TEXT NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico', 'Ambas'))",
		"NVARCHAR(10) NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico', 'Ambas'))") {
		// Los admins existentes ven todo por defecto
		if _, err := database.Exec("UPDATE Usuarios SET disciplina = 'Ambas' WHERE rol = 'Administrador'"); err != nil {
			log.Printf("backfill Usuarios.disciplina admin: %v", err)
		}
	}
	for _, table := range []string{"Tareas", "Mantenimientos", "Registros"} {
		ensureColumn(database, dialect, table, "disciplina",
			"TEXT NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico'))",
			"NVARCHAR(10) NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico'))")
	}

	// Campos de electronica en Maquinas (familia PLC, HMI, estado HMI, doc)
	ensureColumn(database, dialect, "Maquinas", "plc", "TEXT", "NVARCHAR(100) NULL")
	ensureColumn(database, dialect, "Maquinas", "hmi", "TEXT", "NVARCHAR(100) NULL")
	ensureColumn(database, dialect, "Maquinas", "hmi_estado",
		"TEXT CHECK (hmi_estado IS NULL OR hmi_estado IN ('Vigente', 'Obsoleto', 'Pendiente de actualizacion', 'Desconocido'))",
		"NVARCHAR(100) NULL CHECK (hmi_estado IS NULL OR hmi_estado IN ('Vigente', 'Obsoleto', 'Pendiente de actualizacion', 'Desconocido'))")
	ensureColumn(database, dialect, "Maquinas", "doc_url", "TEXT", "NVARCHAR(500) NULL")

	// pin guarda hash bcrypt (60 chars): la columna original mssql era
	// NVARCHAR(10) y el backfill fallaba silenciosamente ("would be truncated").
	ensurePinLength(database, dialect)

	fmt.Println("Database migration completed")
}

// ensureSchemaMigrations crea la tabla de versiones si no existe.
func ensureSchemaMigrations(database *sql.DB, dialect Dialect) {
	var ddl string
	if dialect.Type == SQLite {
		ddl = `CREATE TABLE IF NOT EXISTS SchemaMigrations (
			version    TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		)`
	} else {
		ddl = `IF OBJECT_ID('SchemaMigrations', 'U') IS NULL
		CREATE TABLE SchemaMigrations (
			version    NVARCHAR(50) PRIMARY KEY,
			applied_at DATETIME2 NOT NULL DEFAULT GETDATE()
		)`
	}
	if _, err := database.Exec(ddl); err != nil {
		log.Fatalf("No se pudo crear SchemaMigrations: %v", err)
	}
}

func migrationApplied(database *sql.DB, dialect Dialect, version string) bool {
	var count int
	query := "SELECT COUNT(*) FROM SchemaMigrations WHERE version = " + dialect.Param(1)
	if err := database.QueryRow(query, version).Scan(&count); err != nil {
		log.Fatalf("No se pudo consultar SchemaMigrations: %v", err)
	}
	return count > 0
}

func registerMigration(database *sql.DB, dialect Dialect, version string) error {
	query := "INSERT INTO SchemaMigrations (version) VALUES (" + dialect.Param(1) + ")"
	_, err := database.Exec(query, version)
	return err
}

// ensurePinLength amplia Usuarios.pin en SQL Server si quedo con el largo
// original (sqlite es TEXT, no aplica). Corre antes de security.BackfillPins.
func ensurePinLength(database *sql.DB, dialect Dialect) {
	if dialect.Type == SQLite {
		return
	}
	var maxLen int
	if err := database.QueryRow("SELECT max_length FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'pin'").Scan(&maxLen); err != nil {
		log.Printf("ensurePinLength: check failed: %v", err)
		return
	}
	if maxLen < 0 || maxLen >= 200 { // -1 = MAX; NVARCHAR(100) = 200 bytes
		return
	}
	if _, err := database.Exec("ALTER TABLE Usuarios ALTER COLUMN pin NVARCHAR(100) NOT NULL"); err != nil {
		log.Printf("ensurePinLength: alter failed: %v", err)
		return
	}
	fmt.Println("Usuarios.pin ampliado a NVARCHAR(100)")
}

// isAlreadyExists detecta errores benignos de re-ejecucion de DDL.
func isAlreadyExists(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already an object named") || // mssql tabla
		strings.Contains(msg, "already exists") || // mssql indice / sqlite
		strings.Contains(msg, "duplicate column") || // sqlite columna
		strings.Contains(msg, "column names in each table must be unique") // mssql columna
}

// ensureColumn agrega una columna a una tabla existente si todavia no esta.
// Devuelve true solo cuando la columna se creo en esta corrida (para backfills).
func ensureColumn(database *sql.DB, dialect Dialect, table, column, sqliteDef, mssqlDef string) bool {
	var count int
	var checkQuery, alterStmt string
	if dialect.Type == SQLite {
		checkQuery = fmt.Sprintf("SELECT COUNT(*) FROM pragma_table_info('%s') WHERE name = '%s'", table, column)
		alterStmt = fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, sqliteDef)
	} else {
		checkQuery = fmt.Sprintf("SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('%s') AND name = '%s'", table, column)
		alterStmt = fmt.Sprintf("ALTER TABLE %s ADD %s %s", table, column, mssqlDef)
	}

	if err := database.QueryRow(checkQuery).Scan(&count); err != nil {
		log.Printf("ensureColumn %s.%s: check failed: %v", table, column, err)
		return false
	}
	if count > 0 {
		return false
	}
	if _, err := database.Exec(alterStmt); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate column") {
			return false
		}
		log.Printf("ensureColumn %s.%s: alter failed: %v", table, column, err)
		return false
	}
	return true
}

// splitStatements splits SQL text on semicolons, handling multi-line statements.
func splitStatements(sql string) []string {
	var result []string
	for _, raw := range strings.Split(sql, ";") {
		stmt := strings.TrimSpace(raw)
		if stmt == "" {
			continue
		}
		// Strip leading comment-only lines
		lines := strings.Split(stmt, "\n")
		var cleaned []string
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || strings.HasPrefix(trimmed, "--") {
				continue
			}
			cleaned = append(cleaned, line)
		}
		if len(cleaned) > 0 {
			result = append(result, strings.Join(cleaned, "\n"))
		}
	}
	return result
}
