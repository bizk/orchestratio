package models

import "time"

type Task struct {
	ID           uint   `gorm:"primaryKey"`
	ProjectID    uint   `gorm:"not null;index"`
	Title        string `gorm:"not null"`
	Status       Status `gorm:"type:varchar(20);not null"`
	Description  string
	Deliverable  string    // criterio de entregable
	Approved     bool      `gorm:"default:false"`
	AgentID      *uint     // nullable FK
	DateCreated  time.Time `gorm:"autoCreateTime"`
	CreatedBy    string
	DateModified time.Time `gorm:"autoUpdateTime"`
	ModifiedBy   string
}
