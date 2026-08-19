package main

import (
	"log"
	"orchestratio/internal/middlewares"
	"orchestratio/internal/models"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&models.Project{}, &models.Task{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	middlewares.RegisterRoutes(r)

	log.Printf("server listening on :%s", port)
	log.Fatal(r.Run(":" + port))
}
