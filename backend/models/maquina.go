package models

type Componente struct {
	ID        int    `json:"id"`
	Nombre    string `json:"nombre"`
	MaquinaID string `json:"maquina_id"`
}

type Maquina struct {
	ID                      string       `json:"id"`
	Nombre                  string       `json:"nombre"`
	Ubicacion               string       `json:"ubicacion"`
	Serie                   *string      `json:"serie"`
	Estado                  string       `json:"estado"`
	UltimoMantenimiento     *string      `json:"ultimo_mantenimiento"`
	ProximoMantenimiento    *string      `json:"proximo_mantenimiento"`
	FrecuenciaMantenimiento string       `json:"frecuencia_mantenimiento"`
	Componentes             []Componente `json:"componentes"`
}

type CreateMaquinaRequest struct {
	ID                      string   `json:"id" binding:"required"`
	Nombre                  string   `json:"nombre" binding:"required"`
	Ubicacion               string   `json:"ubicacion" binding:"required"`
	Serie                   *string  `json:"serie"`
	FrecuenciaMantenimiento string   `json:"frecuencia_mantenimiento" binding:"required"`
	Componentes             []string `json:"componentes"`
}

type UpdateMaquinaRequest struct {
	Nombre                  *string  `json:"nombre"`
	Ubicacion               *string  `json:"ubicacion"`
	Serie                   *string  `json:"serie"`
	Estado                  *string  `json:"estado"`
	FrecuenciaMantenimiento *string  `json:"frecuencia_mantenimiento"`
	Componentes             []string `json:"componentes"`
}
