package models

// Tarea es un item del checklist de mantenimiento preventivo de una maquina.
// UltimaEjecucion, ProximaFecha y Estado se calculan on-the-fly a partir de
// los Registros (no se persisten).
type Tarea struct {
	ID                int     `json:"id"`
	MaquinaID         string  `json:"maquina_id"`
	Nombre            string  `json:"nombre"`
	Descripcion       *string `json:"descripcion"`
	TiempoEstimadoMin *int    `json:"tiempo_estimado_min"`
	Frecuencia        string  `json:"frecuencia"`
	AsignadoID        *string `json:"asignado_id"`
	AsignadoNombre    *string `json:"asignado_nombre,omitempty"`
	Orden             int     `json:"orden"`
	Activa            bool    `json:"activa"`
	UltimaEjecucion   *string `json:"ultima_ejecucion"`
	ProximaFecha      *string `json:"proxima_fecha"`
	Estado            string  `json:"estado"` // vencida | proxima | ok | nunca
}

type CreateTareaRequest struct {
	MaquinaID         string  `json:"maquina_id" binding:"required"`
	Nombre            string  `json:"nombre" binding:"required"`
	Descripcion       *string `json:"descripcion"`
	TiempoEstimadoMin *int    `json:"tiempo_estimado_min"`
	Frecuencia        string  `json:"frecuencia" binding:"required,oneof=Semanal Quincenal Mensual Bimestral Trimestral Semestral Anual"`
	AsignadoID        *string `json:"asignado_id"`
	Orden             int     `json:"orden"`
}

type UpdateTareaRequest struct {
	Nombre            *string `json:"nombre"`
	Descripcion       *string `json:"descripcion"`
	TiempoEstimadoMin *int    `json:"tiempo_estimado_min"`
	Frecuencia        *string `json:"frecuencia" binding:"omitempty,oneof=Semanal Quincenal Mensual Bimestral Trimestral Semestral Anual"`
	AsignadoID        *string `json:"asignado_id"`
	Orden             *int    `json:"orden"`
	Activa            *bool   `json:"activa"`
}
