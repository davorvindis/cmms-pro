package models

type RegistroRepuesto struct {
	RepuestoCodigo      string  `json:"repuesto_codigo"`
	RepuestoDescripcion string  `json:"repuesto_descripcion,omitempty"`
	Cantidad            int     `json:"cantidad"`
	Referencia          *string `json:"referencia,omitempty"`
}

type RegistroComponente struct {
	ID               int                `json:"id"`
	ComponenteID     int                `json:"componente_id"`
	ComponenteNombre string             `json:"componente_nombre,omitempty"`
	TrabajoRealizado *string            `json:"trabajo_realizado"`
	Repuestos        []RegistroRepuesto `json:"repuestos"`
}

// RegistroTarea es la ejecucion de una tarea del checklist preventivo dentro
// de un registro. Resultados replica el multi-tilde de la planilla papel.
type RegistroTarea struct {
	TareaID     int      `json:"tarea_id"`
	TareaNombre string   `json:"tarea_nombre,omitempty"`
	Resultados  []string `json:"resultados"`
	Observacion *string  `json:"observacion"`
}

type Registro struct {
	ID                   int                  `json:"id"`
	MaquinaID            string               `json:"maquina_id"`
	MaquinaNombre        string               `json:"maquina_nombre,omitempty"`
	Fecha                string               `json:"fecha"`
	Tipo                 string               `json:"tipo"`
	TecnicoID            string               `json:"tecnico_id"`
	TecnicoNombre        string               `json:"tecnico_nombre,omitempty"`
	RegistradoPorID      string               `json:"registrado_por_id"`
	RegistradoPorNombre  string               `json:"registrado_por_nombre,omitempty"`
	ProximoMantenimiento *string              `json:"proximo_mantenimiento"`
	Observaciones        *string              `json:"observaciones"`
	Componentes          []RegistroComponente `json:"componentes"`
	Tareas               []RegistroTarea      `json:"tareas"`
}

type CreateRegistroRepuestoReq struct {
	RepuestoCodigo string  `json:"repuesto_codigo" binding:"required"`
	Cantidad       int     `json:"cantidad" binding:"required,min=1"`
	Referencia     *string `json:"referencia" binding:"omitempty,oneof=Pieza Hauni"`
}

type CreateRegistroComponenteReq struct {
	ComponenteID     int                         `json:"componente_id" binding:"required"`
	TrabajoRealizado *string                     `json:"trabajo_realizado"`
	Repuestos        []CreateRegistroRepuestoReq `json:"repuestos"`
}

// Resultados no usa oneof porque 'No realizado' tiene espacio (rompe el
// parser de tags del validator); se valida en el handler.
type CreateRegistroTareaReq struct {
	TareaID     int      `json:"tarea_id" binding:"required"`
	Resultados  []string `json:"resultados" binding:"required,min=1"`
	Observacion *string  `json:"observacion"`
}

// Componentes y Tareas son opcionales por separado; el handler exige al menos
// uno de los dos.
type CreateRegistroRequest struct {
	MaquinaID            string                        `json:"maquina_id" binding:"required"`
	Fecha                string                        `json:"fecha" binding:"required"`
	Tipo                 string                        `json:"tipo" binding:"required"`
	TecnicoID            string                        `json:"tecnico_id" binding:"required"`
	RegistradoPorID      string                        `json:"registrado_por_id" binding:"required"`
	ProximoMantenimiento *string                       `json:"proximo_mantenimiento"`
	Observaciones        *string                       `json:"observaciones"`
	Componentes          []CreateRegistroComponenteReq `json:"componentes"`
	Tareas               []CreateRegistroTareaReq      `json:"tareas"`
}
