package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"cmms-backend/db"
	"cmms-backend/models"

	"github.com/gin-gonic/gin"
)

type MantenimientoHandler struct {
	DB *sql.DB
	D  db.Dialect
}

// Semillas del datalist de tareas; se suman las ya usadas en la DB.
var tareasSemilla = []string{"limpieza", "control de correas", "controlar", "lubricacion", "limpieza y control de resistencias"}

func (h *MantenimientoHandler) baseQuery() string {
	return fmt.Sprintf(`SELECT m.id, m.maquina_id, maq.nombre, m.titulo, m.horas_marcha, m.horas_turbinas,
		m.estado, m.creado_por_id, u.nombre, %s, m.registro_id, %s
		FROM Mantenimientos m
		JOIN Maquinas maq ON m.maquina_id = maq.id
		JOIN Usuarios u ON m.creado_por_id = u.id`,
		h.D.DateTimeToStr("m.fecha_completado"), h.D.DateTimeToStr("m.created_at"))
}

func (h *MantenimientoHandler) scanMantenimiento(scan func(dest ...interface{}) error) (models.Mantenimiento, error) {
	var m models.Mantenimiento
	err := scan(&m.ID, &m.MaquinaID, &m.MaquinaNombre, &m.Titulo, &m.HorasMarcha, &m.HorasTurbinas,
		&m.Estado, &m.CreadoPorID, &m.CreadoPorNombre, &m.FechaCompletado, &m.RegistroID, &m.CreatedAt)
	return m, err
}

func (h *MantenimientoHandler) getItems(mantID int) []models.MantenimientoItem {
	query := fmt.Sprintf(`SELECT mi.id, mi.componente_id, c.nombre, c.seccion, mi.tarea,
		mi.novedades, mi.mecanico_id, mec.nombre, %s, mi.orden
		FROM MantenimientoItems mi
		JOIN Componentes c ON mi.componente_id = c.id
		LEFT JOIN Usuarios mec ON mi.mecanico_id = mec.id
		WHERE mi.mantenimiento_id = %s ORDER BY mi.orden, mi.id`,
		h.D.DateToStr("mi.fecha"), h.D.Param(1))

	rows, err := h.DB.Query(query, mantID)
	if err != nil {
		return []models.MantenimientoItem{}
	}
	defer rows.Close()

	items := []models.MantenimientoItem{}
	for rows.Next() {
		var it models.MantenimientoItem
		if err := rows.Scan(&it.ID, &it.ComponenteID, &it.ComponenteNombre, &it.Seccion, &it.Tarea,
			&it.Novedades, &it.MecanicoID, &it.MecanicoNombre, &it.Fecha, &it.Orden); err != nil {
			continue
		}
		items = append(items, it)
	}
	return items
}

func (h *MantenimientoHandler) queryList(query string, args ...interface{}) ([]models.Mantenimiento, error) {
	rows, err := h.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	mants := []models.Mantenimiento{}
	for rows.Next() {
		m, err := h.scanMantenimiento(rows.Scan)
		if err != nil {
			continue
		}
		m.Items = h.getItems(m.ID)
		mants = append(mants, m)
	}
	return mants, nil
}

func (h *MantenimientoHandler) List(c *gin.Context) {
	query := h.baseQuery() + " WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if maqID := c.Query("maquina_id"); maqID != "" {
		query += " AND m.maquina_id = " + h.D.Param(argIdx)
		args = append(args, maqID)
		argIdx++
	}
	if estado := c.Query("estado"); estado != "" {
		query += " AND m.estado = " + h.D.Param(argIdx)
		args = append(args, estado)
		argIdx++
	}
	query += " ORDER BY m.id DESC"

	mants, err := h.queryList(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar mantenimientos"})
		return
	}
	c.JSON(http.StatusOK, mants)
}

// ListByMaquina es publica (la usa la vista QR).
func (h *MantenimientoHandler) ListByMaquina(c *gin.Context) {
	query := h.baseQuery() + " WHERE m.maquina_id = " + h.D.Param(1)
	args := []interface{}{c.Param("id")}
	if estado := c.Query("estado"); estado != "" {
		query += " AND m.estado = " + h.D.Param(2)
		args = append(args, estado)
	}
	query += " ORDER BY m.id DESC"

	mants, err := h.queryList(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar mantenimientos"})
		return
	}
	c.JSON(http.StatusOK, mants)
}

func (h *MantenimientoHandler) Get(c *gin.Context) {
	query := h.baseQuery() + " WHERE m.id = " + h.D.Param(1)
	m, err := h.scanMantenimiento(h.DB.QueryRow(query, c.Param("id")).Scan)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mantenimiento no encontrado"})
		return
	}
	m.Items = h.getItems(m.ID)
	c.JSON(http.StatusOK, m)
}

func (h *MantenimientoHandler) Create(c *gin.Context) {
	var req models.CreateMantenimientoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos", "detail": err.Error()})
		return
	}

	user := c.MustGet("user").(models.Usuario)

	// Validar que cada conjunto pertenezca a la maquina
	checkComp := fmt.Sprintf("SELECT COUNT(*) FROM Componentes WHERE id = %s AND maquina_id = %s", h.D.Param(1), h.D.Param(2))
	for _, it := range req.Items {
		var count int
		if err := h.DB.QueryRow(checkComp, it.ComponenteID, req.MaquinaID).Scan(&count); err != nil || count == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("El conjunto %d no pertenece a la maquina %s", it.ComponenteID, req.MaquinaID)})
			return
		}
	}

	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error de transaccion"})
		return
	}
	defer tx.Rollback()

	insertMant := fmt.Sprintf(
		"INSERT INTO Mantenimientos (maquina_id, titulo, horas_marcha, horas_turbinas, creado_por_id) VALUES (%s, %s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5))
	if h.D.Type == db.SQLServer {
		insertMant = fmt.Sprintf(
			"INSERT INTO Mantenimientos (maquina_id, titulo, horas_marcha, horas_turbinas, creado_por_id) OUTPUT INSERTED.id VALUES (%s, %s, %s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5))
	}

	mantID, err := h.D.InsertAndGetID(tx, insertMant, req.MaquinaID, req.Titulo, req.HorasMarcha, req.HorasTurbinas, user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear mantenimiento", "detail": err.Error()})
		return
	}

	insertItem := fmt.Sprintf(
		"INSERT INTO MantenimientoItems (mantenimiento_id, componente_id, tarea, orden) VALUES (%s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4))
	for _, it := range req.Items {
		if _, err = tx.Exec(insertItem, mantID, it.ComponenteID, it.Tarea, it.Orden); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear item", "detail": err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar transaccion"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": mantID, "message": "Mantenimiento creado"})
}

// getEstado devuelve estado y maquina_id, o error si no existe.
func (h *MantenimientoHandler) getEstado(id string) (string, string, error) {
	var estado, maquinaID string
	query := fmt.Sprintf("SELECT estado, maquina_id FROM Mantenimientos WHERE id = %s", h.D.Param(1))
	err := h.DB.QueryRow(query, id).Scan(&estado, &maquinaID)
	return estado, maquinaID, err
}

// applyItems aplica los resultados por item dentro de la tx.
func (h *MantenimientoHandler) applyItems(tx *sql.Tx, mantID string, items []models.UpdateMantItemReq) error {
	for _, it := range items {
		sets := []string{}
		args := []interface{}{}
		argIdx := 1

		type campo struct {
			col string
			val *string
		}
		for _, f := range []campo{{"tarea", it.Tarea}, {"novedades", it.Novedades}, {"mecanico_id", it.MecanicoID}, {"fecha", it.Fecha}} {
			if f.val == nil {
				continue
			}
			sets = append(sets, f.col+" = "+h.D.Param(argIdx))
			if *f.val == "" && f.col != "tarea" {
				args = append(args, nil) // string vacio = limpiar el campo
			} else {
				args = append(args, *f.val)
			}
			argIdx++
		}
		if len(sets) == 0 {
			continue
		}
		query := fmt.Sprintf("UPDATE MantenimientoItems SET %s WHERE id = %s AND mantenimiento_id = %s",
			strings.Join(sets, ", "), h.D.Param(argIdx), h.D.Param(argIdx+1))
		args = append(args, it.ItemID, mantID)
		if _, err := tx.Exec(query, args...); err != nil {
			return err
		}
	}
	return nil
}

// Update guarda avances (cabecera y/o resultados por item) sin cerrar.
func (h *MantenimientoHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateMantenimientoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos", "detail": err.Error()})
		return
	}

	estado, maquinaID, err := h.getEstado(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mantenimiento no encontrado"})
		return
	}
	if estado == "Completado" {
		c.JSON(http.StatusConflict, gin.H{"error": "El mantenimiento ya esta completado"})
		return
	}

	// Validar conjuntos nuevos antes de abrir la tx
	checkComp := fmt.Sprintf("SELECT COUNT(*) FROM Componentes WHERE id = %s AND maquina_id = %s", h.D.Param(1), h.D.Param(2))
	for _, it := range req.NuevosItems {
		var count int
		if err := h.DB.QueryRow(checkComp, it.ComponenteID, maquinaID).Scan(&count); err != nil || count == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("El conjunto %d no pertenece a la maquina %s", it.ComponenteID, maquinaID)})
			return
		}
	}

	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error de transaccion"})
		return
	}
	defer tx.Rollback()

	sets := []string{}
	args := []interface{}{}
	argIdx := 1
	for col, val := range map[string]*string{"titulo": req.Titulo, "horas_marcha": req.HorasMarcha, "horas_turbinas": req.HorasTurbinas} {
		if val == nil {
			continue
		}
		sets = append(sets, col+" = "+h.D.Param(argIdx))
		args = append(args, *val)
		argIdx++
	}
	if len(sets) > 0 {
		query := fmt.Sprintf("UPDATE Mantenimientos SET %s WHERE id = %s", strings.Join(sets, ", "), h.D.Param(argIdx))
		args = append(args, id)
		if _, err := tx.Exec(query, args...); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar", "detail": err.Error()})
			return
		}
	}

	if err := h.applyItems(tx, id, req.Items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar items", "detail": err.Error()})
		return
	}

	deleteItem := fmt.Sprintf("DELETE FROM MantenimientoItems WHERE id = %s AND mantenimiento_id = %s", h.D.Param(1), h.D.Param(2))
	for _, itemID := range req.EliminarItems {
		if _, err := tx.Exec(deleteItem, itemID, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar item", "detail": err.Error()})
			return
		}
	}

	insertItem := fmt.Sprintf(
		"INSERT INTO MantenimientoItems (mantenimiento_id, componente_id, tarea, orden) VALUES (%s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4))
	for _, it := range req.NuevosItems {
		if _, err := tx.Exec(insertItem, id, it.ComponenteID, it.Tarea, it.Orden); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al agregar item", "detail": err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar transaccion"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mantenimiento actualizado"})
}

// Completar guarda los resultados, genera el Registro en el historial y cierra.
func (h *MantenimientoHandler) Completar(c *gin.Context) {
	id := c.Param("id")
	var req models.CompletarMantenimientoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos", "detail": err.Error()})
		return
	}

	user := c.MustGet("user").(models.Usuario)

	estado, maquinaID, err := h.getEstado(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mantenimiento no encontrado"})
		return
	}
	if estado == "Completado" {
		c.JSON(http.StatusConflict, gin.H{"error": "El mantenimiento ya esta completado"})
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error de transaccion"})
		return
	}
	defer tx.Rollback()

	if err := h.applyItems(tx, id, req.Items); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar resultados", "detail": err.Error()})
		return
	}

	// Items ya actualizados, leidos dentro de la tx para armar el registro
	qItems := fmt.Sprintf(`SELECT mi.componente_id, mi.tarea, mi.novedades, mec.nombre
		FROM MantenimientoItems mi
		LEFT JOIN Usuarios mec ON mi.mecanico_id = mec.id
		WHERE mi.mantenimiento_id = %s ORDER BY mi.orden, mi.id`, h.D.Param(1))
	rows, err := tx.Query(qItems, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al leer items", "detail": err.Error()})
		return
	}
	type itemReg struct {
		componenteID int
		trabajo      string
	}
	itemsReg := []itemReg{}
	for rows.Next() {
		var compID int
		var tarea string
		var novedades, mecanico sql.NullString
		if err := rows.Scan(&compID, &tarea, &novedades, &mecanico); err != nil {
			continue
		}
		trabajo := tarea
		if novedades.Valid && novedades.String != "" {
			trabajo += " — " + novedades.String
		}
		if mecanico.Valid && mecanico.String != "" {
			trabajo += " (" + mecanico.String + ")"
		}
		itemsReg = append(itemsReg, itemReg{compID, trabajo})
	}
	rows.Close()

	// Registro en el historial
	now := time.Now()
	fecha := now.Format("2006-01-02 15:04")
	insertReg := fmt.Sprintf(
		"INSERT INTO Registros (maquina_id, fecha, tipo, tecnico_id, registrado_por_id, proximo_mantenimiento, observaciones) VALUES (%s, %s, 'Preventivo', %s, %s, NULL, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5))
	if h.D.Type == db.SQLServer {
		insertReg = fmt.Sprintf(
			"INSERT INTO Registros (maquina_id, fecha, tipo, tecnico_id, registrado_por_id, proximo_mantenimiento, observaciones) OUTPUT INSERTED.id VALUES (%s, %s, 'Preventivo', %s, %s, NULL, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5))
	}
	registroID, err := h.D.InsertAndGetID(tx, insertReg, maquinaID, fecha, req.TecnicoID, user.ID, req.Observaciones)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al generar registro", "detail": err.Error()})
		return
	}

	insertComp := fmt.Sprintf(
		"INSERT INTO RegistroComponentes (registro_id, componente_id, trabajo_realizado) VALUES (%s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3))
	for _, it := range itemsReg {
		if _, err = tx.Exec(insertComp, registroID, it.componenteID, it.trabajo); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al registrar componente", "detail": err.Error()})
			return
		}
	}

	if err := actualizarEstadoMaquina(tx, h.D, maquinaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar maquina", "detail": err.Error()})
		return
	}

	closeMant := fmt.Sprintf(
		"UPDATE Mantenimientos SET estado = 'Completado', fecha_completado = %s, registro_id = %s WHERE id = %s",
		h.D.Param(1), h.D.Param(2), h.D.Param(3))
	if _, err = tx.Exec(closeMant, fecha, registroID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al cerrar mantenimiento", "detail": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al confirmar transaccion"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mantenimiento completado", "registro_id": registroID})
}

func (h *MantenimientoHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	estado, _, err := h.getEstado(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mantenimiento no encontrado"})
		return
	}
	if estado == "Completado" {
		c.JSON(http.StatusConflict, gin.H{"error": "No se puede eliminar un mantenimiento completado (tiene registro en el historial)"})
		return
	}

	if _, err := h.DB.Exec("DELETE FROM Mantenimientos WHERE id = "+h.D.Param(1), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mantenimiento eliminado"})
}

// TareasSugeridas alimenta el datalist del form de creacion.
func (h *MantenimientoHandler) TareasSugeridas(c *gin.Context) {
	sugeridas := append([]string{}, tareasSemilla...)
	seen := map[string]bool{}
	for _, t := range sugeridas {
		seen[t] = true
	}

	rows, err := h.DB.Query("SELECT DISTINCT tarea FROM MantenimientoItems ORDER BY tarea")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t string
			if rows.Scan(&t) == nil && !seen[strings.ToLower(t)] {
				seen[strings.ToLower(t)] = true
				sugeridas = append(sugeridas, t)
			}
		}
	}
	c.JSON(http.StatusOK, sugeridas)
}
