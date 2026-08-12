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
		Nombre  string `json:"nombre" binding:"required"`
		Seccion string `json:"seccion"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nombre requerido"})
		return
	}

	query := fmt.Sprintf("INSERT INTO Componentes (nombre, seccion, maquina_id) VALUES (%s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3))
	if h.D.Type == db.SQLServer {
		query = fmt.Sprintf("INSERT INTO Componentes (nombre, seccion, maquina_id) OUTPUT INSERTED.id VALUES (%s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3))
	}

	id, err := h.D.InsertAndGetIDSingle(h.DB, query, req.Nombre, req.Seccion, maquinaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al agregar componente"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Componente agregado"})
}

// AddComponenteRepuesto crea (si no existe) un repuesto y lo vincula al conjunto.
// Pensado para altas rapidas durante la carga de un mantenimiento.
func (h *MaquinaHandler) AddComponenteRepuesto(c *gin.Context) {
	compID := c.Param("compId")
	var req struct {
		Codigo      string  `json:"codigo" binding:"required"`
		Descripcion string  `json:"descripcion" binding:"required"`
		NroHauni    *string `json:"nro_hauni"`
		Categoria   string  `json:"categoria"`
		Cantidad    *string `json:"cantidad"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Codigo y descripcion requeridos"})
		return
	}
	if req.Categoria == "" {
		req.Categoria = "Mecanica General"
	}

	// Alta del repuesto si no existe (si ya existe, solo se vincula)
	var existe int
	h.DB.QueryRow("SELECT COUNT(*) FROM Repuestos WHERE codigo = "+h.D.Param(1), req.Codigo).Scan(&existe)
	if existe == 0 {
		insRep := fmt.Sprintf("INSERT INTO Repuestos (codigo, descripcion, nro_hauni, categoria) VALUES (%s, %s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4))
		if _, err := h.DB.Exec(insRep, req.Codigo, req.Descripcion, req.NroHauni, req.Categoria); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear repuesto", "detail": err.Error()})
			return
		}
	}

	var vinculado int
	h.DB.QueryRow("SELECT COUNT(*) FROM ComponenteRepuestos WHERE componente_id = "+h.D.Param(1)+" AND repuesto_codigo = "+h.D.Param(2),
		compID, req.Codigo).Scan(&vinculado)
	if vinculado == 0 {
		insLink := fmt.Sprintf("INSERT INTO ComponenteRepuestos (componente_id, repuesto_codigo, cantidad) VALUES (%s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3))
		if _, err := h.DB.Exec(insLink, compID, req.Codigo, req.Cantidad); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al vincular repuesto", "detail": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{"codigo": req.Codigo, "message": "Repuesto vinculado al conjunto"})
}

// UpdateComponente renombra o cambia de seccion un conjunto.
func (h *MaquinaHandler) UpdateComponente(c *gin.Context) {
	maquinaID := c.Param("id")
	compID := c.Param("compId")
	var req struct {
		Nombre  *string `json:"nombre"`
		Seccion *string `json:"seccion"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos"})
		return
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1
	if req.Nombre != nil && *req.Nombre != "" {
		sets = append(sets, "nombre = "+h.D.Param(argIdx))
		args = append(args, *req.Nombre)
		argIdx++
	}
	if req.Seccion != nil {
		sets = append(sets, "seccion = "+h.D.Param(argIdx))
		args = append(args, *req.Seccion)
		argIdx++
	}
	if len(sets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada que actualizar"})
		return
	}

	query := fmt.Sprintf("UPDATE Componentes SET %s WHERE id = %s AND maquina_id = %s",
		strings.Join(sets, ", "), h.D.Param(argIdx), h.D.Param(argIdx+1))
	args = append(args, compID, maquinaID)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar conjunto"})
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conjunto no encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Conjunto actualizado"})
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
	rows, err := h.DB.Query("SELECT id, nombre, seccion, maquina_id FROM Componentes WHERE maquina_id = "+h.D.Param(1)+" ORDER BY id", maquinaID)
	if err != nil {
		return []models.Componente{}
	}
	defer rows.Close()

	comps := []models.Componente{}
	for rows.Next() {
		var c models.Componente
		if err := rows.Scan(&c.ID, &c.Nombre, &c.Seccion, &c.MaquinaID); err != nil {
			continue
		}
		comps = append(comps, c)
	}
	return comps
}

// ListRepuestos devuelve los repuestos que componen un conjunto segun la
// planilla del fabricante (tabla ComponenteRepuestos).
func (h *MaquinaHandler) ListRepuestos(c *gin.Context) {
	compID := c.Param("compId")

	query := fmt.Sprintf(`SELECT r.codigo, r.descripcion, r.nro_hauni, r.categoria, cr.cantidad
		FROM ComponenteRepuestos cr
		JOIN Repuestos r ON cr.repuesto_codigo = r.codigo
		WHERE cr.componente_id = %s ORDER BY cr.id`, h.D.Param(1))

	rows, err := h.DB.Query(query, compID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar repuestos del conjunto"})
		return
	}
	defer rows.Close()

	reps := []models.ComponenteRepuesto{}
	for rows.Next() {
		var r models.ComponenteRepuesto
		if err := rows.Scan(&r.Codigo, &r.Descripcion, &r.NroHauni, &r.Categoria, &r.Cantidad); err != nil {
			continue
		}
		reps = append(reps, r)
	}
	c.JSON(http.StatusOK, reps)
}
