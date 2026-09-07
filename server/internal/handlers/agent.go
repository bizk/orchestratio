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
		Color       string `json:"color"`
		IsDefault   bool   `json:"is_default"`
		ProjectIDs  []uint `json:"project_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := req.Name
	description := req.Description
	color := req.Color
	if color == "" {
		color = "#8257e6"
	}

	agent := models.Agent{
		Name:        name,
		Description: description,
		Color:       color,
		IsDefault:   req.IsDefault,
	}

	if err := db.Create(&agent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := setAgentProjects(db, &agent, req.ProjectIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, buildAgentResponse(db, agent))
}

func ListAgents(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	agents := []models.Agent{}
	err := db.Preload("Projects").Find(&agents).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := make([]gin.H, 0, len(agents))
	for _, agent := range agents {
		response = append(response, buildAgentResponse(db, agent))
	}

	c.JSON(http.StatusOK, response)
}

func GetAgentByID(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	agent := models.Agent{}
	err := db.Preload("Projects").Model(&models.Agent{}).Where("id = ?", id).First(&agent).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, buildAgentResponse(db, agent))
}

func UpdateAgent(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent ID is required"})
		return
	}

	var agent models.Agent
	if err := db.Model(&models.Agent{}).Where("id = ?", id).First(&agent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Description string  `json:"description"`
		Color       *string `json:"color"`
		IsDefault   *bool   `json:"is_default"`
		ProjectIDs  *[]uint `json:"project_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		agent.Name = req.Name
	}
	if req.Description != "" {
		agent.Description = req.Description
	}
	if req.Color != nil && *req.Color != "" {
		agent.Color = *req.Color
	}
	if req.IsDefault != nil {
		agent.IsDefault = *req.IsDefault
	}

	if err := db.Save(&agent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if req.ProjectIDs != nil {
		if err := setAgentProjects(db, &agent, *req.ProjectIDs); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, buildAgentResponse(db, agent))
}

func setAgentProjects(db *gorm.DB, agent *models.Agent, projectIDs []uint) error {
	var projects []models.Project
	if len(projectIDs) > 0 {
		if err := db.Where("id IN ?", projectIDs).Find(&projects).Error; err != nil {
			return err
		}
	}
	return db.Model(agent).Association("Projects").Replace(projects)
}

func buildAgentResponse(db *gorm.DB, agent models.Agent) gin.H {
	projectIDs := []uint{}
	var ids []uint
	if err := db.Table("agent_projects").Where("agent_id = ?", agent.ID).Pluck("project_id", &ids).Error; err == nil {
		projectIDs = ids
	}

	return gin.H{
		"id":          agent.ID,
		"name":        agent.Name,
		"description": agent.Description,
		"color":       agent.Color,
		"is_default":  agent.IsDefault,
		"project_ids": projectIDs,
		"created_at":  agent.CreatedAt,
		"updated_at":  agent.UpdatedAt,
	}
}

func DeleteAgent(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent ID is required"})
		return
	}

	result := db.Where("id = ?", id).Delete(&models.Agent{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "agent deleted successfully"})
}
