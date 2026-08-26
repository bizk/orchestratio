package openhands

import (
	"context"
	"encoding/json"
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
