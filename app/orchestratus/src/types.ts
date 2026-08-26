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

export interface Task {
  ID: number
  ProjectID: number
  Title: string
  Status: Status
  Description: string
  Approved: boolean
  DateCreated: string
}

// Mirrors the Go Agent model, which serializes with json tags.
export interface Agent {
  id: string
  name: string
  description: string
}
