package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port               string
	DBDriver           string // "sqlite" or "sqlserver"
	DBConnectionString string
	CORSOrigin         string
	SeedOnStart        bool
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	driver := os.Getenv("DB_DRIVER")
	connStr := os.Getenv("DB_CONNECTION_STRING")

	// Default to SQLite for easy local dev
	if driver == "" {
		driver = "sqlite"
	}
	if driver == "sqlite" && connStr == "" {
		connStr = "./cmms.db"
	}

	// SQL Server: si no hay connection string completa, se compone desde
	// variables separadas (la password viene de Key Vault via secretref,
	// nunca se guarda armada en app settings).
	if driver == "sqlserver" && connStr == "" {
		connStr = fmt.Sprintf("server=%s;user id=%s;password=%s;database=%s;encrypt=true",
			os.Getenv("DB_SERVER"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))
	}

	return Config{
		Port:               port,
		DBDriver:           driver,
		DBConnectionString: connStr,
		CORSOrigin:         os.Getenv("CORS_ORIGIN"),
		SeedOnStart:        os.Getenv("SEED_ON_START") == "true",
	}
}
