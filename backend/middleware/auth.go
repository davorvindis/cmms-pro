package middleware

import (
	"database/sql"
	"net/http"

	"cmms-backend/db"
	"cmms-backend/models"

	"github.com/gin-gonic/gin"
)

func AuthRequired(database *sql.DB, dialect db.Dialect) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetHeader("X-User-ID")
		pin := c.GetHeader("X-Pin")

		if userID == "" || pin == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales requeridas"})
			c.Abort()
			return
		}

		query := "SELECT id, nombre, rol, estado FROM Usuarios WHERE id = " + dialect.Param(1) +
			" AND pin = " + dialect.Param(2) + " AND estado = 'Activo'"

		var user models.Usuario
		err := database.QueryRow(query, userID, pin).Scan(&user.ID, &user.Nombre, &user.Rol, &user.Estado)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales invalidas"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No autenticado"})
			c.Abort()
			return
		}

		user := userVal.(models.Usuario)
		for _, role := range roles {
			if user.Rol == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Permisos insuficientes"})
		c.Abort()
	}
}
