package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

	"cmms-backend/db"
	"cmms-backend/models"

	"github.com/gin-gonic/gin"
)

type RegistroHandler struct {
	DB *sql.DB
	D  db.Dialect
}

func (h *RegistroHandler) listQuery() string {
	return fmt.Sprintf(`SELECT r.id, r.maquina_id, m.nombre,
		%s, r.tipo, r.tecnico_id, t.nombre, r.registrado_por_id, rp.nombre,
		%s, r.observaciones
		FROM Registros r
		JOIN Maquinas m ON r.maquina_id = m.id
		JOIN Usuarios t ON r.tecnico_id = t.id
		JOIN Usuarios rp ON r.registrado_por_id = rp.id`,
		h.D.DateTimeToStr("r.fecha"),
		h.D.DateToStr("r.proximo_mantenimiento"))
}

func (h *RegistroHandler) scanRegistro(rows *sql.Rows) (models.Registro, error) {
	var r models.Registro
	err := rows.Scan(&r.ID, &r.MaquinaID, &r.MaquinaNombre, &r.Fecha,
		&r.Tipo, &r.TecnicoID, &r.TecnicoNombre, &r.RegistradoPorID, &r.RegistradoPorNombre,
		&r.ProximoMantenimiento, &r.Observaciones)
	return r, err
}

func (h *RegistroHandler) List(c *gin.Context) {
	query := h.listQuery() + " WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if maqID := c.Query("maquina_id"); maqID != "" {
		query += " AND r.maquina_id = " + h.D.Param(argIdx)
		args = append(args, maqID)
		argIdx++
	}
	if tipo := c.Query("tipo"); tipo != "" {
		query += " AND r.tipo = " + h.D.Param(argIdx)
		args = append(args, tipo)
		argIdx++
	}
	if search := c.Query("search"); search != "" {
		p := h.D.Param(argIdx)
		query += fmt.Sprintf(" AND (m.nombre LIKE %s OR t.nombre LIKE %s)", p, p)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += " ORDER BY r.fecha DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar registros"})
		return
	}
	defer rows.Close()

	registros := []models.Registro{}
	for rows.Next() {
		r, err := h.scanRegistro(rows)
		if err != nil {
			continue
		}
		r.Componentes = h.getRegistroComponentes(r.ID)
		registros = append(registros, r)
	}
	c.JSON(http.StatusOK, registros)
}

func (h *RegistroHandler) Get(c *gin.Context) {
	id := c.Param("id")

	query := h.listQuery() + " WHERE r.id = " + h.D.Param(1)

	var r models.Registro
	err := h.DB.QueryRow(query, id).Scan(&r.ID, &r.MaquinaID, &r.MaquinaNombre, &r.Fecha,
		&r.Tipo, &r.TecnicoID, &r.TecnicoNombre, &r.RegistradoPorID, &r.RegistradoPorNombre,
		&r.ProximoMantenimiento, &r.Observaciones)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registro no encontrado"})
		return
	}

	r.Componentes = h.getRegistroComponentes(r.ID)
	c.JSON(http.StatusOK, r)
}

func (h *RegistroHandler) ListByMaquina(c *gin.Context) {
	maquinaID := c.Param("id")

	query := h.listQuery() + " WHERE r.maquina_id = " + h.D.Param(1) + " ORDER BY r.fecha DESC"

	rows, err := h.DB.Query(query, maquinaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar historial"})
		return
	}
	defer rows.Close()

	registros := []models.Registro{}
	for rows.Next() {
		r, err := h.scanRegistro(rows)
		if err != nil {
			continue
		}
		r.Componentes = h.getRegistroComponentes(r.ID)
		registros = append(registros, r)
	}
	c.JSON(http.StatusOK, registros)
}

func (h *RegistroHandler) Create(c *gin.Context) {
	var req models.CreateRegistroRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos", "detail": err.Error()})
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error de transaccion"})
		return
	}
	defer tx.Rollback()

	// 1. Insert registro
	insertReg := fmt.Sprintf(
		"INSERT INTO Registros (maquina_id, fecha, tipo, tecnico_id, registrado_por_id, proximo_mantenimiento, observaciones) VALUES (%s, %s, %s, %s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5), h.D.Param(6), h.D.Param(7))

	if h.D.Type == db.SQLServer {
		insertReg = fmt.Sprintf(
			"INSERT INTO Registros (maquina_id, fecha, tipo, tecnico_id, registrado_por_id, proximo_mantenimiento, observaciones) OUTPUT INSERTED.id VALUES (%s, %s, %s, %s, %s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5), h.D.Param(6), h.D.Param(7))
	}

	registroID, err := h.D.InsertAndGetID(tx, insertReg,
		req.MaquinaID, req.Fecha, req.Tipo, req.TecnicoID, req.RegistradoPorID,
		req.ProximoMantenimiento, req.Observaciones)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear registro", "detail": err.Error()})
		return
	}

	// 2. Insert componentes + repuestos
	insertComp := fmt.Sprintf(
		"INSERT INTO RegistroComponentes (registro_id, componente_id, trabajo_realizado) VALUES (%s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3))
	if h.D.Type == db.SQLServer {
		insertComp = fmt.Sprintf(
			"INSERT INTO RegistroComponentes (registro_id, componente_id, trabajo_realizado) OUTPUT INSERTED.id VALUES (%s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3))
	}

	insertRep := fmt.Sprintf(
		"INSERT INTO RegistroRepuestos (registro_componente_id, repuesto_codigo, cantidad) VALUES (%s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3))

	updateStock := fmt.Sprintf(
		"UPDATE Repuestos SET stock_actual = stock_actual - %s WHERE codigo = %s",
		h.D.Param(1), h.D.Param(2))

	for _, comp := range req.Componentes {
		regCompID, err := h.D.InsertAndGetID(tx, insertComp, registroID, comp.ComponenteID, comp.TrabajoRealizado)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar componente", "detail": err.Error()})
			return
		}

		for _, rep := range comp.Repuestos {
			if _, err = tx.Exec(insertRep, regCompID, rep.RepuestoCodigo, rep.Cantidad); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar repuesto", "detail": err.Error()})
				return
			}
			if _, err = tx.Exec(updateStock, rep.Cantidad, rep.RepuestoCodigo); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al descontar stock", "detail": err.Error()})
				return
			}
		}
	}

	// 3. Update machine
	updateMaq := fmt.Sprintf(
		"UPDATE Maquinas SET ultimo_mantenimiento = %s, proximo_mantenimiento = %s, estado = %s WHERE id = %s",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4))

	if _, err = tx.Exec(updateMaq, req.Fecha, req.ProximoMantenimiento, "Operativo", req.MaquinaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar maquina", "detail": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar transaccion"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": registroID, "message": "Registro creado exitosamente"})
}

func (h *RegistroHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result, err := h.DB.Exec("DELETE FROM Registros WHERE id = "+h.D.Param(1), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Registro no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registro eliminado"})
}

func (h *RegistroHandler) getRegistroComponentes(registroID int) []models.RegistroComponente {
	query := fmt.Sprintf(`SELECT rc.id, rc.componente_id, c.nombre, rc.trabajo_realizado
		FROM RegistroComponentes rc
		JOIN Componentes c ON rc.componente_id = c.id
		WHERE rc.registro_id = %s ORDER BY rc.id`, h.D.Param(1))

	rows, err := h.DB.Query(query, registroID)
	if err != nil {
		return []models.RegistroComponente{}
	}
	defer rows.Close()

	comps := []models.RegistroComponente{}
	for rows.Next() {
		var rc models.RegistroComponente
		if err := rows.Scan(&rc.ID, &rc.ComponenteID, &rc.ComponenteNombre, &rc.TrabajoRealizado); err != nil {
			continue
		}
		rc.Repuestos = h.getRegistroRepuestos(rc.ID)
		comps = append(comps, rc)
	}
	return comps
}

func (h *RegistroHandler) getRegistroRepuestos(regCompID int) []models.RegistroRepuesto {
	query := fmt.Sprintf(`SELECT rr.repuesto_codigo, rep.descripcion, rr.cantidad
		FROM RegistroRepuestos rr
		JOIN Repuestos rep ON rr.repuesto_codigo = rep.codigo
		WHERE rr.registro_componente_id = %s ORDER BY rr.id`, h.D.Param(1))

	rows, err := h.DB.Query(query, regCompID)
	if err != nil {
		return []models.RegistroRepuesto{}
	}
	defer rows.Close()

	reps := []models.RegistroRepuesto{}
	for rows.Next() {
		var r models.RegistroRepuesto
		if err := rows.Scan(&r.RepuestoCodigo, &r.RepuestoDescripcion, &r.Cantidad); err != nil {
			continue
		}
		reps = append(reps, r)
	}
	return reps
}
