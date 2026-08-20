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

// StartConversation creates a new OpenHands Cloud conversation (V1).
// POST {baseURL}/v1/app-conversations
func (s *OpenHandsService) StartConversation(ctx context.Context, req StartConversationRequest) (*StartConversationResponse, error) {
	var out StartConversationResponse
	if err := s.doJSON(ctx, http.MethodPost, "/v1/app-conversations", nil, req, &out); err != nil {
		return nil, fmt.Errorf("start conversation: %w", err)
	}
	return &out, nil
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
