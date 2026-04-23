package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"cmms-backend/db"
	"cmms-backend/models"

	"github.com/gin-gonic/gin"
)

type MaquinaHandler struct {
	DB *sql.DB
	D  db.Dialect
}

func (h *MaquinaHandler) List(c *gin.Context) {
	query := fmt.Sprintf(`SELECT id, nombre, ubicacion, serie, estado,
		%s, %s, frecuencia_mantenimiento FROM Maquinas WHERE 1=1`,
		h.D.DateToStr("ultimo_mantenimiento"), h.D.DateToStr("proximo_mantenimiento"))

	var args []interface{}
	argIdx := 1

	if search := c.Query("search"); search != "" {
		p := h.D.Param(argIdx)
		query += fmt.Sprintf(" AND (nombre LIKE %s OR id LIKE %s)", p, p)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += " ORDER BY id"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar maquinas"})
		return
	}
	defer rows.Close()

	maquinas := []models.Maquina{}
	for rows.Next() {
		var m models.Maquina
		if err := rows.Scan(&m.ID, &m.Nombre, &m.Ubicacion, &m.Serie, &m.Estado,
			&m.UltimoMantenimiento, &m.ProximoMantenimiento, &m.FrecuenciaMantenimiento); err != nil {
			continue
		}
		m.Componentes = h.getComponentes(m.ID)
		maquinas = append(maquinas, m)
	}
	c.JSON(http.StatusOK, maquinas)
}

func (h *MaquinaHandler) Get(c *gin.Context) {
	id := c.Param("id")

	query := fmt.Sprintf(`SELECT id, nombre, ubicacion, serie, estado,
		%s, %s, frecuencia_mantenimiento FROM Maquinas WHERE id = %s`,
		h.D.DateToStr("ultimo_mantenimiento"), h.D.DateToStr("proximo_mantenimiento"), h.D.Param(1))

	var m models.Maquina
	err := h.DB.QueryRow(query, id).Scan(&m.ID, &m.Nombre, &m.Ubicacion, &m.Serie, &m.Estado,
		&m.UltimoMantenimiento, &m.ProximoMantenimiento, &m.FrecuenciaMantenimiento)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Maquina no encontrada"})
		return
	}

	m.Componentes = h.getComponentes(id)
	c.JSON(http.StatusOK, m)
}

func (h *MaquinaHandler) Create(c *gin.Context) {
	var req models.CreateMaquinaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos"})
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error de transaccion"})
		return
	}
	defer tx.Rollback()

	query := fmt.Sprintf(
		"INSERT INTO Maquinas (id, nombre, ubicacion, serie, frecuencia_mantenimiento) VALUES (%s, %s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5))

	_, err = tx.Exec(query, req.ID, req.Nombre, req.Ubicacion, req.Serie, req.FrecuenciaMantenimiento)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "La maquina ya existe o datos invalidos"})
		return
	}

	compQuery := fmt.Sprintf("INSERT INTO Componentes (nombre, maquina_id) VALUES (%s, %s)",
		h.D.Param(1), h.D.Param(2))
	for _, comp := range req.Componentes {
		if _, err = tx.Exec(compQuery, comp, req.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear componente"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": req.ID, "message": "Maquina creada"})
}

func (h *MaquinaHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateMaquinaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos"})
		return
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.Nombre != nil {
		sets = append(sets, "nombre = "+h.D.Param(argIdx))
		args = append(args, *req.Nombre)
		argIdx++
	}
	if req.Ubicacion != nil {
		sets = append(sets, "ubicacion = "+h.D.Param(argIdx))
		args = append(args, *req.Ubicacion)
		argIdx++
	}
	if req.Serie != nil {
		sets = append(sets, "serie = "+h.D.Param(argIdx))
		args = append(args, *req.Serie)
		argIdx++
	}
	if req.Estado != nil {
		sets = append(sets, "estado = "+h.D.Param(argIdx))
		args = append(args, *req.Estado)
		argIdx++
	}
	if req.FrecuenciaMantenimiento != nil {
		sets = append(sets, "frecuencia_mantenimiento = "+h.D.Param(argIdx))
		args = append(args, *req.FrecuenciaMantenimiento)
		argIdx++
	}

	if len(sets) == 0 && req.Componentes == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada que actualizar"})
		return
	}

	if len(sets) > 0 {
		query := fmt.Sprintf("UPDATE Maquinas SET %s WHERE id = %s", strings.Join(sets, ", "), h.D.Param(argIdx))
		args = append(args, id)

		result, err := h.DB.Exec(query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
			return
		}

		rows, _ := result.RowsAffected()
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Maquina no encontrada"})
			return
		}
	}

	// Sync componentes if provided
	if req.Componentes != nil {
		h.DB.Exec("DELETE FROM Componentes WHERE maquina_id = "+h.D.Param(1), id)
		for _, nombre := range req.Componentes {
			nombre = strings.TrimSpace(nombre)
			if nombre == "" {
				continue
			}
			h.DB.Exec(fmt.Sprintf("INSERT INTO Componentes (nombre, maquina_id) VALUES (%s, %s)",
				h.D.Param(1), h.D.Param(2)), nombre, id)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Maquina actualizada"})
}

func (h *MaquinaHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result, err := h.DB.Exec("DELETE FROM Maquinas WHERE id = "+h.D.Param(1), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Maquina no encontrada"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Maquina eliminada"})
}

func (h *MaquinaHandler) AddComponente(c *gin.Context) {
	maquinaID := c.Param("id")
	var req struct {
		Nombre string `json:"nombre" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nombre requerido"})
		return
	}

	query := fmt.Sprintf("INSERT INTO Componentes (nombre, maquina_id) VALUES (%s, %s)",
		h.D.Param(1), h.D.Param(2))

	result, err := h.DB.Exec(query, req.Nombre, maquinaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al agregar componente"})
		return
	}

	id, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Componente agregado"})
}

func (h *MaquinaHandler) DeleteComponente(c *gin.Context) {
	compID := c.Param("compId")
	result, err := h.DB.Exec("DELETE FROM Componentes WHERE id = "+h.D.Param(1), compID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar componente"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Componente no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Componente eliminado"})
}

func (h *MaquinaHandler) getComponentes(maquinaID string) []models.Componente {
	rows, err := h.DB.Query("SELECT id, nombre, maquina_id FROM Componentes WHERE maquina_id = "+h.D.Param(1)+" ORDER BY id", maquinaID)
	if err != nil {
		return []models.Componente{}
	}
	defer rows.Close()

	comps := []models.Componente{}
	for rows.Next() {
		var c models.Componente
		if err := rows.Scan(&c.ID, &c.Nombre, &c.MaquinaID); err != nil {
			continue
		}
		comps = append(comps, c)
	}
	return comps
}
