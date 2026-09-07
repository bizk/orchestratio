package models

import "time"

type Agent struct {
	ID          string    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description" gorm:"not null"`
	Color       string    `json:"color" gorm:"type:varchar(9);not null;default:'#8257e6'"`
	IsDefault   bool      `json:"is_default" gorm:"not null;default:false"`
	Projects    []Project `json:"-" gorm:"many2many:agent_projects"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
