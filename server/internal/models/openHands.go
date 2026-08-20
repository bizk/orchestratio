package models

type OpenHandsRepo struct {
	ID              uint    `json:"id"`
	FullName        string  `json:"full_name"`
	GitProvider     string  `json:"git_provider"`
	IsPublic        bool    `json:"is_public"`
	StargazersCount int     `json:"stargazers_count"`
	LinkHeader      string  `json:"link_header"`
	PushedAt        *string `json:"pushed_at"` // nullable, using pointer to string
	OwnerType       string  `json:"owner_type"`
	MainBranch      string  `json:"main_branch"`
}
