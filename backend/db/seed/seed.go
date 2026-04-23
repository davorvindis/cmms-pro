package seed

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
	"strings"
)

//go:embed seed.sql
var seedSQL string

func Run(db *sql.DB) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM Usuarios").Scan(&count)
	if err != nil {
		log.Printf("Seed check failed: %v", err)
		return
	}
	if count > 0 {
		fmt.Println("Database already seeded, skipping")
		return
	}

	for _, stmt := range splitStatements(seedSQL) {
		if _, err := db.Exec(stmt); err != nil {
			log.Printf("Seed error on: %.80s...\nError: %v", stmt, err)
			return
		}
	}

	fmt.Println("Database seeded successfully")
}

func splitStatements(sql string) []string {
	var result []string
	for _, raw := range strings.Split(sql, ";") {
		stmt := strings.TrimSpace(raw)
		if stmt == "" {
			continue
		}
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
