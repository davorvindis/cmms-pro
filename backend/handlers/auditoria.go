package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"

	"cmms-backend/db"

	"github.com/gin-gonic/gin"
)

type AuditoriaHandler struct {
	DB *sql.DB
	D  db.Dialect
}

type auditRow struct {
	ID            int     `json:"id"`
	Fecha         string  `json:"fecha"`
	UsuarioID     string  `json:"usuario_id"`
	UsuarioNombre string  `json:"usuario_nombre"`
	Metodo        string  `json:"metodo"`
	Ruta          string  `json:"ruta"`
	Entidad       string  `json:"entidad"`
	Detalle       *string `json:"detalle"`
}

func (h *AuditoriaHandler) List(c *gin.Context) {
	limit := 200
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 1000 {
		limit = l
	}

	query := fmt.Sprintf("SELECT %sid, %s, usuario_id, usuario_nombre, metodo, ruta, entidad, detalle FROM AuditLog WHERE 1=1",
		h.D.Top(limit), h.D.DateTimeToStr("fecha"))
	var args []interface{}
	argIdx := 1

	if ent := c.Query("entidad"); ent != "" {
		query += " AND entidad = " + h.D.Param(argIdx)
		args = append(args, ent)
		argIdx++
	}
	if uid := c.Query("usuario_id"); uid != "" {
		query += " AND usuario_id = " + h.D.Param(argIdx)
		args = append(args, uid)
		argIdx++
	}
	query += " ORDER BY id DESC" + h.D.Limit(limit)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar auditoria"})
		return
	}
	defer rows.Close()

	items := []auditRow{}
	for rows.Next() {
		var a auditRow
		if err := rows.Scan(&a.ID, &a.Fecha, &a.UsuarioID, &a.UsuarioNombre, &a.Metodo, &a.Ruta, &a.Entidad, &a.Detalle); err != nil {
			continue
		}
		items = append(items, a)
	}
	c.JSON(http.StatusOK, items)
}
