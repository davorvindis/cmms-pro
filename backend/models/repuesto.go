package models

type Repuesto struct {
	Codigo      string `json:"codigo"`
	Descripcion string `json:"descripcion"`
	Categoria   string `json:"categoria"`
	StockActual int    `json:"stock_actual"`
	StockMinimo int    `json:"stock_minimo"`
}

type CreateRepuestoRequest struct {
	Codigo      string `json:"codigo" binding:"required"`
	Descripcion string `json:"descripcion" binding:"required"`
	Categoria   string `json:"categoria" binding:"required"`
	StockActual int    `json:"stock_actual"`
	StockMinimo int    `json:"stock_minimo"`
}

type UpdateRepuestoRequest struct {
	Descripcion *string `json:"descripcion"`
	Categoria   *string `json:"categoria"`
	StockActual *int    `json:"stock_actual"`
	StockMinimo *int    `json:"stock_minimo"`
}
