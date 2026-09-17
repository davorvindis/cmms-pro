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

type DashboardHandler struct {
	DB *sql.DB
	D  db.Dialect
}

// discFilter arma " AND <col> = ?" + arg cuando viene ?disciplina= valido.
func (h *DashboardHandler) discFilter(c *gin.Context, col string, argIdx int) (string, []interface{}) {
	if disc := c.Query("disciplina"); models.DisciplinaValida(disc, false) {
		return " AND " + col + " = " + h.D.Param(argIdx), []interface{}{disc}
	}
	return "", nil
}

func (h *DashboardHandler) Stats(c *gin.Context) {
	var stats models.DashboardStats
	discSQL, discArgs := h.discFilter(c, "disciplina", 1)

	h.DB.QueryRow("SELECT COUNT(*) FROM Maquinas").Scan(&stats.MaquinasActivas)

	h.DB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM Maquinas WHERE proximo_mantenimiento <= %s", h.D.Now())).Scan(&stats.MaquinasVencidas)

	h.DB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM Maquinas WHERE proximo_mantenimiento <= %s AND proximo_mantenimiento > %s",
		h.D.DateAddDays(7), h.D.Now())).Scan(&stats.MantenimientosPendientes)
	stats.MantenimientosPendientes += stats.MaquinasVencidas

	h.DB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM Registros WHERE %s%s", h.D.CurrentYearMonth("fecha"), discSQL), discArgs...).Scan(&stats.RegistrosEsteMes)

	h.DB.QueryRow("SELECT COUNT(*) FROM Repuestos WHERE stock_actual < stock_minimo").Scan(&stats.RepuestosStockBajo)

	// Tareas vencidas: mismo calculo que la pagina de tareas (frecuencia vs ultima ejecucion)
	qTareas := fmt.Sprintf(`SELECT t.frecuencia,
		(SELECT %s FROM Registros r JOIN RegistroTareas rt ON rt.registro_id = r.id WHERE rt.tarea_id = t.id)
		FROM Tareas t WHERE t.activa = 1%s`, h.D.DateTimeToStr("MAX(r.fecha)"), strings.Replace(discSQL, "disciplina", "t.disciplina", 1))
	if rows, err := h.DB.Query(qTareas, discArgs...); err == nil {
		for rows.Next() {
			var t models.Tarea
			if rows.Scan(&t.Frecuencia, &t.UltimaEjecucion) != nil {
				continue
			}
			computarEstado(&t)
			if t.Estado == "vencida" {
				stats.TareasVencidas++
			}
		}
		rows.Close()
	}

	h.DB.QueryRow("SELECT COUNT(*) FROM Mantenimientos WHERE estado = 'Pendiente'"+discSQL, discArgs...).Scan(&stats.MantsPlanPendientes)

	c.JSON(http.StatusOK, stats)
}

func (h *DashboardHandler) Alertas(c *gin.Context) {
	alertas := []models.Alerta{}

	rows, err := h.DB.Query(fmt.Sprintf(
		"SELECT id, nombre FROM Maquinas WHERE proximo_mantenimiento <= %s ORDER BY proximo_mantenimiento", h.D.Now()))
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, nombre string
			if rows.Scan(&id, &nombre) == nil {
				alertas = append(alertas, models.Alerta{
					Tipo:        "mantenimiento_vencido",
					Descripcion: nombre + " - Mantenimiento vencido",
					Referencia:  id,
				})
			}
		}
	}

	rows2, err := h.DB.Query("SELECT codigo, descripcion, stock_actual, stock_minimo FROM Repuestos WHERE stock_actual < stock_minimo ORDER BY categoria")
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var codigo, desc string
			var actual, minimo int
			if rows2.Scan(&codigo, &desc, &actual, &minimo) == nil {
				alertas = append(alertas, models.Alerta{
					Tipo:        "stock_bajo",
					Descripcion: fmt.Sprintf("%s - Stock: %d/%d", desc, actual, minimo),
					Referencia:  codigo,
				})
			}
		}
	}

	c.JSON(http.StatusOK, alertas)
}

func (h *DashboardHandler) Actividad(c *gin.Context) {
	discSQL, discArgs := h.discFilter(c, "r.disciplina", 1)
	query := fmt.Sprintf(`SELECT %sr.id,
		%s, m.nombre, r.tipo, t.nombre,
		(SELECT COUNT(*) FROM RegistroComponentes WHERE registro_id = r.id),
		%s
		FROM Registros r
		JOIN Maquinas m ON r.maquina_id = m.id
		JOIN Usuarios t ON r.tecnico_id = t.id
		WHERE 1=1%s
		ORDER BY r.fecha DESC%s`,
		h.D.Top(10),
		h.D.DateTimeToStr("r.fecha"),
		h.D.Coalesce(
			"(SELECT SUM(rr.cantidad) FROM RegistroRepuestos rr JOIN RegistroComponentes rc ON rr.registro_componente_id = rc.id WHERE rc.registro_id = r.id)",
			"0"),
		discSQL,
		h.D.Limit(10))

	rows, err := h.DB.Query(query, discArgs...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener actividad"})
		return
	}
	defer rows.Close()

	actividad := []models.ActividadReciente{}
	for rows.Next() {
		var a models.ActividadReciente
		if err := rows.Scan(&a.ID, &a.Fecha, &a.MaquinaNombre, &a.Tipo, &a.TecnicoNombre,
			&a.Componentes, &a.Repuestos); err != nil {
			continue
		}
		actividad = append(actividad, a)
	}
	c.JSON(http.StatusOK, actividad)
}
