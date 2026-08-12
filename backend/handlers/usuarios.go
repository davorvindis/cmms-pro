package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"cmms-backend/db"
	"cmms-backend/models"
	"cmms-backend/security"

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

	rlKey := req.ID + "|" + c.ClientIP()
	if !security.LoginAllowed(rlKey) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Demasiados intentos, espere un minuto"})
		return
	}

	query := "SELECT id, nombre, rol, pin, puede_ingresar, estado FROM Usuarios WHERE id = " + h.D.Param(1) +
		" AND pin <> '' AND puede_ingresar = 1 AND estado = 'Activo'"

	var user models.Usuario
	var stored string
	err := h.DB.QueryRow(query, req.ID).Scan(&user.ID, &user.Nombre, &user.Rol, &stored, &user.PuedeIngresar, &user.Estado)
	if err != nil || !security.CheckPin(stored, req.Pin) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales invalidas"})
		return
	}
	security.LoginSucceeded(rlKey)

	// PIN legado en texto plano: se migra a hash en el primer login exitoso
	if !security.IsHashed(stored) {
		if hash := security.HashPin(req.Pin); hash != "" {
			h.DB.Exec(fmt.Sprintf("UPDATE Usuarios SET pin = %s WHERE id = %s", h.D.Param(1), h.D.Param(2)), hash, user.ID)
		}
	}

	c.JSON(http.StatusOK, user)
}

func (h *UsuarioHandler) List(c *gin.Context) {
	query := "SELECT id, nombre, rol, puede_ingresar, estado FROM Usuarios WHERE 1=1"
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
		if err := rows.Scan(&u.ID, &u.Nombre, &u.Rol, &u.PuedeIngresar, &u.Estado); err != nil {
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

	// Solo un Administrador puede crear usuarios con acceso al sistema;
	// cualquier usuario logueado puede dar de alta personas "solo registro".
	if req.PuedeIngresar {
		if u, ok := c.Get("user"); !ok || u.(models.Usuario).Rol != "Administrador" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Solo un administrador puede crear usuarios con acceso"})
			return
		}
	}

	if req.PuedeIngresar && req.Pin == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Un usuario con acceso necesita PIN"})
		return
	}
	if !req.PuedeIngresar {
		req.Pin = "" // sin acceso, sin credenciales
	}

	puede := 0
	if req.PuedeIngresar {
		puede = 1
	}
	if req.Pin != "" {
		req.Pin = security.HashPin(req.Pin)
	}
	query := fmt.Sprintf("INSERT INTO Usuarios (id, nombre, rol, pin, puede_ingresar) VALUES (%s, %s, %s, %s, %s)",
		h.D.Param(1), h.D.Param(2), h.D.Param(3), h.D.Param(4), h.D.Param(5))

	_, err := h.DB.Exec(query, req.ID, req.Nombre, req.Rol, req.Pin, puede)
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
		hash := ""
		if *req.Pin != "" {
			hash = security.HashPin(*req.Pin)
		}
		args = append(args, hash)
		argIdx++
	}
	if req.PuedeIngresar != nil {
		puede := 0
		if *req.PuedeIngresar {
			puede = 1
		}
		sets = append(sets, "puede_ingresar = "+h.D.Param(argIdx))
		args = append(args, puede)
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
