import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { fetchProjects, fetchTasks } from './api'
import { STATUSES, STATUS_LABELS, type Project, type Status, type Task } from './types'

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

function TaskCard({ task }: { task: Task }) {
  return (
    <article className="task-card">
      <header>
        <h3>{task.Title}</h3>
        {task.Approved && <span className="badge-approved">Approved</span>}
      </header>
      {task.Description && <p>{task.Description}</p>}
      <footer>
        <span className="task-id">#{task.ID}</span>
        <time dateTime={task.DateCreated}>
          {new Date(task.DateCreated).toLocaleDateString()}
        </time>
      </footer>
    </article>
  )
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <p className="board-notice">Loading projects…</p>

  return (
    <main className="board">
      <header className="board-header">
        <h1>Kanban Board</h1>
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
      </header>

      {error && <p className="board-error">{error}</p>}

      <div className="board-columns">
        {STATUSES.map((status) => (
          <section key={status} className={`column column-${status}`}>
            <h2>
              {STATUS_LABELS[status]}
              <span className="count">{columns[status].length}</span>
            </h2>
            <div className="column-cards">
              {columns[status].map((task) => (
                <TaskCard key={task.ID} task={task} />
              ))}
              {columns[status].length === 0 && (
                <p className="column-empty">No tickets</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

export default App
