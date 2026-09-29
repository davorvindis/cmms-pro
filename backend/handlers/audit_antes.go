package handlers

import (
	"database/sql"
	"encoding/json"

	"github.com/gin-gonic/gin"
)

// setAuditAntes consulta la fila actual (antes de modificarla/borrarla) y deja
// su JSON en el contexto como "audit_antes" para que el middleware de
// auditoria lo guarde en AuditLog.antes. Best-effort: si la fila no existe o
// falla la consulta, no setea nada (el handler decide el 404 por su cuenta).
// El query NUNCA debe seleccionar secretos (pin, hashes).
func setAuditAntes(c *gin.Context, database *sql.DB, query string, args ...interface{}) {
	rows, err := database.Query(query, args...)
	if err != nil {
		return
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil || !rows.Next() {
		return
	}

	vals := make([]interface{}, len(cols))
	ptrs := make([]interface{}, len(cols))
	for i := range vals {
		ptrs[i] = &vals[i]
	}
	if err := rows.Scan(ptrs...); err != nil {
		return
	}

	fila := make(map[string]interface{}, len(cols))
	for i, col := range cols {
		v := vals[i]
		if b, ok := v.([]byte); ok {
			v = string(b)
		}
		fila[col] = v
	}

	if buf, err := json.Marshal(fila); err == nil {
		c.Set("audit_antes", string(buf))
	}
}
