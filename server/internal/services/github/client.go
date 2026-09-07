package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	apiToken   string
	httpClient *http.Client
}

func NewClient(apiToken string) *Client {
	return &Client{
		apiToken: apiToken,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// IsPullRequestMerged reports whether a pull request has been merged.
// repository is the "owner/name" slug.
func (c *Client) IsPullRequestMerged(ctx context.Context, repository string, number int) (bool, error) {
	endpoint := fmt.Sprintf("https://api.github.com/repos/%s/pulls/%d", repository, number)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return false, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	if c.apiToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiToken)
	}

	res, err := c.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		return false, fmt.Errorf("status %d: %s", res.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Merged bool `json:"merged"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return false, fmt.Errorf("decode response: %w", err)
	}
	return payload.Merged, nil
}
