import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createTask, fetchAgents, fetchProjects, fetchTasks, runTask, updateTaskStatus } from './api'
import { STATUSES, STATUS_LABELS, type Agent, type Project, type Status, type Task } from './types'

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

function RunTaskModal({
  task,
  onSubmit,
  onClose,
}: {
  task: Task
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
  const [branchName, setBranchName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
      .then((list) => {
        setAgents(list)
        if (list.length > 0) setAgentId(list[0].id)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    onSubmit({
      agentId,
      repositoryName: repositoryName.trim(),
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
            <input
              type="text"
              placeholder="owner/repo"
              value={repositoryName}
              onChange={(e) => setRepositoryName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            Branch
            <input
              type="text"
              placeholder="main"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
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
              disabled={submitting || !agentId || !repositoryName.trim()}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<Status | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [runTaskId, setRunTaskId] = useState<number | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((list) => {
        setProjects(list)
        if (list.length > 0) setProjectId(list[0].ID)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
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
          onSubmit={handleRunTask}
          onClose={() => setRunTaskId(null)}
        />
      )}
    </main>
  )
}

export default App
