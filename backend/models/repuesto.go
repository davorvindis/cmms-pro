package models

type Repuesto struct {
	Codigo      string  `json:"codigo"`
	Descripcion string  `json:"descripcion"`
	NroHauni    *string `json:"nro_hauni"`
	Categoria   string  `json:"categoria"`
	Disciplina  string  `json:"disciplina"`
	StockActual int     `json:"stock_actual"`
	StockMinimo int     `json:"stock_minimo"`
}

// ComponenteRepuesto es un repuesto asociado a un conjunto (Componente),
// con la cantidad que lleva segun la planilla del fabricante.
type ComponenteRepuesto struct {
	Codigo      string  `json:"codigo"`
	Descripcion string  `json:"descripcion"`
	NroHauni    *string `json:"nro_hauni"`
	Categoria   string  `json:"categoria"`
	Disciplina  string  `json:"disciplina"`
	Cantidad    *string `json:"cantidad"`
}

type CreateRepuestoRequest struct {
	Codigo      string  `json:"codigo" binding:"required"`
	Descripcion string  `json:"descripcion" binding:"required"`
	NroHauni    *string `json:"nro_hauni"`
	Categoria   string  `json:"categoria" binding:"required"`
	Disciplina  string  `json:"disciplina" binding:"omitempty,oneof=Mecanico Electrico"`
	StockActual int     `json:"stock_actual"`
	StockMinimo int     `json:"stock_minimo"`
}

type UpdateRepuestoRequest struct {
	Descripcion *string `json:"descripcion"`
	NroHauni    *string `json:"nro_hauni"`
	Categoria   *string `json:"categoria"`
	Disciplina  *string `json:"disciplina" binding:"omitempty,oneof=Mecanico Electrico"`
	StockActual *int    `json:"stock_actual"`
	StockMinimo *int    `json:"stock_minimo"`
}
