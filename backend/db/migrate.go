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

func Migrate(database *sql.DB, dialect Dialect) {
	var migration string
	if dialect.Type == SQLite {
		migration = sqliteMigration + "\n;\n" + sqliteMigration002 + "\n;\n" + sqliteMigration003
	} else {
		migration = sqlserverMigration + "\n;\n" + sqlserverMigration002 + "\n;\n" + sqlserverMigration003
	}

	for _, stmt := range splitStatements(migration) {
		if _, err := database.Exec(stmt); err != nil {
			// SQL Server no tiene IF NOT EXISTS en CREATE TABLE/INDEX: sobre una
			// DB existente esos statements fallan y hay que seguir de largo para
			// que corran las migraciones nuevas y ensureColumn.
			if isAlreadyExists(err) {
				continue
			}
			log.Printf("Migration error on: %.80s...\nError: %v", stmt, err)
			return
		}
	}

	// Columnas agregadas despues del release inicial: los CREATE TABLE IF NOT
	// EXISTS no alteran tablas existentes (Turso en prod), hay que ALTERarlas.
	ensureColumn(database, dialect, "Repuestos", "disciplina",
		"TEXT NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico'))",
		"NVARCHAR(10) NOT NULL DEFAULT 'Mecanico' CHECK (disciplina IN ('Mecanico', 'Electrico'))")

	fmt.Println("Database migration completed")
}

// isAlreadyExists detecta errores benignos de re-ejecucion de DDL.
func isAlreadyExists(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "already an object named") || // mssql tabla
		strings.Contains(msg, "already exists") || // mssql indice / sqlite
		strings.Contains(msg, "duplicate column")
}

// ensureColumn agrega una columna a una tabla existente si todavia no esta.
func ensureColumn(database *sql.DB, dialect Dialect, table, column, sqliteDef, mssqlDef string) {
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
		return
	}
	if count > 0 {
		return
	}
	if _, err := database.Exec(alterStmt); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate column") {
			return
		}
		log.Printf("ensureColumn %s.%s: alter failed: %v", table, column, err)
	}
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
