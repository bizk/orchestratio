import type { Project, Status, Task } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

function send<T>(url: string, method: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export const fetchProjects = () => request<Project[]>('/api/project')

export const fetchTasks = (projectId: number) =>
  request<Task[]>(`/api/project/${projectId}/task`)

export const createTask = (
  projectId: number,
  task: { Title: string; Description: string; Status: Status },
) => send<Task>(`/api/project/${projectId}/task`, 'POST', task)

export const updateTaskStatus = (
  projectId: number,
  taskId: number,
  status: Status,
) => send<Task>(`/api/project/${projectId}/task/${taskId}`, 'PUT', { Status: status })
