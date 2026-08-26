package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"orchestratio/internal/models"
	openhands "orchestratio/internal/services/open-hands"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateTask(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID is required"})
		return
	}

	var project models.Project
	if err := db.First(&project, projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
			return
		}
		fmt.Printf("failed to find project: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var task models.Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.ProjectID = project.ID

	if err := db.Create(&task).Error; err != nil {
		fmt.Printf("failed to create task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func ListTasks(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID is required"})
		return
	}

	var tasks []models.Task
	if err := db.Where("project_id = ?", projectID).Order("date_created DESC").Find(&tasks).Error; err != nil {
		fmt.Printf("failed to list tasks: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

func DeleteTask(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	projectID := c.Param("id")
	taskID := c.Param("taskId")
	if projectID == "" || taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID and task ID are required"})
		return
	}

	result := db.Where("project_id = ?", projectID).Delete(&models.Task{}, taskID)
	if result.Error != nil {
		fmt.Printf("failed to delete task: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task deleted successfully"})
}

func UpdateTask(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	projectID := c.Param("id")
	taskID := c.Param("taskId")
	if projectID == "" || taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID and task ID are required"})
		return
	}

	var task models.Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := db.Model(&models.Task{}).Where("id = ? AND project_id = ?", taskID, projectID).Updates(&task)
	if result.Error != nil {
		fmt.Printf("failed to update task: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	c.JSON(http.StatusOK, task)
}

func RunTask(c *gin.Context) {
	projectID := c.Param("id")
	taskID := c.Param("taskId")

	var req struct {
		AgentID        string `json:"agentId" binding:"required"`
		RepositoryName string `json:"repositoryName" binding:"required"`
		BranchName     string `json:"branchName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if projectID == "" || taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project ID and task ID are required"})
		return
	}

	agentID := req.AgentID
	repositoryName := req.RepositoryName

	branchName := req.BranchName
	if branchName == "" {
		branchName = "main"
	}

	db := c.MustGet("db").(*gorm.DB)

	task := models.Task{}
	err := db.Model(&models.Task{}).Where("id = ? AND project_id = ?", taskID, projectID).First(&task).Error
	if err != nil {
		fmt.Printf("failed to get task: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	agent := models.Agent{}
	err = db.Model(&models.Agent{}).Where("id = ?", agentID).First(&agent).Error
	if err != nil {
		fmt.Printf("failed to get agent: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	openHandsService := c.MustGet("openHandsService").(*openhands.OpenHandsService)

	agentResponse, err := openHandsService.StartConversation(c.Request.Context(), openhands.StartConversationRequest{
		InitialMessage: &openhands.InitialMessage{
			Content: []openhands.TextContent{{Type: "text", Text: task.Description}},
		},
		SelectedRepository:  repositoryName,
		SelectedBranch:      branchName,
		Title:               task.Title,
		AgentType:           "default",
		SystemMessageSuffix: agent.Description,
	})

	if err != nil {
		fmt.Printf("failed to start conversation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&task).Update("status", models.StatusInProgress).Error; err != nil {
		fmt.Printf("failed to update task status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agentResponse)
}
