package db

import (
	"log"
	"orchestratio/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitDB(dbURL string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Printf("failed to connect to database: %v", err)
		return nil, err
	}

	if err := db.AutoMigrate(&models.Project{}, &models.Task{}); err != nil {
		log.Printf("failed to migrate database: %v", err)
		return nil, err
	}

	return db, nil
}
