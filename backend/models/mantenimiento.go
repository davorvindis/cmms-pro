package models

// Mantenimiento es una orden de trabajo planificada: se arma en el sistema,
// se imprime la hoja, se ejecuta en planta y se vuelca el resultado.
type Mantenimiento struct {
	ID              int                 `json:"id"`
	MaquinaID       string              `json:"maquina_id"`
	MaquinaNombre   string              `json:"maquina_nombre,omitempty"`
	Titulo          string              `json:"titulo"`
	HorasMarcha     *string             `json:"horas_marcha"`
	HorasTurbinas   *string             `json:"horas_turbinas"`
	Estado          string              `json:"estado"` // Pendiente | Completado
	CreadoPorID     string              `json:"creado_por_id"`
	CreadoPorNombre string              `json:"creado_por_nombre,omitempty"`
	FechaCompletado *string             `json:"fecha_completado"`
	RegistroID      *int                `json:"registro_id"`
	CreatedAt       string              `json:"created_at"`
	Items           []MantenimientoItem `json:"items"`
}

type MantenimientoItem struct {
	ID               int     `json:"id"`
	ComponenteID     int     `json:"componente_id"`
	ComponenteNombre string  `json:"componente_nombre,omitempty"`
	Seccion          string  `json:"seccion,omitempty"`
	Tarea            string  `json:"tarea"`
	Novedades        *string `json:"novedades"`
	MecanicoID       *string `json:"mecanico_id"`
	MecanicoNombre   *string `json:"mecanico_nombre,omitempty"`
	Fecha            *string `json:"fecha"`
	Orden            int     `json:"orden"`
}

type CreateMantItemReq struct {
	ComponenteID int    `json:"componente_id" binding:"required"`
	Tarea        string `json:"tarea" binding:"required"`
	Orden        int    `json:"orden"`
}

type CreateMantenimientoRequest struct {
	MaquinaID     string              `json:"maquina_id" binding:"required"`
	Titulo        string              `json:"titulo" binding:"required"`
	HorasMarcha   *string             `json:"horas_marcha"`
	HorasTurbinas *string             `json:"horas_turbinas"`
	Items         []CreateMantItemReq `json:"items" binding:"required,min=1"`
}

// UpdateMantItemReq carga el resultado de un item (mecanico, novedades, fecha).
type UpdateMantItemReq struct {
	ItemID     int     `json:"item_id" binding:"required"`
	Tarea      *string `json:"tarea"`
	Novedades  *string `json:"novedades"`
	MecanicoID *string `json:"mecanico_id"`
	Fecha      *string `json:"fecha"`
}

type UpdateMantenimientoRequest struct {
	Titulo        *string             `json:"titulo"`
	HorasMarcha   *string             `json:"horas_marcha"`
	HorasTurbinas *string             `json:"horas_turbinas"`
	Items         []UpdateMantItemReq `json:"items"`
	NuevosItems   []CreateMantItemReq `json:"nuevos_items"`
	EliminarItems []int               `json:"eliminar_items"`
}

type CompletarMantenimientoRequest struct {
	TecnicoID     string              `json:"tecnico_id" binding:"required"`
	Observaciones *string             `json:"observaciones"`
	Items         []UpdateMantItemReq `json:"items"`
}
