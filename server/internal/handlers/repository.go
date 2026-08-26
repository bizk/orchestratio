package handlers

import (
	"fmt"
	"net/http"

	openhands "orchestratio/internal/services/open-hands"

	"github.com/gin-gonic/gin"
)

func ListBranches(c *gin.Context) {
	repositoryName := c.Query("repositoryName")
	if repositoryName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "repository name is required"})
		return
	}

	provider := c.DefaultQuery("provider", "github")

	openHandsService := c.MustGet("openHandsService").(*openhands.OpenHandsService)

	branches, err := openHandsService.SearchBranches(c.Request.Context(), provider, repositoryName)
	if err != nil {
		fmt.Printf("failed to list branches: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, branches)
}
