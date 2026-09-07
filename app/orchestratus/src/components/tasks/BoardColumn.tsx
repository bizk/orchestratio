import { Badge, Group, Stack, Text } from '@mantine/core'
import { useDroppable } from '@dnd-kit/react'
import { STATUS_LABELS, type Status, type Task } from '../../types'
import { TaskCard } from './TaskCard'
const MAX_TICKETS_PER_COLUMN = 10
export function BoardColumn({ status, tasks, projectId, onRun, onEdit }: { status: Status; tasks: Task[]; projectId: number | null; onRun: (taskId: number) => void; onEdit: (task: Task) => void }) {
  const { ref, isDropTarget } = useDroppable({ id: `status-${status}` }); const visibleTasks = tasks.slice(0, MAX_TICKETS_PER_COLUMN)
  return <section ref={ref} className={`column${isDropTarget ? ' column-drop-target' : ''}`}><Group justify="space-between" mb="sm"><Text fw={700} size="sm">{STATUS_LABELS[status]}</Text><Badge variant="light">{tasks.length}</Badge></Group><Stack gap="sm">{visibleTasks.map((task) => <TaskCard key={task.ID} task={task} projectId={projectId} onRun={onRun} onEdit={onEdit} />)}{tasks.length > visibleTasks.length && <Text size="xs" c="dimmed" ta="center">Showing {visibleTasks.length} of {tasks.length} tickets</Text>}{tasks.length === 0 && <Text className="column-empty" size="sm" c="dimmed">No tickets</Text>}</Stack></section>
}
