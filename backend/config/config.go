package config

import "os"

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

	return Config{
		Port:               port,
		DBDriver:           driver,
		DBConnectionString: connStr,
		CORSOrigin:         os.Getenv("CORS_ORIGIN"),
		SeedOnStart:        os.Getenv("SEED_ON_START") == "true",
	}
}
