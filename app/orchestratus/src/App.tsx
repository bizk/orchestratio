import { useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core'
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react'
import { toast } from 'sonner'
import './App.css'
import { STATUSES, STATUS_LABELS, type Agent, type Project, type Repository, type Status, type Task } from './types'
import {
  useAgents,
  useBranches,
  useCreateTask,
  useDeleteAgent,
  useProjects,
  useRepositories,
  useRunTask,
  useSaveAgent,
  useTasks,
  useUpdateTaskStatus,
} from './queries'

const MAX_VISIBLE_TICKETS = 10

const modalClassNames = {
  content: 'app-modal-content',
  header: 'app-modal-header',
  title: 'app-modal-title',
  body: 'app-modal-body',
  close: 'app-modal-close',
}

function groupByStatus(tasks: Task[]): Record<Status, Task[]> {
  const grouped: Record<Status, Task[]> = {
    backlog: [],
    in_progress: [],
    blocked: [],
    completed: [],
  }
  for (const task of tasks) {
    ;(grouped[task.Status] ?? grouped.backlog).push(task)
  }
  return grouped
}

function TaskCard({
  task,
  onRun,
  isOverlay = false,
}: {
  task: Task
  onRun: (taskId: number) => void
  isOverlay?: boolean
}) {
  const { ref, isDragging } = useDraggable({
    id: `task-${task.ID}`,
    disabled: isOverlay,
  })

  return (
    <Card
      ref={ref}
      className={`task-card${isDragging ? ' task-card-dragging' : ''}${isOverlay ? ' task-card-overlay' : ''}`}
      data-status={task.Status}
      padding="md"
      withBorder
    >
      <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
        <Text className="task-card-title" fw={600} c="gray.0">{task.Title}</Text>
        {task.Approved && <Badge color="green" variant="light">Approved</Badge>}
      </Group>
      {task.Description && <Text className="task-card-description" size="sm" c="gray.5" mt={8}>{task.Description}</Text>}
      <Group className="task-card-footer" justify="space-between" mt="md" pt="sm">
        <Text size="xs" c="dimmed">#{task.ID} · {new Date(task.DateCreated).toLocaleDateString()}</Text>
        <Tooltip label="Choose an agent and repository to run this task" withArrow>
          <Button
            className="run-task-button"
            radius="m"
            variant="default"
            aria-label={`Run task: ${task.Title}`}
            onClick={() => onRun(task.ID)}
          >
            Run task
          </Button>
        </Tooltip>
      </Group>
    </Card>
  )
}

function NewTaskModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (task: { Title: string; Description: string; Status: Status }) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('backlog')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    onSubmit({ Title: title.trim(), Description: description.trim(), Status: status })
      .catch((err: Error) => {
        setError(err.message)
        setSubmitting(false)
      })
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title="New ticket"
      centered
      size="lg"
      radius="lg"
      classNames={modalClassNames}
      overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput label="Title" value={title} onChange={(event) => setTitle(event.currentTarget.value)} required autoFocus />
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} minRows={8} autosize />
          <Select label="Status" value={status} onChange={(value) => setStatus((value ?? 'backlog') as Status)} data={STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} />
          {error && <Alert color="red">{error}</Alert>}
          <Group className="app-modal-actions" justify="flex-end" pt="md">
            <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!title.trim()}>Create task</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function AgentModal({
  agent,
  onSubmit,
  onClose,
}: {
  agent: Agent | null
  onSubmit: (agent: { name: string; description: string }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    onSubmit({ name: name.trim(), description: description.trim() })
      .catch((err: Error) => {
        setError(err.message)
        setSubmitting(false)
      })
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={agent ? 'Edit agent' : 'New agent'}
      centered
      size="lg"
      radius="lg"
      classNames={modalClassNames}
      overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput label="Name" value={name} onChange={(event) => setName(event.currentTarget.value)} required autoFocus />
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} minRows={8} autosize required />
          {error && <Alert color="red">{error}</Alert>}
          <Group className="app-modal-actions" justify="flex-end" pt="md">
            <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!name.trim() || !description.trim()}>
              {agent ? 'Save changes' : 'Create agent'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function AgentsSection({
  agents,
  onEdit,
  onDelete,
}: {
  agents: Agent[]
  onEdit: (agent: Agent) => void
  onDelete: (agent: Agent) => void
}) {
  return (
    <section aria-label="Available agents">
      <Title order={2} mb="md">Agents</Title>
      {agents.length === 0 ? (
        <Text c="dimmed">No agents available.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {agents.map((agent) => (
            <Card key={agent.id} className="agent-card" withBorder padding="md">
              <Text className="agent-card-title" fw={600} c="gray.0">{agent.name}</Text>
              <Text className="agent-card-description" size="sm" c="gray.5" mt={8}>{agent.description}</Text>
              <Group className="agent-card-footer" mt="md" pt="sm" grow>
                <Button radius="xl" variant="default" onClick={() => onEdit(agent)}>Edit agent</Button>
                <Button radius="xl" color="red" variant="light" onClick={() => onDelete(agent)}>Delete</Button>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </section>
  )
}

function RunTaskModal({
  task,
  repositories,
  onSubmit,
  onClose,
}: {
  task: Task
  repositories: Repository[]
  onSubmit: (opts: {
    agentId: string
    repositoryName: string
    branchName: string
  }) => Promise<void>
  onClose: () => void
}) {
  const [agentId, setAgentId] = useState('')
  const [repositoryName, setRepositoryName] = useState('')
  const [branchName, setBranchName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRepo = repositoryName || repositories[0]?.full_name || ''
  const { data: agents = [] } = useAgents()
  const { data: branches = [] } = useBranches(selectedRepo)
  const selectedAgentId = agentId || agents[0]?.id || ''
  const mainBranch = repositories.find((repository) => repository.full_name === selectedRepo)?.main_branch
  const selectedBranchName = branchName || (
    branches.some((branch) => branch.name === mainBranch) ? mainBranch : branches[0]?.name
  ) || ''

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    onSubmit({
      agentId: selectedAgentId,
      repositoryName: selectedRepo,
      branchName: selectedBranchName.trim(),
    })
      .catch((err: Error) => {
        setError(err.message)
        setSubmitting(false)
      })
  }

  return (
    <Modal opened onClose={onClose} title="Run task" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <Text c="dimmed" size="sm">{task.Title}</Text>
          <Select label="Agent" value={selectedAgentId} onChange={(value) => setAgentId(value ?? '')} data={agents.map((agent) => ({ value: agent.id, label: agent.name }))} placeholder="Select an agent" />
          <Select label="Repository" value={selectedRepo} onChange={(value) => { setRepositoryName(value ?? ''); setBranchName('') }} data={repositories.map((repository) => ({ value: repository.full_name, label: repository.full_name }))} placeholder="Select a repository" />
          <Select label="Branch" value={selectedBranchName} onChange={(value) => setBranchName(value ?? '')} data={branches.map((branch) => ({ value: branch.name, label: branch.name }))} placeholder={selectedRepo ? 'Select a branch' : 'Choose a repository first'} disabled={!selectedRepo} />
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!selectedAgentId || !selectedRepo || !selectedBranchName}>Run</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

function BoardColumn({
  status,
  tasks,
  onRun,
}: {
  status: Status
  tasks: Task[]
  onRun: (taskId: number) => void
}) {
  const { ref, isDropTarget } = useDroppable({ id: `status-${status}` })
  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TICKETS)
  const hiddenTaskCount = tasks.length - visibleTasks.length

  return (
    <section ref={ref} className={`column${isDropTarget ? ' column-drop-target' : ''}`}>
      <Group justify="space-between" mb="sm">
        <Text fw={700} size="sm">{STATUS_LABELS[status]}</Text>
        <Badge variant="light">{tasks.length}</Badge>
      </Group>
      <Stack gap="sm">
        {visibleTasks.map((task) => <TaskCard key={task.ID} task={task} onRun={onRun} />)}
        {hiddenTaskCount > 0 && <Text className="column-empty" size="sm" c="dimmed">{hiddenTaskCount} more tickets</Text>}
        {tasks.length === 0 && <Text className="column-empty" size="sm" c="dimmed">No tickets</Text>}
      </Stack>
    </section>
  )
}

function App() {
  const [projectId, setProjectId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>('board')
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [runTaskId, setRunTaskId] = useState<number | null>(null)
  const [agentModal, setAgentModal] = useState<'new' | Agent | null>(null)

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects()
  const selectedProjectId = projectId ?? projects[0]?.ID ?? null
  const { data: tasks = [], error: tasksError } = useTasks(selectedProjectId)
  const { data: agents = [], error: agentsError } = useAgents()
  const { data: repositories = [] } = useRepositories()
  const createTaskMutation = useCreateTask(selectedProjectId)
  const updateTaskStatusMutation = useUpdateTaskStatus(selectedProjectId)
  const saveAgentMutation = useSaveAgent()
  const deleteAgentMutation = useDeleteAgent()
  const runTaskMutation = useRunTask(selectedProjectId)

  const columns = useMemo(() => groupByStatus(tasks), [tasks])

  const handleDragEnd = (event: { canceled: boolean; operation: { source: { id: string | number } | null; target: { id: string | number } | null } }) => {
    setActiveTaskId(null)
    if (event.canceled) return
    const sourceId = String(event.operation.source?.id ?? '')
    const targetId = String(event.operation.target?.id ?? '')
    if (!sourceId.startsWith('task-') || !targetId.startsWith('status-')) return
    const taskId = Number(sourceId.slice(5))
    const status = targetId.slice(7) as Status
    const task = tasks.find((item) => item.ID === taskId)
    if (!task || !STATUSES.includes(status) || task.Status === status) return
    updateTaskStatusMutation.mutate({ taskId, status }, {
      onError: (error) => toast.error(error.message),
    })
  }

  const handleCreateTask = async (task: {
    Title: string
    Description: string
    Status: Status
  }) => {
    await createTaskMutation.mutateAsync(task)
    toast.success('Task created')
    setShowNewTask(false)
  }

  const handleRunTask = async (opts: {
    agentId: string
    repositoryName: string
    branchName: string
  }) => {
    if (runTaskId === null) return
    await runTaskMutation.mutateAsync({ taskId: runTaskId, ...opts })
    toast.success('Task started')
    setRunTaskId(null)
  }
  const handleSaveAgent = async (draft: { name: string; description: string }) => {
    if (agentModal === null) return
    const editingAgent = agentModal === 'new' ? null : agentModal
    await saveAgentMutation.mutateAsync({ agent: editingAgent, draft })
    toast.success(editingAgent ? 'Agent updated' : 'Agent created')
    setAgentModal(null)
  }

  const handleDeleteAgent = (agent: Agent) => {
    if (!window.confirm(`Delete agent "${agent.name}"?`)) return
    deleteAgentMutation.mutate(agent.id, {
      onSuccess: () => toast.success('Agent deleted'),
      onError: (error) => toast.error(error.message),
    })
  }

  const runTaskTarget = tasks.find((t) => t.ID === runTaskId)
  const activeTask = tasks.find((task) => task.ID === activeTaskId)
  const error = projectsError ?? tasksError ?? agentsError

  if (projectsLoading) return <Text className="board-notice">Loading projects…</Text>

  return (
    <AppShell header={{ height: 68 }} padding={0}>
      <AppShell.Header className="app-shell-header">
        <Group className="app-header" justify="space-between" h="100%">
          <Group gap="xl">
            <Title order={3}>Orchestratus</Title>
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="board">Board</Tabs.Tab>
                <Tabs.Tab value="agents">Agents</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>
          {activeTab === 'board' && (
            <Group gap="sm">
              <Select aria-label="Project" value={selectedProjectId?.toString() ?? null} onChange={(value) => setProjectId(value ? Number(value) : null)} data={projects.map((project: Project) => ({ value: String(project.ID), label: project.Title }))} placeholder="Select project" />
              <Button variant='gradient' disabled={selectedProjectId === null} onClick={() => setShowNewTask(true)}>New task</Button>
            </Group>
          )}
          {activeTab === 'agents' && <Button variant="gradient" onClick={() => setAgentModal('new')}>New agent</Button>}
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <div className="page-content">
        <Stack gap="lg">
          {error && <Alert color="red" title="Unable to load data">{error.message}</Alert>}
          {activeTab === 'board' && (
            <DragDropProvider
              onDragStart={(event) => {
                const id = String(event.operation.source?.id ?? '')
                setActiveTaskId(id.startsWith('task-') ? Number(id.slice(5)) : null)
              }}
              onDragEnd={handleDragEnd}
            >
              <div className="board-columns">
                {STATUSES.map((status) => <BoardColumn key={status} status={status} tasks={columns[status]} onRun={setRunTaskId} />)}
              </div>
              <DragOverlay>{activeTask ? <TaskCard task={activeTask} onRun={() => {}} isOverlay /> : null}</DragOverlay>
            </DragDropProvider>
          )}
          {activeTab === 'agents' && <AgentsSection agents={agents} onEdit={setAgentModal} onDelete={handleDeleteAgent} />}
        </Stack>

        {showNewTask && <NewTaskModal onSubmit={handleCreateTask} onClose={() => setShowNewTask(false)} />}
        {runTaskTarget && <RunTaskModal task={runTaskTarget} repositories={repositories} onSubmit={handleRunTask} onClose={() => setRunTaskId(null)} />}
        {agentModal !== null && <AgentModal key={agentModal === 'new' ? 'new' : agentModal.id} agent={agentModal === 'new' ? null : agentModal} onSubmit={handleSaveAgent} onClose={() => setAgentModal(null)} />}
        </div>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
