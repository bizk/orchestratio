package handlers

import (
	"errors"
	"net/http"

	openhands "orchestratio/internal/services/open-hands"

	"github.com/gin-gonic/gin"
)

func CreateAgent(c *gin.Context) {
	openHandsService := c.MustGet("openHandsService").(*openhands.OpenHandsService)

	agentResponse, err := openHandsService.StartConversation(c.Request.Context(), openhands.StartConversationRequest{
		InitialMessage: &openhands.InitialMessage{
			Content: []openhands.TextContent{{Type: "text", Text: "Fix the flaky test in auth"}},
		},
		SelectedRepository:  "bizk/orchestratus",
		SelectedBranch:      "main",
		Title:               "Test",
		AgentType:           "default",
		SystemMessageSuffix: "Give me a summary of the conversation.",
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agentResponse)
}

func GetAgentByID(c *gin.Context) {
	openHandsService := c.MustGet("openHandsService").(*openhands.OpenHandsService)

	agentID := c.Param("agentId")
	if agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent ID is required"})
		return
	}

	agent, err := openHandsService.GetConversation(c.Request.Context(), agentID)
	if err != nil {
		if errors.Is(err, openhands.ErrConversationNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agent)
}
