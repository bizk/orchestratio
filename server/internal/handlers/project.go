package handlers

import (
	"errors"
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

	var project models.Project
	if err := db.First(&project, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
			return
		}
		fmt.Printf("failed to find project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("project_id = ?", project.ID).Delete(&models.Task{}).Error; err != nil {
			return err
		}
		return tx.Delete(&project).Error
	}); err != nil {
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
	if err := db.First(&project, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
			return
		}
		fmt.Printf("failed to find project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Title       *string        `json:"Title"`
		Description *string        `json:"Description"`
		Status      *models.Status `json:"Status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one project field is required"})
		return
	}

	if err := db.Model(&project).Updates(updates).Error; err != nil {
		fmt.Printf("failed to update project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := db.First(&project, project.ID).Error; err != nil {
		fmt.Printf("failed to load updated project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}
