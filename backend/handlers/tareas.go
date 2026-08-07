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

type TareaHandler struct {
	DB *sql.DB
	D  db.Dialect
}

// dias entre ejecuciones segun frecuencia, para calcular pendientes
var frecuenciaDias = map[string]int{
	"Semanal":    7,
	"Quincenal":  15,
	"Mensual":    30,
	"Bimestral":  61,
	"Trimestral": 91,
	"Semestral":  182,
	"Anual":      365,
}

// ResultadosValidos son los tildes de la planilla papel (10-50).
var ResultadosValidos = map[string]bool{
	"No realizado": true,
	"Realizado":    true,
	"Ajustado":     true,
	"Sustituido":   true,
	"Observado":    true,
}

func (h *TareaHandler) listQuery() string {
	return fmt.Sprintf(`SELECT t.id, t.maquina_id, t.nombre, t.descripcion, t.tiempo_estimado_min,
		t.frecuencia, t.asignado_id, u.nombre, t.orden, t.activa,
		(SELECT %s FROM Registros r
			JOIN RegistroTareas rt ON rt.registro_id = r.id
			WHERE rt.tarea_id = t.id)
		FROM Tareas t
		LEFT JOIN Usuarios u ON t.asignado_id = u.id`,
		h.D.DateTimeToStr("MAX(r.fecha)"))
}

func (h *TareaHandler) queryTareas(query string, args ...interface{}) ([]models.Tarea, error) {
	rows, err := h.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tareas := []models.Tarea{}
	for rows.Next() {
		var t models.Tarea
		if err := rows.Scan(&t.ID, &t.MaquinaID, &t.Nombre, &t.Descripcion, &t.TiempoEstimadoMin,
			&t.Frecuencia, &t.AsignadoID, &t.AsignadoNombre, &t.Orden, &t.Activa,
			&t.UltimaEjecucion); err != nil {
			continue
		}
		computarEstado(&t)
		tareas = append(tareas, t)
	}
	return tareas, nil
}

func computarEstado(t *models.Tarea) {
	if t.UltimaEjecucion == nil || len(*t.UltimaEjecucion) < 10 {
		t.Estado = "nunca"
		return
	}
	ultima, err := time.Parse("2006-01-02", (*t.UltimaEjecucion)[:10])
	if err != nil {
		t.Estado = "nunca"
		return
	}
	dias, ok := frecuenciaDias[t.Frecuencia]
	if !ok {
		dias = 30
	}
	proxima := ultima.AddDate(0, 0, dias)
	proximaStr := proxima.Format("2006-01-02")
	t.ProximaFecha = &proximaStr

	hoy, _ := time.Parse("2006-01-02", time.Now().Format("2006-01-02"))
	switch {
	case proxima.Before(hoy):
		t.Estado = "vencida"
	case !proxima.After(hoy.AddDate(0, 0, 7)):
		t.Estado = "proxima"
	default:
		t.Estado = "ok"
	}
}

func (h *TareaHandler) List(c *gin.Context) {
	query := h.listQuery() + " WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if maqID := c.Query("maquina_id"); maqID != "" {
		query += " AND t.maquina_id = " + h.D.Param(argIdx)
		args = append(args, maqID)
		argIdx++
	}
	if activa := c.Query("activa"); activa != "" {
		query += " AND t.activa = " + h.D.Param(argIdx)
		args = append(args, activa)
		argIdx++
	}

	query += " ORDER BY t.maquina_id, t.orden, t.id"

	tareas, err := h.queryTareas(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar tareas"})
		return
	}
	c.JSON(http.StatusOK, tareas)
}

// ListByMaquina es publica (la usa la vista QR): solo tareas activas.
func (h *TareaHandler) ListByMaquina(c *gin.Context) {
	query := h.listQuery() + " WHERE t.maquina_id = " + h.D.Param(1) + " AND t.activa = 1 ORDER BY t.orden, t.id"

	tareas, err := h.queryTareas(query, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar tareas"})
		return
	}
	c.JSON(http.StatusOK, tareas)
}

func (h *TareaHandler) Create(c *gin.Context) {
	var req models.CreateTareaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos", "detail": err.Error()})
		return
	}

	if req.AsignadoID != nil && *req.AsignadoID == "" {
		req.AsignadoID = nil
	}

	query := fmt.Sprintf(
		"INSERT INTO Tareas (maquina_id, nombre, descripcion, tiempo_estimado_min, frecuencia, asignado_id, orden) VALUES (%s, %s, %s, %s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5), h.D.Param(6), h.D.Param(7))
	if h.D.Type == db.SQLServer {
		query = fmt.Sprintf(
			"INSERT INTO Tareas (maquina_id, nombre, descripcion, tiempo_estimado_min, frecuencia, asignado_id, orden) OUTPUT INSERTED.id VALUES (%s, %s, %s, %s, %s, %s, %s)",
			h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5), h.D.Param(6), h.D.Param(7))
	}

	id, err := h.D.InsertAndGetIDSingle(h.DB, query,
		req.MaquinaID, req.Nombre, req.Descripcion, req.TiempoEstimadoMin,
		req.Frecuencia, req.AsignadoID, req.Orden)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear tarea", "detail": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Tarea creada"})
}

func (h *TareaHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateTareaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos", "detail": err.Error()})
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
	if req.Descripcion != nil {
		sets = append(sets, "descripcion = "+h.D.Param(argIdx))
		args = append(args, *req.Descripcion)
		argIdx++
	}
	if req.TiempoEstimadoMin != nil {
		sets = append(sets, "tiempo_estimado_min = "+h.D.Param(argIdx))
		args = append(args, *req.TiempoEstimadoMin)
		argIdx++
	}
	if req.Frecuencia != nil {
		sets = append(sets, "frecuencia = "+h.D.Param(argIdx))
		args = append(args, *req.Frecuencia)
		argIdx++
	}
	if req.AsignadoID != nil {
		// string vacio = desasignar (NULL)
		sets = append(sets, "asignado_id = "+h.D.Param(argIdx))
		if *req.AsignadoID == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.AsignadoID)
		}
		argIdx++
	}
	if req.Orden != nil {
		sets = append(sets, "orden = "+h.D.Param(argIdx))
		args = append(args, *req.Orden)
		argIdx++
	}
	if req.Activa != nil {
		sets = append(sets, "activa = "+h.D.Param(argIdx))
		if *req.Activa {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
		argIdx++
	}

	if len(sets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada que actualizar"})
		return
	}

	query := fmt.Sprintf("UPDATE Tareas SET %s WHERE id = %s", strings.Join(sets, ", "), h.D.Param(argIdx))
	args = append(args, id)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tarea actualizada"})
}

func (h *TareaHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	result, err := h.DB.Exec("DELETE FROM Tareas WHERE id = "+h.D.Param(1), id)
	if err != nil {
		// FK desde RegistroTareas sin CASCADE: la tarea tiene ejecuciones
		c.JSON(http.StatusConflict, gin.H{"error": "La tarea tiene ejecuciones registradas; desactivela en lugar de eliminarla"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tarea eliminada"})
}
