package models

type Status string

const (
	StatusBacklog    Status = "backlog"
	StatusInProgress Status = "in_progress"
	StatusBlocked    Status = "blocked"
	StatusCompleted  Status = "completed"
)
