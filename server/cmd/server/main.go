package main

import (
	"log"
	"orchestratio/internal/config"
	"orchestratio/internal/db"
	"orchestratio/internal/middlewares"
	openhands "orchestratio/internal/services/open-hands"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	config, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	db, err := db.InitDB(config.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}

	openHandsService := openhands.NewOpenHandsService(config.OpenHandsAPIKey, config.OpenHandsBaseURL)

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Set("openHandsService", openHandsService)
		c.Next()
	})

	middlewares.RegisterRoutes(r)

	log.Printf("server listening on :%s", port)
	log.Fatal(r.Run(":" + port))
}
