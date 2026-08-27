package openhands

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var ErrConversationNotFound = errors.New("conversation not found")

type OpenHandsService struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewOpenHandsService(apiKey string, baseURL string) *OpenHandsService {
	return &OpenHandsService{
		apiKey:  apiKey,
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

type TextContent struct {
	Type        string `json:"type"`
	Text        string `json:"text"`
	CachePrompt bool   `json:"cache_prompt,omitempty"`
}

type InitialMessage struct {
	Role    string        `json:"role,omitempty"`
	Content []TextContent `json:"content"`
	Run     bool          `json:"run,omitempty"`
}

// StartConversationRequest is the body for POST /v1/app-conversations.
type StartConversationRequest struct {
	InitialMessage      *InitialMessage `json:"initial_message,omitempty"`
	SelectedRepository  string          `json:"selected_repository,omitempty"`
	SelectedBranch      string          `json:"selected_branch,omitempty"`
	Title               string          `json:"title,omitempty"`
	LLMModel            string          `json:"llm_model,omitempty"`
	AgentType           string          `json:"agent_type,omitempty"`
	SystemMessageSuffix string          `json:"system_message_suffix,omitempty"`
}

// StartConversationResponse is returned while the conversation is being provisioned.
type StartConversationResponse struct {
	ID                string  `json:"id"`
	Status            string  `json:"status"`
	Detail            *string `json:"detail"`
	AppConversationID *string `json:"app_conversation_id"`
	SandboxID         *string `json:"sandbox_id"`
	CreatedAt         string  `json:"created_at"`
	UpdatedAt         string  `json:"updated_at"`
}

// SearchConversationsParams are query params for GET /v1/app-conversations/search.
type SearchConversationsParams struct {
	TitleContains           string
	CreatedAtGTE            string
	CreatedAtLT             string
	UpdatedAtGTE            string
	UpdatedAtLT             string
	SandboxIDEq             string
	PageID                  string
	Limit                   int
	IncludeSubConversations bool
}

type AppConversationPage struct {
	Items      []AppConversation `json:"items"`
	NextPageID *string           `json:"next_page_id"`
}

type AppConversation struct {
	ID                   string                `json:"id"`
	CreatedByUserID      *string               `json:"created_by_user_id"`
	SandboxID            string                `json:"sandbox_id"`
	SelectedRepository   *string               `json:"selected_repository"`
	SelectedBranch       *string               `json:"selected_branch"`
	GitProvider          *string               `json:"git_provider"`
	Title                *string               `json:"title"`
	Trigger              *string               `json:"trigger"`
	PRNumber             []int                 `json:"pr_number"`
	LLMModel             *string               `json:"llm_model"`
	AgentKind            string                `json:"agent_kind"`
	ParentConversationID *string               `json:"parent_conversation_id"`
	SubConversationIDs   []string              `json:"sub_conversation_ids"`
	Public               *bool                 `json:"public"`
	Tags                 map[string]string     `json:"tags"`
	CreatedAt            string                `json:"created_at"`
	UpdatedAt            string                `json:"updated_at"`
	SandboxStatus        string                `json:"sandbox_status"`
	ExecutionStatus      *string               `json:"execution_status"`
	ConversationURL      *string               `json:"conversation_url"`
	SessionAPIKey        *string               `json:"session_api_key"`
	LaunchedAgentProfile *LaunchedAgentProfile `json:"launched_agent_profile"`
}

type LaunchedAgentProfile struct {
	AgentProfileID string `json:"agent_profile_id"`
	Revision       int    `json:"revision"`
}

type Branch struct {
	Name         string  `json:"name"`
	CommitSHA    string  `json:"commit_sha"`
	Protected    bool    `json:"protected"`
	LastPushDate *string `json:"last_push_date"`
}

type BranchPage struct {
	Items      []Branch `json:"items"`
	NextPageID *string  `json:"next_page_id"`
}

type Repository struct {
	ID              string  `json:"id"`
	FullName        string  `json:"full_name"`
	GitProvider     string  `json:"git_provider"`
	IsPublic        bool    `json:"is_public"`
	StargazersCount int     `json:"stargazers_count"`
	LinkHeader      *string `json:"link_header"`
	PushedAt        *string `json:"pushed_at"`
	OwnerType       string  `json:"owner_type"`
	MainBranch      string  `json:"main_branch"`
}

type RepositoryPage struct {
	Items      []Repository `json:"items"`
	NextPageID *string      `json:"next_page_id"`
}

type EventPage struct {
	Items      []ConversationEvent `json:"items"`
	NextPageID *string             `json:"next_page_id"`
}

type ConversationEvent struct {
	Kind       string        `json:"kind"`
	ID         string        `json:"id"`
	Timestamp  string        `json:"timestamp"`
	Source     string        `json:"source"`
	LLMMessage *EventMessage `json:"llm_message"`
}

type EventMessage struct {
	Content []TextContent `json:"content"`
}

// StartConversation creates a new OpenHands Cloud conversation (V1).
// POST {baseURL}/v1/app-conversations
func (s *OpenHandsService) StartConversation(ctx context.Context, req StartConversationRequest) (*StartConversationResponse, error) {
	var out StartConversationResponse
	if err := s.doJSON(ctx, http.MethodPost, "/v1/app-conversations", nil, req, &out); err != nil {
		return nil, fmt.Errorf("start conversation: %w", err)
	}
	return &out, nil
}

// GetStartTask returns the latest state of a conversation start task.
func (s *OpenHandsService) GetStartTask(ctx context.Context, startTaskID string) (*StartConversationResponse, error) {
	query := url.Values{}
	query.Add("ids", startTaskID)

	var out []StartConversationResponse
	if err := s.doJSON(ctx, http.MethodGet, "/v1/app-conversations/start-tasks", query, nil, &out); err != nil {
		return nil, fmt.Errorf("get start task: %w", err)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("%w: %s", ErrConversationNotFound, startTaskID)
	}
	return &out[0], nil
}

// SearchConversations lists sandboxed conversations.
// GET {baseURL}/v1/app-conversations/search
func (s *OpenHandsService) SearchConversations(ctx context.Context, params SearchConversationsParams) (*AppConversationPage, error) {
	query := url.Values{}
	setQuery(query, "title__contains", params.TitleContains)
	setQuery(query, "created_at__gte", params.CreatedAtGTE)
	setQuery(query, "created_at__lt", params.CreatedAtLT)
	setQuery(query, "updated_at__gte", params.UpdatedAtGTE)
	setQuery(query, "updated_at__lt", params.UpdatedAtLT)
	setQuery(query, "sandbox_id__eq", params.SandboxIDEq)
	setQuery(query, "page_id", params.PageID)
	if params.Limit > 0 {
		query.Set("limit", strconv.Itoa(params.Limit))
	}
	if params.IncludeSubConversations {
		query.Set("include_sub_conversations", "true")
	}

	var out AppConversationPage
	if err := s.doJSON(ctx, http.MethodGet, "/v1/app-conversations/search", query, nil, &out); err != nil {
		return nil, fmt.Errorf("search conversations: %w", err)
	}
	return &out, nil
}

type SearchEventsParams struct {
	Kind      string
	SortOrder string
	PageID    string
	Limit     int
}

func (s *OpenHandsService) SearchEvents(ctx context.Context, conversationID string, params SearchEventsParams) (*EventPage, error) {
	query := url.Values{}
	setQuery(query, "kind__eq", params.Kind)
	setQuery(query, "sort_order", params.SortOrder)
	setQuery(query, "page_id", params.PageID)
	if params.Limit > 0 {
		query.Set("limit", strconv.Itoa(params.Limit))
	}

	var out EventPage
	path := fmt.Sprintf("/v1/conversation/%s/events/search", url.PathEscape(conversationID))
	if err := s.doJSON(ctx, http.MethodGet, path, query, nil, &out); err != nil {
		return nil, fmt.Errorf("search conversation events: %w", err)
	}
	return &out, nil
}

func (s *OpenHandsService) GetLatestAgentResponse(ctx context.Context, conversationID string) (*string, error) {
	pageID := ""
	for {
		page, err := s.SearchEvents(ctx, conversationID, SearchEventsParams{
			Kind:      "MessageEvent",
			SortOrder: "TIMESTAMP_DESC",
			PageID:    pageID,
			Limit:     100,
		})
		if err != nil {
			return nil, err
		}

		for _, event := range page.Items {
			if event.Kind != "MessageEvent" || event.Source != "agent" || event.LLMMessage == nil {
				continue
			}
			text := eventMessageText(event.LLMMessage)
			if strings.TrimSpace(text) != "" {
				return &text, nil
			}
		}

		if page.NextPageID == nil || *page.NextPageID == "" {
			return nil, nil
		}
		pageID = *page.NextPageID
	}
}

func eventMessageText(message *EventMessage) string {
	parts := make([]string, 0, len(message.Content))
	for _, content := range message.Content {
		if content.Type == "text" && content.Text != "" {
			parts = append(parts, content.Text)
		}
	}
	return strings.Join(parts, "\n")
}

// GetConversation finds a conversation by ID via the search endpoint.
func (s *OpenHandsService) GetConversation(ctx context.Context, conversationID string) (*AppConversation, error) {
	pageID := ""
	for {
		page, err := s.SearchConversations(ctx, SearchConversationsParams{
			PageID: pageID,
			Limit:  100,
		})
		if err != nil {
			return nil, err
		}

		for i := range page.Items {
			if page.Items[i].ID == conversationID {
				return &page.Items[i], nil
			}
		}

		if page.NextPageID == nil || *page.NextPageID == "" {
			return nil, fmt.Errorf("%w: %s", ErrConversationNotFound, conversationID)
		}
		pageID = *page.NextPageID
	}
}

// SearchBranches lists all branches of a repository, following pagination.
// GET {baseURL}/v1/git/branches/search
func (s *OpenHandsService) SearchBranches(ctx context.Context, provider, repository string) ([]Branch, error) {
	branches := []Branch{}
	pageID := ""
	for {
		query := url.Values{}
		query.Set("provider", provider)
		query.Set("repository", repository)
		query.Set("query", "")
		query.Set("limit", "100")
		setQuery(query, "page_id", pageID)

		var page BranchPage
		if err := s.doJSON(ctx, http.MethodGet, "/v1/git/branches/search", query, nil, &page); err != nil {
			return nil, fmt.Errorf("search branches: %w", err)
		}

		branches = append(branches, page.Items...)
		if page.NextPageID == nil || *page.NextPageID == "" {
			return branches, nil
		}
		pageID = *page.NextPageID
	}
}

// SearchRepositories lists all repositories visible to the user, following pagination.
// GET {baseURL}/v1/git/repositories/search
func (s *OpenHandsService) SearchRepositories(ctx context.Context, provider, searchQuery string) ([]Repository, error) {
	repositories := []Repository{}
	pageID := ""
	for {
		query := url.Values{}
		query.Set("provider", provider)
		query.Set("limit", "100")
		setQuery(query, "query", searchQuery)
		setQuery(query, "page_id", pageID)

		var page RepositoryPage
		if err := s.doJSON(ctx, http.MethodGet, "/v1/git/repositories/search", query, nil, &page); err != nil {
			return nil, fmt.Errorf("search repositories: %w", err)
		}

		repositories = append(repositories, page.Items...)
		if page.NextPageID == nil || *page.NextPageID == "" {
			return repositories, nil
		}
		pageID = *page.NextPageID
	}
}

func (s *OpenHandsService) doJSON(ctx context.Context, method, path string, query url.Values, reqBody any, out any) error {
	var bodyReader io.Reader
	if reqBody != nil {
		body, err := json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(body)
	}

	endpoint := s.baseURL + path
	if len(query) > 0 {
		endpoint += "?" + query.Encode()
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, endpoint, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("X-Access-Token", s.apiKey)
	if reqBody != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}

	res, err := s.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer res.Body.Close()

	respBody, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("status %d: %s", res.StatusCode, strings.TrimSpace(string(respBody)))
	}

	if out == nil || len(respBody) == 0 {
		return nil
	}

	if err := json.Unmarshal(respBody, out); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	return nil
}

func setQuery(q url.Values, key, value string) {
	if value != "" {
		q.Set(key, value)
	}
}
