package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port             string
	DatabaseURL      string
	OpenHandsAPIKey  string
	OpenHandsBaseURL string
}

func Load() (*Config, error) {
	// Ignore missing file — Docker/prod usually has no .env on disk
	_ = godotenv.Load() // loads .env from CWD
	// Optional: also try ../.env when running from server/
	_ = godotenv.Load("../.env")
	cfg := &Config{
		Port:             getenv("PORT", "8080"),
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		OpenHandsAPIKey:  os.Getenv("OPEN_HANDS_API_KEY"),
		OpenHandsBaseURL: os.Getenv("OPEN_HANDS_BASE_URL"),
	}
	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	if cfg.OpenHandsAPIKey == "" || cfg.OpenHandsBaseURL == "" {
		return nil, errors.New("OPEN_HANDS_API_KEY and OPEN_HANDS_BASE_URL are required")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
