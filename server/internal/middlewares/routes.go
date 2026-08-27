package middlewares

import (
	"net/http"
	"orchestratio/internal/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	{
		projects := api.Group("/project")
		{
			projects.POST("", handlers.CreateProject)
			projects.GET("", handlers.ListProjects)

			project := projects.Group("/:id")
			{
				project.DELETE("", handlers.DeleteProject)
				project.PUT("", handlers.UpdateProject)

				tasks := project.Group("/task")
				{
					tasks.POST("", handlers.CreateTask)
					tasks.GET("", handlers.ListTasks)
					tasks.GET("/:taskId/pull-requests", handlers.GetTaskPullRequests)
					tasks.DELETE("/:taskId", handlers.DeleteTask)
					tasks.PUT("/:taskId", handlers.UpdateTask)
					tasks.POST("/:taskId/run", handlers.RunTask)
				}
			}
		}
		agents := api.Group("/agent")
		{
			agents.POST("", handlers.CreateAgent)
			agents.GET("", handlers.ListAgents)
			agents.GET("/:id", handlers.GetAgentByID)
			agents.PUT("/:id", handlers.UpdateAgent)
			agents.DELETE("/:id", handlers.DeleteAgent)
		}
		api.GET("/repository", handlers.ListRepositories)
		api.GET("/repository/branches", handlers.ListBranches)
	}
}
