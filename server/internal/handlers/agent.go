package handlers

import (
	"net/http"

	"orchestratio/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateAgent(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := req.Name
	description := req.Description

	agent := models.Agent{
		Name:        name,
		Description: description,
	}

	if err := db.Create(&agent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, agent)
}

func ListAgents(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	agents := []models.Agent{}
	err := db.Model(&models.Agent{}).Find(&agents).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agents)
}

func GetAgentByID(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	agent := models.Agent{}
	err := db.Model(&models.Agent{}).Where("id = ?", id).First(&agent).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agent)
}
