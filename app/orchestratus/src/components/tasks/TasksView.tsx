import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Button, Group, Select, Stack, Text } from '@mantine/core'
import { toast } from 'sonner'
import { useCreateTask, useProjects, useRepositories, useRunTask, useTasks, useUpdateTask } from '../../queries'
import type { Task, TaskDraft } from '../../types'
import { RunTaskModal } from './RunTaskModal'
import { TaskBoard } from './TaskBoard'
import { TaskModal } from './TaskModal'
import './tasks.css'
export function TasksView({ onHeaderActionChange }: { onHeaderActionChange: (action: ReactNode) => void }) {
  const [projectId, setProjectId] = useState<number | null>(null); const [newTask, setNewTask] = useState(false); const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); const [runTaskId, setRunTaskId] = useState<number | null>(null)
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects(); const selectedProjectId = projectId ?? projects[0]?.ID ?? null; const { data: tasks = [], error: tasksError } = useTasks(selectedProjectId); const { data: repositories = [] } = useRepositories(); const createTask = useCreateTask(selectedProjectId); const updateTask = useUpdateTask(selectedProjectId); const runTask = useRunTask(selectedProjectId)
  useEffect(() => { onHeaderActionChange(<Group gap="sm"><Select aria-label="Project" value={selectedProjectId?.toString() ?? null} onChange={(value) => setProjectId(value ? Number(value) : null)} data={projects.map((project) => ({ value: String(project.ID), label: project.Title }))} placeholder="Select project" /><Button variant="gradient" disabled={selectedProjectId === null} onClick={() => setNewTask(true)}>New task</Button></Group>); return () => onHeaderActionChange(null) }, [onHeaderActionChange, projects, selectedProjectId])
  const handleCreate = async (draft: TaskDraft) => { await createTask.mutateAsync(draft); toast.success('Task created') }; const handleUpdate = async (draft: TaskDraft) => { if (!taskToEdit) return; await updateTask.mutateAsync({ taskId: taskToEdit.ID, task: draft }); toast.success('Task updated'); setTaskToEdit(null) }; const handleRun = async (opts: { agentId: string; repositoryName: string; branchName: string }) => { if (runTaskId === null) return; await runTask.mutateAsync({ taskId: runTaskId, ...opts }); toast.success('Task started'); setRunTaskId(null) }
  if (projectsLoading) return <Text className="board-notice">Loading projects…</Text>
  const error = projectsError ?? tasksError; const runTaskTarget = tasks.find((task) => task.ID === runTaskId)
  return <Stack gap="lg">{error && <Alert color="red" title="Unable to load data">{error.message}</Alert>}<TaskBoard tasks={tasks} projectId={selectedProjectId} onRun={setRunTaskId} onEdit={setTaskToEdit} />{newTask && <TaskModal onSubmit={handleCreate} onClose={() => setNewTask(false)} />}{taskToEdit && <TaskModal key={taskToEdit.ID} task={taskToEdit} onSubmit={handleUpdate} onClose={() => setTaskToEdit(null)} />}{runTaskTarget && <RunTaskModal task={runTaskTarget} projectId={selectedProjectId!} repositories={repositories} onSubmit={handleRun} onClose={() => setRunTaskId(null)} />}</Stack>
}
