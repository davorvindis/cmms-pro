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

func Migrate(database *sql.DB, dialect Dialect) {
	var migration string
	if dialect.Type == SQLite {
		migration = sqliteMigration
	} else {
		migration = sqlserverMigration
	}

	for _, stmt := range splitStatements(migration) {
		if _, err := database.Exec(stmt); err != nil {
			log.Printf("Migration error on: %.80s...\nError: %v", stmt, err)
			return
		}
	}

	fmt.Println("Database migration completed")
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
