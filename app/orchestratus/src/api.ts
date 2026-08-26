import type { Project, Task } from './types'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const fetchProjects = () => get<Project[]>('/api/project')

export const fetchTasks = (projectId: number) =>
  get<Task[]>(`/api/project/${projectId}/task`)
