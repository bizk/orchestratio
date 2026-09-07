import { useMemo, useState } from 'react'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import { toast } from 'sonner'
import { STATUSES, type Status, type Task } from '../../types'
import { useUpdateTaskStatus } from '../../queries'
import { BoardColumn } from './BoardColumn'
import { TaskCard } from './TaskCard'
function groupByStatus(tasks: Task[]): Record<Status, Task[]> { const grouped: Record<Status, Task[]> = { backlog: [], in_progress: [], blocked: [], completed: [] }; tasks.forEach((task) => (grouped[task.Status] ?? grouped.backlog).push(task)); return grouped }
export function TaskBoard({ tasks, projectId, onRun, onEdit }: { tasks: Task[]; projectId: number | null; onRun: (taskId: number) => void; onEdit: (task: Task) => void }) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null); const columns = useMemo(() => groupByStatus(tasks), [tasks]); const updateStatus = useUpdateTaskStatus(projectId); const activeTask = tasks.find((task) => task.ID === activeTaskId)
  return <DragDropProvider onDragStart={(event) => { const id = String(event.operation.source?.id ?? ''); setActiveTaskId(id.startsWith('task-') ? Number(id.slice(5)) : null) }} onDragEnd={(event) => { setActiveTaskId(null); if (event.canceled) return; const source = String(event.operation.source?.id ?? ''); const target = String(event.operation.target?.id ?? ''); if (!source.startsWith('task-') || !target.startsWith('status-')) return; const taskId = Number(source.slice(5)); const status = target.slice(7) as Status; const task = tasks.find((item) => item.ID === taskId); if (!task || !STATUSES.includes(status) || task.Status === status) return; updateStatus.mutate({ taskId, status }, { onError: (error) => toast.error(error.message) }) }}><div className="board-columns">{STATUSES.map((status) => <BoardColumn key={status} status={status} tasks={columns[status]} projectId={projectId} onRun={onRun} onEdit={onEdit} />)}</div><DragOverlay>{activeTask && <TaskCard task={activeTask} projectId={projectId} onRun={() => {}} onEdit={() => {}} isOverlay />}</DragOverlay></DragDropProvider>
}
