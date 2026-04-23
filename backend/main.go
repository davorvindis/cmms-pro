package main

import (
	"fmt"
	"log"

	"cmms-backend/config"
	"cmms-backend/db"
	"cmms-backend/db/seed"
	"cmms-backend/handlers"
	"cmms-backend/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database, dialect := db.Connect(cfg.DBDriver, cfg.DBConnectionString)
	defer database.Close()

	// Auto-migrate on startup
	db.Migrate(database, dialect)

	if cfg.SeedOnStart {
		seed.Run(database)
	}

	r := gin.Default()
	r.Use(middleware.CORS(cfg.CORSOrigin))

	// Handlers
	maquinaH := &handlers.MaquinaHandler{DB: database, D: dialect}
	repuestoH := &handlers.RepuestoHandler{DB: database, D: dialect}
	registroH := &handlers.RegistroHandler{DB: database, D: dialect}
	usuarioH := &handlers.UsuarioHandler{DB: database, D: dialect}
	dashboardH := &handlers.DashboardHandler{DB: database, D: dialect}

	// Public routes
	r.POST("/api/auth/login", usuarioH.Login)

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthRequired(database, dialect))
	{
		// Maquinas
		api.GET("/maquinas", maquinaH.List)
		api.GET("/maquinas/:id", maquinaH.Get)
		api.POST("/maquinas", maquinaH.Create)
		api.PUT("/maquinas/:id", maquinaH.Update)
		api.DELETE("/maquinas/:id", middleware.RequireRole("Administrador"), maquinaH.Delete)
		api.POST("/maquinas/:id/componentes", maquinaH.AddComponente)
		api.DELETE("/maquinas/:id/componentes/:compId", maquinaH.DeleteComponente)

		// Repuestos
		api.GET("/repuestos", repuestoH.List)
		api.GET("/repuestos/stock-bajo", repuestoH.StockBajo)
		api.GET("/repuestos/:codigo", repuestoH.Get)
		api.POST("/repuestos", repuestoH.Create)
		api.PUT("/repuestos/:codigo", repuestoH.Update)
		api.DELETE("/repuestos/:codigo", middleware.RequireRole("Administrador"), repuestoH.Delete)

		// Registros de mantenimiento
		api.GET("/registros", registroH.List)
		api.GET("/registros/:id", registroH.Get)
		api.POST("/registros", registroH.Create)
		api.DELETE("/registros/:id", middleware.RequireRole("Administrador"), registroH.Delete)

		// Historial por maquina
		api.GET("/maquinas/:id/registros", registroH.ListByMaquina)

		// Usuarios
		api.GET("/usuarios", usuarioH.List)
		api.POST("/usuarios", middleware.RequireRole("Administrador"), usuarioH.Create)
		api.PUT("/usuarios/:id", middleware.RequireRole("Administrador"), usuarioH.Update)

		// Dashboard
		api.GET("/dashboard/stats", dashboardH.Stats)
		api.GET("/dashboard/alertas", dashboardH.Alertas)
		api.GET("/dashboard/actividad", dashboardH.Actividad)
	}

	fmt.Printf("CMMS Backend running on port %s (%s)\n", cfg.Port, cfg.DBDriver)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
