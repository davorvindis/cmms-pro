package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/microsoft/go-mssqldb"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

type DialectType string

const (
	SQLite    DialectType = "sqlite"
	SQLServer DialectType = "sqlserver"
)

type Dialect struct {
	Type DialectType
}

// Param returns the parameter placeholder for the given index (1-based).
// SQL Server: @p1, @p2  |  SQLite: ?, ?
func (d Dialect) Param(n int) string {
	if d.Type == SQLite {
		return "?"
	}
	return fmt.Sprintf("@p%d", n)
}

// Now returns the current timestamp expression.
func (d Dialect) Now() string {
	if d.Type == SQLite {
		return "datetime('now')"
	}
	return "GETDATE()"
}

// DateToStr wraps a date column for string output.
// SQL Server needs CONVERT; SQLite stores dates as text already.
func (d Dialect) DateToStr(col string) string {
	if d.Type == SQLite {
		return col
	}
	return fmt.Sprintf("CONVERT(NVARCHAR(10), %s, 120)", col)
}

// DateTimeToStr wraps a datetime column for string output.
func (d Dialect) DateTimeToStr(col string) string {
	if d.Type == SQLite {
		return col
	}
	return fmt.Sprintf("CONVERT(NVARCHAR(19), %s, 120)", col)
}

// TopOrLimit returns TOP N (before columns) or LIMIT N (at end).
func (d Dialect) Top(n int) string {
	if d.Type == SQLite {
		return ""
	}
	return fmt.Sprintf("TOP %d ", n)
}

func (d Dialect) Limit(n int) string {
	if d.Type == SQLite {
		return fmt.Sprintf(" LIMIT %d", n)
	}
	return ""
}

// DateAddDays returns an expression for "now + N days".
func (d Dialect) DateAddDays(days int) string {
	if d.Type == SQLite {
		return fmt.Sprintf("datetime('now', '+%d days')", days)
	}
	return fmt.Sprintf("DATEADD(day, %d, GETDATE())", days)
}

// YearEquals returns a condition checking if a column's year matches current year.
func (d Dialect) CurrentYearMonth(col string) string {
	if d.Type == SQLite {
		return fmt.Sprintf("strftime('%%Y-%%m', %s) = strftime('%%Y-%%m', 'now')", col)
	}
	return fmt.Sprintf("YEAR(%s) = YEAR(GETDATE()) AND MONTH(%s) = MONTH(GETDATE())", col, col)
}

// Coalesce returns COALESCE (works on both, better than ISNULL/IFNULL).
func (d Dialect) Coalesce(col string, def string) string {
	return fmt.Sprintf("COALESCE(%s, %s)", col, def)
}

// InsertAndGetID executes an insert and returns the generated ID.
// SQL Server uses OUTPUT INSERTED.id; SQLite uses LastInsertId().
func (d Dialect) InsertAndGetID(tx *sql.Tx, query string, args ...interface{}) (int, error) {
	if d.Type == SQLite {
		result, err := tx.Exec(query, args...)
		if err != nil {
			return 0, err
		}
		id, err := result.LastInsertId()
		return int(id), err
	}
	// SQL Server: caller must include OUTPUT INSERTED.id in the query
	var id int
	err := tx.QueryRow(query, args...).Scan(&id)
	return id, err
}

// InsertAndGetIDSingle is like InsertAndGetID but uses *sql.DB directly.
func (d Dialect) InsertAndGetIDSingle(db *sql.DB, query string, args ...interface{}) (int, error) {
	if d.Type == SQLite {
		result, err := db.Exec(query, args...)
		if err != nil {
			return 0, err
		}
		id, err := result.LastInsertId()
		return int(id), err
	}
	var id int
	err := db.QueryRow(query, args...).Scan(&id)
	return id, err
}

func Connect(driver, connString string) (*sql.DB, Dialect) {
	// Turso uses libsql driver but SQLite-compatible SQL
	dialectType := DialectType(driver)
	if driver == "turso" {
		dialectType = SQLite
	}
	dialect := Dialect{Type: dialectType}

	var d *sql.DB
	var err error

	switch driver {
	case "turso":
		d, err = sql.Open("libsql", connString)
		if err != nil {
			log.Fatalf("Error opening Turso: %v", err)
		}
	case "sqlite":
		d, err = sql.Open("sqlite", connString)
		if err != nil {
			log.Fatalf("Error opening SQLite: %v", err)
		}
		d.Exec("PRAGMA journal_mode=WAL")
		d.Exec("PRAGMA foreign_keys=ON")
	default:
		d, err = sql.Open("sqlserver", connString)
		if err != nil {
			log.Fatalf("Error opening SQL Server: %v", err)
		}
	}

	if err := d.Ping(); err != nil {
		log.Fatalf("Error pinging DB: %v", err)
	}

	fmt.Printf("Connected to database (%s)\n", driver)
	return d, dialect
}
