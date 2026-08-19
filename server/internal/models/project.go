package models

import "time"

type Project struct {
	ID           uint   `gorm:"primaryKey"`
	Title        string `gorm:"not null"`
	Status       Status `gorm:"type:varchar(20);not null"`
	Description  string
	DateCreated  time.Time `gorm:"autoCreateTime"`
	CreatedBy    string
	DateModified time.Time `gorm:"autoUpdateTime"`
	ModifiedBy   string
	Tasks        []Task `gorm:"foreignKey:ProjectID"`
}
