package models

type Usuario struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Rol    string `json:"rol"`
	Pin    string `json:"-"`
	Estado string `json:"estado"`
}

type LoginRequest struct {
	ID  string `json:"id" binding:"required"`
	Pin string `json:"pin" binding:"required"`
}

type CreateUsuarioRequest struct {
	ID     string `json:"id" binding:"required"`
	Nombre string `json:"nombre" binding:"required"`
	Rol    string `json:"rol" binding:"required"`
	Pin    string `json:"pin" binding:"required"`
}

type UpdateUsuarioRequest struct {
	Nombre *string `json:"nombre"`
	Rol    *string `json:"rol"`
	Pin    *string `json:"pin"`
	Estado *string `json:"estado"`
}
