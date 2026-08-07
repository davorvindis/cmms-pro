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

type RepuestoHandler struct {
	DB *sql.DB
	D  db.Dialect
}

func (h *RepuestoHandler) List(c *gin.Context) {
	query := "SELECT codigo, descripcion, nro_hauni, categoria, disciplina, stock_actual, stock_minimo FROM Repuestos WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if search := c.Query("search"); search != "" {
		query += fmt.Sprintf(" AND (descripcion LIKE %s OR codigo LIKE %s)", h.D.Param(argIdx), h.D.Param(argIdx+1))
		args = append(args, "%"+search+"%", "%"+search+"%")
		argIdx += 2
	}
	if cat := c.Query("categoria"); cat != "" {
		query += " AND categoria = " + h.D.Param(argIdx)
		args = append(args, cat)
		argIdx++
	}
	if disc := c.Query("disciplina"); disc != "" {
		query += " AND disciplina = " + h.D.Param(argIdx)
		args = append(args, disc)
		argIdx++
	}

	query += " ORDER BY categoria, codigo"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar repuestos"})
		return
	}
	defer rows.Close()

	repuestos := []models.Repuesto{}
	for rows.Next() {
		var r models.Repuesto
		if err := rows.Scan(&r.Codigo, &r.Descripcion, &r.NroHauni, &r.Categoria, &r.Disciplina, &r.StockActual, &r.StockMinimo); err != nil {
			continue
		}
		repuestos = append(repuestos, r)
	}
	c.JSON(http.StatusOK, repuestos)
}

func (h *RepuestoHandler) Get(c *gin.Context) {
	codigo := c.Param("codigo")

	var r models.Repuesto
	err := h.DB.QueryRow(
		"SELECT codigo, descripcion, nro_hauni, categoria, disciplina, stock_actual, stock_minimo FROM Repuestos WHERE codigo = "+h.D.Param(1),
		codigo,
	).Scan(&r.Codigo, &r.Descripcion, &r.NroHauni, &r.Categoria, &r.Disciplina, &r.StockActual, &r.StockMinimo)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Repuesto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, r)
}

func (h *RepuestoHandler) Create(c *gin.Context) {
	var req models.CreateRepuestoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos"})
		return
	}

	if req.Disciplina == "" {
		req.Disciplina = "Mecanico"
	}

	query := fmt.Sprintf(
		"INSERT INTO Repuestos (codigo, descripcion, nro_hauni, categoria, disciplina, stock_actual, stock_minimo) VALUES (%s, %s, %s, %s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5), h.D.Param(6), h.D.Param(7))

	_, err := h.DB.Exec(query, req.Codigo, req.Descripcion, req.NroHauni, req.Categoria, req.Disciplina, req.StockActual, req.StockMinimo)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "El repuesto ya existe o datos invalidos"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"codigo": req.Codigo, "message": "Repuesto creado"})
}

func (h *RepuestoHandler) Update(c *gin.Context) {
	codigo := c.Param("codigo")
	var req models.UpdateRepuestoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos"})
		return
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.Descripcion != nil {
		sets = append(sets, "descripcion = "+h.D.Param(argIdx))
		args = append(args, *req.Descripcion)
		argIdx++
	}
	if req.NroHauni != nil {
		sets = append(sets, "nro_hauni = "+h.D.Param(argIdx))
		args = append(args, *req.NroHauni)
		argIdx++
	}
	if req.Categoria != nil {
		sets = append(sets, "categoria = "+h.D.Param(argIdx))
		args = append(args, *req.Categoria)
		argIdx++
	}
	if req.Disciplina != nil {
		sets = append(sets, "disciplina = "+h.D.Param(argIdx))
		args = append(args, *req.Disciplina)
		argIdx++
	}
	if req.StockActual != nil {
		sets = append(sets, "stock_actual = "+h.D.Param(argIdx))
		args = append(args, *req.StockActual)
		argIdx++
	}
	if req.StockMinimo != nil {
		sets = append(sets, "stock_minimo = "+h.D.Param(argIdx))
		args = append(args, *req.StockMinimo)
		argIdx++
	}

	if len(sets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada que actualizar"})
		return
	}

	query := fmt.Sprintf("UPDATE Repuestos SET %s WHERE codigo = %s", strings.Join(sets, ", "), h.D.Param(argIdx))
	args = append(args, codigo)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Repuesto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Repuesto actualizado"})
}

func (h *RepuestoHandler) Delete(c *gin.Context) {
	codigo := c.Param("codigo")
	result, err := h.DB.Exec("DELETE FROM Repuestos WHERE codigo = "+h.D.Param(1), codigo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Repuesto no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Repuesto eliminado"})
}

func (h *RepuestoHandler) StockBajo(c *gin.Context) {
	rows, err := h.DB.Query(
		"SELECT codigo, descripcion, nro_hauni, categoria, disciplina, stock_actual, stock_minimo FROM Repuestos WHERE stock_actual < stock_minimo ORDER BY categoria, codigo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al consultar stock"})
		return
	}
	defer rows.Close()

	repuestos := []models.Repuesto{}
	for rows.Next() {
		var r models.Repuesto
		if err := rows.Scan(&r.Codigo, &r.Descripcion, &r.NroHauni, &r.Categoria, &r.Disciplina, &r.StockActual, &r.StockMinimo); err != nil {
			continue
		}
		repuestos = append(repuestos, r)
	}
	c.JSON(http.StatusOK, repuestos)
}
