import type { Agent, Branch, Project, ProjectDraft, PullRequest, Repository, Status, Task, TaskDraft } from './types'

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

export const createProject = (project: ProjectDraft) =>
  send<Project>('/api/project', 'POST', project)

export const updateProject = (projectId: number, project: ProjectDraft) =>
  send<Project>(`/api/project/${projectId}`, 'PUT', project)

export const deleteProject = (projectId: number) =>
  request<{ message: string }>(`/api/project/${projectId}`, { method: 'DELETE' })

export const fetchTasks = (projectId: number) =>
  request<Task[]>(`/api/project/${projectId}/task`)

export const fetchTaskPullRequests = (projectId: number, taskId: number) =>
  request<{ pullRequests: PullRequest[] }>(`/api/project/${projectId}/task/${taskId}/pull-requests`)
    .then((response) => response.pullRequests)

export const fetchTaskAgentResponse = (projectId: number, taskId: number) =>
  request<{ response: string | null }>(`/api/project/${projectId}/task/${taskId}/agent-response`)
    .then((response) => response.response)

export const fetchTaskConversation = (projectId: number, taskId: number) =>
  request<{ url: string | null }>(`/api/project/${projectId}/task/${taskId}/conversation`)
    .then((response) => response.url)

export const createTask = (
  projectId: number,
  task: { Title: string; Description: string; Status: Status },
) => send<Task>(`/api/project/${projectId}/task`, 'POST', task)

export const updateTask = (projectId: number, taskId: number, task: TaskDraft) =>
  send<Task>(`/api/project/${projectId}/task/${taskId}`, 'PUT', task)

export const updateTaskStatus = (
  projectId: number,
  taskId: number,
  status: Status,
) => send<Task>(`/api/project/${projectId}/task/${taskId}`, 'PUT', { Status: status })

export const fetchRepositories = () => request<Repository[]>('/api/repository')

export const fetchBranches = (repositoryName: string) =>
  request<Branch[]>(
    `/api/repository/branches?${new URLSearchParams({ repositoryName })}`,
  )

export const fetchAgents = () => request<Agent[]>('/api/agent')

export const createAgent = (agent: { name: string; description: string }) =>
  send<Agent>('/api/agent', 'POST', agent)

export const updateAgent = (
  id: string,
  agent: { name: string; description: string },
) => send<Agent>(`/api/agent/${id}`, 'PUT', agent)

export const deleteAgent = (id: string) =>
  request<{ message: string }>(`/api/agent/${id}`, { method: 'DELETE' })

export type LLMModel = 'openrouter/z-ai/glm-5.3-flash' | 'openai/gpt-5-mini'

export const LLM_MODELS: { value: LLMModel; label: string }[] = [
  { value: 'openrouter/z-ai/glm-5.3-flash', label: 'OpenRouter — GLM 4.5 Flash (z-ai)' },
  { value: 'openai/gpt-5-mini', label: 'OpenAI — GPT-5 Mini' },
]

export const DEFAULT_LLM_MODEL: LLMModel = LLM_MODELS[0].value

export const runTask = (
  projectId: number,
  taskId: number,
  agentId: string,
  repositoryName: string,
  branchName?: string,
  llmModel: LLMModel = DEFAULT_LLM_MODEL,
) =>
  send<unknown>(`/api/project/${projectId}/task/${taskId}/run`, 'POST', {
    agentId,
    repositoryName,
    branchName,
    llmModel,
  })
