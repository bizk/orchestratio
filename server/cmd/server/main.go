package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		log.Println("DATABASE_URL configured")
	}

	// http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
	// 	w.WriteHeader(http.StatusOK)
	// 	fmt.Fprint(w, "ok")
	// })

	// http.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
	// 	fmt.Fprintln(w, "Hello, World!")
	// })

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Printf("server listening on :%s", port)
	log.Fatal(r.Run(":" + port))
}
