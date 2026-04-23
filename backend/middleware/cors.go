package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS(origin string) gin.HandlerFunc {
	allowOrigins := []string{"http://localhost:8000", "http://localhost:8001", "http://localhost:3000", "http://127.0.0.1:8000", "http://127.0.0.1:8001"}
	if origin != "" {
		allowOrigins = append(allowOrigins, origin)
	}

	return cors.New(cors.Config{
		AllowOrigins: allowOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "X-User-ID", "X-Pin"},
	})
}
