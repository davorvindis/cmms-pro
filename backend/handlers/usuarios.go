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

type UsuarioHandler struct {
	DB *sql.DB
	D  db.Dialect
}

func (h *UsuarioHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID y PIN requeridos"})
		return
	}

	query := "SELECT id, nombre, rol, estado FROM Usuarios WHERE id = " + h.D.Param(1) +
		" AND pin = " + h.D.Param(2) + " AND estado = 'Activo'"

	var user models.Usuario
	err := h.DB.QueryRow(query, req.ID, req.Pin).Scan(&user.ID, &user.Nombre, &user.Rol, &user.Estado)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales invalidas"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UsuarioHandler) List(c *gin.Context) {
	query := "SELECT id, nombre, rol, estado FROM Usuarios WHERE 1=1"
	var args []interface{}
	argIdx := 1

	if rol := c.Query("rol"); rol != "" {
		query += " AND rol = " + h.D.Param(argIdx)
		args = append(args, rol)
		argIdx++
	}

	query += " ORDER BY nombre"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al listar usuarios"})
		return
	}
	defer rows.Close()

	usuarios := []models.Usuario{}
	for rows.Next() {
		var u models.Usuario
		if err := rows.Scan(&u.ID, &u.Nombre, &u.Rol, &u.Estado); err != nil {
			continue
		}
		usuarios = append(usuarios, u)
	}
	c.JSON(http.StatusOK, usuarios)
}

func (h *UsuarioHandler) Create(c *gin.Context) {
	var req models.CreateUsuarioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos invalidos"})
		return
	}

	query := fmt.Sprintf("INSERT INTO Usuarios (id, nombre, rol, pin) VALUES (%s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4))

	_, err := h.DB.Exec(query, req.ID, req.Nombre, req.Rol, req.Pin)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "El usuario ya existe o datos invalidos"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": req.ID, "message": "Usuario creado"})
}

func (h *UsuarioHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateUsuarioRequest
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
	if req.Rol != nil {
		sets = append(sets, "rol = "+h.D.Param(argIdx))
		args = append(args, *req.Rol)
		argIdx++
	}
	if req.Pin != nil {
		sets = append(sets, "pin = "+h.D.Param(argIdx))
		args = append(args, *req.Pin)
		argIdx++
	}
	if req.Estado != nil {
		sets = append(sets, "estado = "+h.D.Param(argIdx))
		args = append(args, *req.Estado)
		argIdx++
	}

	if len(sets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada que actualizar"})
		return
	}

	query := fmt.Sprintf("UPDATE Usuarios SET %s WHERE id = %s", strings.Join(sets, ", "), h.D.Param(argIdx))
	args = append(args, id)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuario actualizado"})
}
