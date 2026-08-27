package openhands

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchBranches(t *testing.T) {
	nextPage := "2"
	var requestedPages []string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/git/branches/search" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("X-Access-Token") != "test-key" {
			t.Errorf("missing X-Access-Token header")
		}

		q := r.URL.Query()
		if q.Get("provider") != "github" || q.Get("repository") != "owner/repo" {
			t.Errorf("unexpected query params: %s", r.URL.RawQuery)
		}
		requestedPages = append(requestedPages, q.Get("page_id"))

		page := BranchPage{Items: []Branch{{Name: "feature/x"}}}
		if q.Get("page_id") == "" {
			page = BranchPage{
				Items:      []Branch{{Name: "main"}, {Name: "develop"}},
				NextPageID: &nextPage,
			}
		}
		_ = json.NewEncoder(w).Encode(page)
	}))
	defer server.Close()

	svc := NewOpenHandsService("test-key", server.URL)
	branches, err := svc.SearchBranches(context.Background(), "github", "owner/repo")
	if err != nil {
		t.Fatalf("SearchBranches: %v", err)
	}

	if len(branches) != 3 {
		t.Fatalf("expected 3 branches, got %d", len(branches))
	}
	if branches[0].Name != "main" || branches[2].Name != "feature/x" {
		t.Fatalf("unexpected branches: %+v", branches)
	}
	if len(requestedPages) != 2 || requestedPages[0] != "" || requestedPages[1] != nextPage {
		t.Fatalf("unexpected pagination requests: %v", requestedPages)
	}
}

func TestSearchRepositories(t *testing.T) {
	nextPage := "2"
	var requestedPages []string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/git/repositories/search" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("X-Access-Token") != "test-key" {
			t.Errorf("missing X-Access-Token header")
		}

		q := r.URL.Query()
		if q.Get("provider") != "github" || q.Get("query") != "orchestratio" {
			t.Errorf("unexpected query params: %s", r.URL.RawQuery)
		}
		requestedPages = append(requestedPages, q.Get("page_id"))

		page := RepositoryPage{Items: []Repository{{FullName: "owner/other"}}}
		if q.Get("page_id") == "" {
			page = RepositoryPage{
				Items:      []Repository{{FullName: "owner/orchestratio"}},
				NextPageID: &nextPage,
			}
		}
		_ = json.NewEncoder(w).Encode(page)
	}))
	defer server.Close()

	svc := NewOpenHandsService("test-key", server.URL)
	repositories, err := svc.SearchRepositories(context.Background(), "github", "orchestratio")
	if err != nil {
		t.Fatalf("SearchRepositories: %v", err)
	}

	if len(repositories) != 2 {
		t.Fatalf("expected 2 repositories, got %d", len(repositories))
	}
	if repositories[0].FullName != "owner/orchestratio" || repositories[1].FullName != "owner/other" {
		t.Fatalf("unexpected repositories: %+v", repositories)
	}
	if len(requestedPages) != 2 || requestedPages[0] != "" || requestedPages[1] != nextPage {
		t.Fatalf("unexpected pagination requests: %v", requestedPages)
	}
}

func TestGetStartTask(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/app-conversations/start-tasks" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("ids") != "start-task-1" {
			t.Errorf("unexpected query params: %s", r.URL.RawQuery)
		}
		_ = json.NewEncoder(w).Encode([]StartConversationResponse{{
			ID:                "start-task-1",
			AppConversationID: stringPointer("conversation-1"),
		}})
	}))
	defer server.Close()

	svc := NewOpenHandsService("test-key", server.URL)
	startTask, err := svc.GetStartTask(context.Background(), "start-task-1")
	if err != nil {
		t.Fatalf("GetStartTask: %v", err)
	}
	if startTask.AppConversationID == nil || *startTask.AppConversationID != "conversation-1" {
		t.Fatalf("unexpected start task: %+v", startTask)
	}
}

func TestGetStartTaskReturnsNotFoundForEmptyResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]StartConversationResponse{})
	}))
	defer server.Close()

	svc := NewOpenHandsService("test-key", server.URL)
	_, err := svc.GetStartTask(context.Background(), "missing-task")
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("expected ErrConversationNotFound, got %v", err)
	}
}

func stringPointer(value string) *string {
	return &value
}
