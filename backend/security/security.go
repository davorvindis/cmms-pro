// Package security concentra el manejo de PINs (hash bcrypt con cache de
// verificacion) y el rate limit de login.
package security

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func HashPin(pin string) string {
	h, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		// bcrypt solo falla con pins absurdamente largos; nunca guardar plano
		log.Printf("security: hash pin: %v", err)
		return ""
	}
	return string(h)
}

func IsHashed(stored string) bool {
	return strings.HasPrefix(stored, "$2")
}

// cache de verificaciones exitosas para no pagar bcrypt en cada request
var (
	cacheMu    sync.Mutex
	pinCache   = map[string]time.Time{}
	cacheTTL   = 5 * time.Minute
	lastPurge  = time.Now()
)

func cacheKey(stored, pin string) string {
	sum := sha256.Sum256([]byte(stored + "\x00" + pin))
	return hex.EncodeToString(sum[:])
}

// CheckPin compara el PIN recibido con el almacenado (hash bcrypt o, por
// compatibilidad, texto plano previo a la migracion).
func CheckPin(stored, pin string) bool {
	if stored == "" || pin == "" {
		return false
	}
	if !IsHashed(stored) {
		return stored == pin // legado: se migra en el proximo backfill/login
	}

	key := cacheKey(stored, pin)
	now := time.Now()
	cacheMu.Lock()
	if exp, ok := pinCache[key]; ok && now.Before(exp) {
		cacheMu.Unlock()
		return true
	}
	cacheMu.Unlock()

	if bcrypt.CompareHashAndPassword([]byte(stored), []byte(pin)) != nil {
		return false
	}

	cacheMu.Lock()
	if now.Sub(lastPurge) > cacheTTL {
		for k, exp := range pinCache {
			if now.After(exp) {
				delete(pinCache, k)
			}
		}
		lastPurge = now
	}
	pinCache[key] = now.Add(cacheTTL)
	cacheMu.Unlock()
	return true
}

// BackfillPins hashea los PINs que sigan en texto plano (una sola vez al arrancar).
func BackfillPins(database *sql.DB, param func(int) string) {
	rows, err := database.Query("SELECT id, pin FROM Usuarios WHERE pin <> ''")
	if err != nil {
		log.Printf("security: backfill: %v", err)
		return
	}
	type upd struct{ id, hash string }
	var pendientes []upd
	for rows.Next() {
		var id, pin string
		if rows.Scan(&id, &pin) != nil {
			continue
		}
		if !IsHashed(pin) {
			if h := HashPin(pin); h != "" {
				pendientes = append(pendientes, upd{id, h})
			}
		}
	}
	rows.Close()

	for _, p := range pendientes {
		q := fmt.Sprintf("UPDATE Usuarios SET pin = %s WHERE id = %s", param(1), param(2))
		if _, err := database.Exec(q, p.hash, p.id); err != nil {
			log.Printf("security: backfill %s: %v", p.id, err)
		}
	}
	if len(pendientes) > 0 {
		fmt.Printf("PINs migrados a hash: %d\n", len(pendientes))
	}
}

// Rate limit de login: max intentos por clave (usuario+IP) por ventana.
var (
	rlMu       sync.Mutex
	rlAttempts = map[string][]time.Time{}
)

const (
	rlMax    = 10
	rlWindow = time.Minute
)

func LoginAllowed(key string) bool {
	now := time.Now()
	rlMu.Lock()
	defer rlMu.Unlock()
	vivos := rlAttempts[key][:0]
	for _, t := range rlAttempts[key] {
		if now.Sub(t) < rlWindow {
			vivos = append(vivos, t)
		}
	}
	rlAttempts[key] = vivos
	if len(vivos) >= rlMax {
		return false
	}
	rlAttempts[key] = append(vivos, now)
	return true
}

func LoginSucceeded(key string) {
	rlMu.Lock()
	delete(rlAttempts, key)
	rlMu.Unlock()
}
