import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createAgent, createTask, deleteAgent, fetchAgents,fetchBranches, fetchProjects, fetchRepositories, fetchTasks, runTask, updateAgent, updateTaskStatus } from './api'
import { STATUSES, STATUS_LABELS, type Agent, type Branch, type Project, type Repository, type Status, type Task } from './types'

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
  onDragStart,
  onRun,
}: {
  task: Task
  onDragStart: (taskId: number) => void
  onRun: (taskId: number) => void
}) {
  return (
    <article
      className="task-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(task.ID))
        onDragStart(task.ID)
      }}
    >
      <header>
        <h3>{task.Title}</h3>
        {task.Approved && <span className="badge-approved">Approved</span>}
      </header>
      {task.Description && <p>{task.Description}</p>}
      <footer>
        <div className="task-meta">
          <span className="task-id">#{task.ID}</span>
          <time dateTime={task.DateCreated}>
            {new Date(task.DateCreated).toLocaleDateString()}
          </time>
        </div>
        <button
          type="button"
          className="btn btn-run"
          onClick={() => onRun(task.ID)}
        >
          Run
        </button>
      </footer>
    </article>
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

  const handleSubmit = (e: React.FormEvent) => {
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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New task"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>New Task</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="board-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !title.trim()}>
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  const handleSubmit = (e: React.FormEvent) => {
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
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={agent ? 'Edit agent' : 'New agent'}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{agent ? 'Edit Agent' : 'New Agent'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </label>
          {error && <p className="board-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !name.trim() || !description.trim()}
            >
              {submitting ? 'Saving…' : agent ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AgentsSection({
  agents,
  onNew,
  onEdit,
  onDelete,
}: {
  agents: Agent[]
  onNew: () => void
  onEdit: (agent: Agent) => void
  onDelete: (agent: Agent) => void
}) {
  return (
    <section className="agents-section" aria-label="Available agents">
      <div className="agents-header">
        <h2>Available Agents</h2>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          + New Agent
        </button>
      </div>
      {agents.length === 0 ? (
        <p className="agents-empty">No agents available</p>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <article key={agent.id} className="agent-card">
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
              <footer>
                <button type="button" className="btn" onClick={() => onEdit(agent)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => onDelete(agent)}
                >
                  Delete
                </button>
              </footer>
            </article>
          ))}
        </div>
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
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState('')
  const [repositoryName, setRepositoryName] = useState('')
  const [branchList, setBranchList] = useState<{ repo: string; items: Branch[] } | null>(null)
  const [branchName, setBranchName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fall back to the first preloaded repository until the user picks one.
  const selectedRepo = repositoryName || repositories[0]?.full_name || ''
  const branches = branchList?.repo === selectedRepo ? branchList.items : []

  useEffect(() => {
    fetchAgents()
      .then((list) => {
        setAgents(list)
        if (list.length > 0) setAgentId(list[0].id)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedRepo) return
    let cancelled = false
    fetchBranches(selectedRepo)
      .then((list) => {
        if (cancelled) return
        setBranchList({ repo: selectedRepo, items: list })
        const main = repositories.find((r) => r.full_name === selectedRepo)?.main_branch
        setBranchName(
          list.some((b) => b.name === main) ? main! : (list[0]?.name ?? ''),
        )
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [selectedRepo, repositories])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    onSubmit({
      agentId,
      repositoryName: selectedRepo,
      branchName: branchName.trim(),
    })
      .catch((err: Error) => {
        setError(err.message)
        setSubmitting(false)
      })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Run task"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Run Task</h2>
        <form onSubmit={handleSubmit}>
          <p className="modal-task-title">{task.Title}</p>
          <label>
            Agent
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.length === 0 && <option value="">No agents</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Repository
            <select
              value={selectedRepo}
              onChange={(e) => setRepositoryName(e.target.value)}
            >
              {repositories.length === 0 && <option value="">No repositories</option>}
              {repositories.map((r) => (
                <option key={r.id} value={r.full_name}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Branch
            <select
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            >
              {branches.length === 0 && <option value="">Loading branches…</option>}
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="board-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !agentId || !selectedRepo}
            >
              {submitting ? 'Running…' : 'Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<Status | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [runTaskId, setRunTaskId] = useState<number | null>(null)
  const [agentModal, setAgentModal] = useState<'new' | Agent | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((list) => {
        setProjects(list)
        if (list.length > 0) setProjectId(list[0].ID)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))

    fetchAgents()
      .then(setAgents)
      .catch(() => {})

    fetchRepositories()
      .then(setRepositories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (projectId === null) return
    fetchTasks(projectId)
      .then((list) => {
        setTasks(list)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
  }, [projectId])

  const columns = useMemo(() => groupByStatus(tasks), [tasks])

  const handleDrop = (status: Status) => {
    setDropTarget(null)
    if (draggedTaskId === null || projectId === null) return
    const task = tasks.find((t) => t.ID === draggedTaskId)
    setDraggedTaskId(null)
    if (!task || task.Status === status) return

    // Optimistic update; revert and refetch on failure.
    setTasks((prev) =>
      prev.map((t) => (t.ID === task.ID ? { ...t, Status: status } : t)),
    )
    updateTaskStatus(projectId, task.ID, status).catch((err: Error) => {
      setError(err.message)
      if (projectId !== null) {
        fetchTasks(projectId).then(setTasks).catch(() => {})
      }
    })
  }

  const handleCreateTask = async (task: {
    Title: string
    Description: string
    Status: Status
  }) => {
    if (projectId === null) return
    const created = await createTask(projectId, task)
    setTasks((prev) => [created, ...prev])
    setShowNewTask(false)
  }

  const handleRunTask = async (opts: {
    agentId: string
    repositoryName: string
    branchName: string
  }) => {
    if (projectId === null || runTaskId === null) return
    const taskId = runTaskId
    await runTask(projectId, taskId, opts.agentId, opts.repositoryName, opts.branchName)
    // The server sets the task to in_progress; mirror it optimistically.
    setTasks((prev) =>
      prev.map((t) => (t.ID === taskId ? { ...t, Status: 'in_progress' as Status } : t)),
    )
    setRunTaskId(null)
  }
  const handleSaveAgent = async (draft: { name: string; description: string }) => {
    if (agentModal === null) return
    const saved =
      agentModal === 'new'
        ? await createAgent(draft)
        : await updateAgent(agentModal.id, draft)
    setAgents((prev) =>
      agentModal === 'new'
        ? [...prev, saved]
        : prev.map((a) => (a.id === saved.id ? saved : a)),
    )
    setAgentModal(null)
  }

  const handleDeleteAgent = (agent: Agent) => {
    if (!window.confirm(`Delete agent "${agent.name}"?`)) return
    setError(null)
    deleteAgent(agent.id)
      .then(() => setAgents((prev) => prev.filter((a) => a.id !== agent.id)))
      .catch((err: Error) => setError(err.message))
  }

  const runTaskTarget = tasks.find((t) => t.ID === runTaskId)

  if (loading) return <p className="board-notice">Loading projects…</p>

  return (
    <main className="board">
      <header className="board-header">
        <h1>Kanban Board</h1>
        <div className="board-header-actions">
          <label>
            Project{' '}
            <select
              value={projectId ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setProjectId(id > 0 ? id : null)
              }}
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((p) => (
                <option key={p.ID} value={p.ID}>
                  {p.Title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={projectId === null}
            onClick={() => setShowNewTask(true)}
          >
            + New Task
          </button>
        </div>
      </header>

      {error && <p className="board-error">{error}</p>}

      <AgentsSection
        agents={agents}
        onNew={() => setAgentModal('new')}
        onEdit={setAgentModal}
        onDelete={handleDeleteAgent}
      />

      <div className="board-columns">
        {STATUSES.map((status) => (
          <section
            key={status}
            className={`column column-${status}${dropTarget === status ? ' column-drop-target' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (dropTarget !== status) setDropTarget(status)
            }}
            onDragLeave={() => {
              if (dropTarget === status) setDropTarget(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(status)
            }}
          >
            <h2>
              {STATUS_LABELS[status]}
              <span className="count">{columns[status].length}</span>
            </h2>
            <div className="column-cards">
              {columns[status].map((task) => (
                <TaskCard
                  key={task.ID}
                  task={task}
                  onDragStart={setDraggedTaskId}
                  onRun={setRunTaskId}
                />
              ))}
              {columns[status].length === 0 && (
                <p className="column-empty">No tickets</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {showNewTask && (
        <NewTaskModal
          onSubmit={handleCreateTask}
          onClose={() => setShowNewTask(false)}
        />
      )}

      {runTaskTarget && (
        <RunTaskModal
          task={runTaskTarget}
          repositories={repositories}
          onSubmit={handleRunTask}
          onClose={() => setRunTaskId(null)}
        />
      )}

      {agentModal !== null && (
        <AgentModal
          key={agentModal === 'new' ? 'new' : agentModal.id}
          agent={agentModal === 'new' ? null : agentModal}
          onSubmit={handleSaveAgent}
          onClose={() => setAgentModal(null)}
        />
      )}
    </main>
  )
}

export default App
