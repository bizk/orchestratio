import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createAgent,
  createTask,
  deleteAgent,
  fetchAgents,
  fetchBranches,
  fetchProjects,
  fetchRepositories,
  fetchTaskPullRequests,
  fetchTasks,
  runTask,
  updateAgent,
  updateTask,
  updateTaskStatus,
} from './api'
import type { Agent, PullRequest, Status, Task, TaskDraft } from './types'

const PULL_REQUEST_POLL_INTERVAL = 60_000

export const queryKeys = {
  projects: ['projects'] as const,
  tasks: (projectId: number) => ['tasks', projectId] as const,
  agents: ['agents'] as const,
  repositories: ['repositories'] as const,
  branches: (repositoryName: string) => ['branches', repositoryName] as const,
  taskPullRequests: (projectId: number, taskId: number) => ['task-pull-requests', projectId, taskId] as const,
}

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects })
}

export function useTasks(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId ?? 0),
    queryFn: () => fetchTasks(projectId!),
    enabled: projectId !== null,
  })
}

export function useAgents() {
  return useQuery({ queryKey: queryKeys.agents, queryFn: fetchAgents })
}

export function useRepositories() {
  return useQuery({ queryKey: queryKeys.repositories, queryFn: fetchRepositories })
}

export function useBranches(repositoryName: string) {
  return useQuery({
    queryKey: queryKeys.branches(repositoryName),
    queryFn: () => fetchBranches(repositoryName),
    enabled: Boolean(repositoryName),
  })
}

export function useCreateTask(projectId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (task: { Title: string; Description: string; Status: Status }) =>
      createTask(projectId!, task),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(queryKeys.tasks(projectId!), (tasks = []) => [
        task,
        ...tasks,
      ])
    },
  })
}

export function useUpdateTask(projectId: number | null) {
  const queryClient = useQueryClient()
  const key = queryKeys.tasks(projectId ?? 0)

  return useMutation({
    mutationFn: ({ taskId, task }: { taskId: number; task: TaskDraft }) =>
      updateTask(projectId!, taskId, task),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(key, (tasks = []) =>
        tasks.map((task) => (task.ID === updatedTask.ID ? updatedTask : task)),
      )
    },
  })
}

export function useUpdateTaskStatus(projectId: number | null) {
  const queryClient = useQueryClient()
  const key = queryKeys.tasks(projectId ?? 0)

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: Status }) =>
      updateTaskStatus(projectId!, taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previousTasks = queryClient.getQueryData<Task[]>(key)
      queryClient.setQueryData<Task[]>(
        key,
        (tasks = []) => tasks.map((task) => (task.ID === taskId ? { ...task, Status: status } : task)),
      )
      return { previousTasks }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(key, context?.previousTasks)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useSaveAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ agent, draft }: { agent: Agent | null; draft: { name: string; description: string } }) =>
      agent ? updateAgent(agent.id, draft) : createAgent(draft),
    onSuccess: (saved) => {
      queryClient.setQueryData<Agent[]>(queryKeys.agents, (agents = []) => {
        const exists = agents.some((agent) => agent.id === saved.id)
        return exists ? agents.map((agent) => (agent.id === saved.id ? saved : agent)) : [...agents, saved]
      })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Agent[]>(
        queryKeys.agents,
        (agents = []) => agents.filter((agent) => agent.id !== id),
      )
    },
  })
}

export function useRunTask(projectId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      agentId,
      repositoryName,
      branchName,
    }: {
      taskId: number
      agentId: string
      repositoryName: string
      branchName: string
    }) => runTask(projectId!, taskId, agentId, repositoryName, branchName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId!) }),
  })
}

export function useTaskPullRequests(
  projectId: number | null,
  taskId: number,
  status: Status,
) {
  return useQuery<PullRequest[]>({
    queryKey: queryKeys.taskPullRequests(projectId ?? 0, taskId),
    queryFn: () => fetchTaskPullRequests(projectId!, taskId),
    enabled: projectId !== null && status === 'in_progress',
    refetchOnMount: (query) => !query.state.data?.length,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) => query.state.data?.length ? false : PULL_REQUEST_POLL_INTERVAL,
  })
}
