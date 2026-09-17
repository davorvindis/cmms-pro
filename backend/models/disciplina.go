package models

// Disciplina es la dimension transversal mecanica/electronica del CMMS.
// Tokens en DB: 'Mecanico' | 'Electrico' (los que ya usa Repuestos).
// Usuarios ademas admite 'Ambas'.
const (
	DisciplinaMecanico  = "Mecanico"
	DisciplinaElectrico = "Electrico"
	DisciplinaAmbas     = "Ambas"
)

// DisciplinaValida valida el token. permitirAmbas solo aplica a Usuarios.
func DisciplinaValida(s string, permitirAmbas bool) bool {
	switch s {
	case DisciplinaMecanico, DisciplinaElectrico:
		return true
	case DisciplinaAmbas:
		return permitirAmbas
	}
	return false
}

// DisciplinaODefault devuelve s si es valida (sin Ambas) o 'Mecanico'.
func DisciplinaODefault(s string) string {
	if DisciplinaValida(s, false) {
		return s
	}
	return DisciplinaMecanico
}
