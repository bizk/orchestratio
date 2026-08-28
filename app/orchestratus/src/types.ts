// Mirrors the Go models, which serialize with their Go field names.
export type Status = 'backlog' | 'in_progress' | 'blocked' | 'completed'

export const STATUSES: Status[] = ['backlog', 'in_progress', 'blocked', 'completed']

export const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  completed: 'Completed',
}

export interface Project {
  ID: number
  Title: string
  Status: Status
  Description: string
  DateCreated: string
}

export type ProjectDraft = Pick<Project, 'Title' | 'Description' | 'Status'>

export interface Task {
  ID: number
  ProjectID: number
  Title: string
  Status: Status
  Description: string
  Approved: boolean
  DateCreated: string
}

export type TaskDraft = Pick<Task, 'Title' | 'Description' | 'Status'>

export interface Agent {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface Repository {
  id: string
  full_name: string
  git_provider: string
  is_public: boolean
  stargazers_count: number
  pushed_at: string | null
  owner_type: string
  main_branch: string
}

export interface Branch {
  name: string
  commit_sha: string
  protected: boolean
  last_push_date: string | null
}

export interface PullRequest {
  number: number
  url: string
}
