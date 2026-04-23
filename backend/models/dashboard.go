package models

type DashboardStats struct {
	MaquinasActivas          int `json:"maquinas_activas"`
	MantenimientosPendientes int `json:"mantenimientos_pendientes"`
	MaquinasVencidas         int `json:"maquinas_vencidas"`
	RegistrosEsteMes         int `json:"registros_este_mes"`
	RepuestosStockBajo       int `json:"repuestos_stock_bajo"`
}

type Alerta struct {
	Tipo        string `json:"tipo"`
	Descripcion string `json:"descripcion"`
	Referencia  string `json:"referencia"`
}

type ActividadReciente struct {
	ID            int    `json:"id"`
	Fecha         string `json:"fecha"`
	MaquinaNombre string `json:"maquina_nombre"`
	Tipo          string `json:"tipo"`
	TecnicoNombre string `json:"tecnico_nombre"`
	Componentes   int    `json:"componentes"`
	Repuestos     int    `json:"repuestos"`
}
