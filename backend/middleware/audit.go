package middleware

import (
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"log"
	"regexp"
	"strings"

	"cmms-backend/db"
	"cmms-backend/models"

	"github.com/gin-gonic/gin"
)

var pinRedact = regexp.MustCompile(`("pin"\s*:\s*)"[^"]*"`)

// auditInsert arma el INSERT parametrizado de AuditLog para el dialecto dado.
func auditInsert(dialect db.Dialect) string {
	return fmt.Sprintf(
		"INSERT INTO AuditLog (usuario_id, usuario_nombre, metodo, ruta, entidad, detalle, ip, antes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
		dialect.Param(1), dialect.Param(2), dialect.Param(3), dialect.Param(4),
		dialect.Param(5), dialect.Param(6), dialect.Param(7), dialect.Param(8))
}

// AuditEvent inserta un evento puntual en AuditLog. Pensado para endpoints
// publicos que no pasan por el middleware Audit (ej. login). El detalle NUNCA
// debe incluir pin ni hash.
func AuditEvent(database *sql.DB, dialect db.Dialect, usuarioID, usuarioNombre, metodo, ruta, entidad, detalle, ip string) {
	if _, err := database.Exec(auditInsert(dialect),
		usuarioID, usuarioNombre, metodo, ruta, entidad, detalle, ip, nil); err != nil {
		log.Printf("audit: %v", err)
	}
}

// Audit registra toda escritura exitosa (POST/PUT/DELETE) del grupo autenticado
// en AuditLog, con el body truncado (despues), el campo pin redactado, la IP de
// origen y — si el handler seteo "audit_antes" — el estado anterior de la fila.
func Audit(database *sql.DB, dialect db.Dialect) gin.HandlerFunc {
	insert := auditInsert(dialect)

	return func(c *gin.Context) {
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" {
			c.Next()
			return
		}

		// Tee del body: el handler lo necesita intacto para el binding
		var body []byte
		if c.Request.Body != nil {
			body, _ = io.ReadAll(io.LimitReader(c.Request.Body, 64*1024))
			c.Request.Body = io.NopCloser(bytes.NewReader(body))
		}

		c.Next()

		if c.Writer.Status() >= 400 {
			return
		}
		userVal, ok := c.Get("user")
		if !ok {
			return
		}
		user := userVal.(models.Usuario)

		detalle := pinRedact.ReplaceAllString(string(body), `$1"***"`)
		detalle = strings.TrimSpace(detalle)
		if len(detalle) > 400 {
			detalle = detalle[:400] + "…"
		}

		// entidad = segundo segmento de la ruta: /api/tareas/12 -> tareas
		entidad := ""
		parts := strings.Split(strings.TrimPrefix(c.Request.URL.Path, "/api/"), "/")
		if len(parts) > 0 {
			entidad = parts[0]
		}

		// Estado anterior de la fila (JSON), seteado por los handlers PUT/DELETE
		var antes interface{}
		if v, exists := c.Get("audit_antes"); exists {
			if s, ok := v.(string); ok && s != "" {
				antes = s
			}
		}

		if _, err := database.Exec(insert, user.ID, user.Nombre, c.Request.Method,
			c.Request.URL.Path, entidad, detalle, c.ClientIP(), antes); err != nil {
			log.Printf("audit: %v", err)
		}
	}
}
