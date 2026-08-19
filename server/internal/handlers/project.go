package handlers

import (
	"fmt"
	"net/http"
	"orchestratio/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateProject(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	var project models.Project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Create(&project).Error; err != nil {
		fmt.Printf("failed to create project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, project)
}

func ListProjects(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	var projects []models.Project
	if err := db.Order("date_created DESC").Find(&projects).Error; err != nil {
		fmt.Printf("failed to list projects: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, projects)
}

func DeleteProject(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID is required"})
		return
	}

	if err := db.Delete(&models.Project{}, id).Error; err != nil {
		fmt.Printf("failed to delete project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "project deleted successfully"})
}

func UpdateProject(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID is required"})
		return
	}

	var project models.Project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&models.Project{}).Where("id = ?", id).Updates(&project).Error; err != nil {
		fmt.Printf("failed to update project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}
