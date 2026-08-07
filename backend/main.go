package main

import (
	"fmt"
	"log"
	"net"
	"net/http"

	"cmms-backend/config"
	"cmms-backend/db"
	"cmms-backend/db/seed"
	"cmms-backend/handlers"
	"cmms-backend/middleware"

	"github.com/gin-gonic/gin"
)

// lanIP devuelve la IP privada IPv4 de la maquina, para que el front pueda
// armar URLs de QR accesibles desde otros dispositivos de la red local.
func lanIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, a := range addrs {
		if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ip4 := ipnet.IP.To4(); ip4 != nil && ip4.IsPrivate() {
				return ip4.String()
			}
		}
	}
	return ""
}

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

	// Serve static frontend files
	r.StaticFile("/", "./static/backoffice.html")
	r.StaticFile("/backoffice.html", "./static/backoffice.html")
	r.StaticFile("/qr.html", "./static/qr.html")

	// Handlers
	maquinaH := &handlers.MaquinaHandler{DB: database, D: dialect}
	repuestoH := &handlers.RepuestoHandler{DB: database, D: dialect}
	registroH := &handlers.RegistroHandler{DB: database, D: dialect}
	usuarioH := &handlers.UsuarioHandler{DB: database, D: dialect}
	dashboardH := &handlers.DashboardHandler{DB: database, D: dialect}
	tareaH := &handlers.TareaHandler{DB: database, D: dialect}

	// Health check (liveness + readiness con ping a DB)
	r.GET("/health", func(c *gin.Context) {
		if err := database.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db unreachable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Public routes
	r.POST("/api/auth/login", usuarioH.Login)
	// Vista QR publica: ficha de maquina e historial se ven sin login;
	// crear registros sigue requiriendo credenciales.
	r.GET("/api/maquinas/:id", maquinaH.Get)
	r.GET("/api/maquinas/:id/registros", registroH.ListByMaquina)
	r.GET("/api/maquinas/:id/tareas", tareaH.ListByMaquina)

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthRequired(database, dialect))
	{
		// Maquinas
		api.GET("/maquinas", maquinaH.List)
		api.POST("/maquinas", maquinaH.Create)
		api.PUT("/maquinas/:id", maquinaH.Update)
		api.DELETE("/maquinas/:id", middleware.RequireRole("Administrador"), maquinaH.Delete)
		api.POST("/maquinas/:id/componentes", maquinaH.AddComponente)
		api.DELETE("/maquinas/:id/componentes/:compId", maquinaH.DeleteComponente)
		api.GET("/maquinas/:id/componentes/:compId/repuestos", maquinaH.ListRepuestos)
		api.POST("/maquinas/:id/componentes/:compId/repuestos", maquinaH.AddComponenteRepuesto)

		// Repuestos
		api.GET("/repuestos", repuestoH.List)
		api.GET("/repuestos/stock-bajo", repuestoH.StockBajo)
		api.GET("/repuestos/:codigo", repuestoH.Get)
		api.POST("/repuestos", repuestoH.Create)
		api.PUT("/repuestos/:codigo", repuestoH.Update)
		api.DELETE("/repuestos/:codigo", middleware.RequireRole("Administrador"), repuestoH.Delete)

		// Tareas de mantenimiento preventivo (checklist)
		api.GET("/tareas", tareaH.List)
		api.POST("/tareas", tareaH.Create)
		api.PUT("/tareas/:id", tareaH.Update)
		api.DELETE("/tareas/:id", middleware.RequireRole("Administrador"), tareaH.Delete)

		// Registros de mantenimiento
		api.GET("/registros", registroH.List)
		api.GET("/registros/:id", registroH.Get)
		api.POST("/registros", registroH.Create)
		api.DELETE("/registros/:id", middleware.RequireRole("Administrador"), registroH.Delete)


		// Usuarios
		api.GET("/usuarios", usuarioH.List)
		api.POST("/usuarios", usuarioH.Create) // personas sin acceso: cualquier logueado; con acceso: valida admin en el handler
		api.PUT("/usuarios/:id", middleware.RequireRole("Administrador"), usuarioH.Update)

		// Dashboard
		// IP local del server (para QRs escaneables desde el celular)
		api.GET("/config/lan-ip", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"lan_ip": lanIP()})
		})

		api.GET("/dashboard/stats", dashboardH.Stats)
		api.GET("/dashboard/alertas", dashboardH.Alertas)
		api.GET("/dashboard/actividad", dashboardH.Actividad)
	}

	fmt.Printf("CMMS Backend running on port %s (%s)\n", cfg.Port, cfg.DBDriver)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
