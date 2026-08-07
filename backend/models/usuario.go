package models

type Usuario struct {
	ID            string `json:"id"`
	Nombre        string `json:"nombre"`
	Rol           string `json:"rol"`
	Pin           string `json:"-"`
	PuedeIngresar bool   `json:"puede_ingresar"`
	Estado        string `json:"estado"`
}

type LoginRequest struct {
	ID  string `json:"id" binding:"required"`
	Pin string `json:"pin" binding:"required"`
}

// Pin solo es obligatorio cuando puede_ingresar es true (se valida en el handler).
type CreateUsuarioRequest struct {
	ID            string `json:"id" binding:"required"`
	Nombre        string `json:"nombre" binding:"required"`
	Rol           string `json:"rol" binding:"required"`
	Pin           string `json:"pin"`
	PuedeIngresar bool   `json:"puede_ingresar"`
}

type UpdateUsuarioRequest struct {
	Nombre        *string `json:"nombre"`
	Rol           *string `json:"rol"`
	Pin           *string `json:"pin"`
	PuedeIngresar *bool   `json:"puede_ingresar"`
	Estado        *string `json:"estado"`
}
