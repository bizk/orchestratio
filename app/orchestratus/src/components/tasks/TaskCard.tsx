import { ActionIcon, Anchor, Badge, Button, Card, Group, Stack, Text, Tooltip } from '@mantine/core'
import { useDraggable } from '@dnd-kit/react'
import { useTaskAgentResponse, useTaskPullRequests } from '../../queries'
import { STATUS_LABELS, type Task } from '../../types'
import { statusBadgeColors } from '../shared'

export function TaskCard({ task, projectId, onRun, onEdit, isOverlay = false }: { task: Task; projectId: number | null; onRun: (taskId: number) => void; onEdit: (task: Task) => void; isOverlay?: boolean }) {
  const { ref, isDragging } = useDraggable({ id: `task-${task.ID}`, disabled: isOverlay })
  const pullRequests = useTaskPullRequests(projectId, task.ID, task.Status).data ?? []
  const agentResponse = useTaskAgentResponse(projectId, task.ID, task.Status).data
  return <Card ref={ref} className={`task-card${isDragging ? ' task-card-dragging' : ''}${isOverlay ? ' task-card-overlay' : ''}`} data-status={task.Status} padding="md" withBorder>
    <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap"><Stack className="task-card-heading" gap={4}><Text className="task-card-kicker" size="xs" tt="uppercase">Ticket #{task.ID}</Text><Text className="task-card-title" fw={650} c="gray.0">{task.Title}</Text></Stack><Stack align="flex-end" gap={5}><Group gap="xs" wrap="nowrap"><Tooltip label="Edit task" withArrow><ActionIcon variant="subtle" color="gray" radius="xl" aria-label={`Edit task: ${task.Title}`} onClick={() => onEdit(task)}><span aria-hidden="true">✎</span></ActionIcon></Tooltip><Badge color={statusBadgeColors[task.Status]} variant="light">{STATUS_LABELS[task.Status]}</Badge></Group>{task.Approved && <Badge color="green" variant="outline">Approved</Badge>}</Stack></Group>
    <Text className={`task-card-description${task.Description ? '' : ' task-card-description-empty'}`} size="sm" c={task.Description ? 'gray.5' : 'dimmed'} mt="md" title={task.Description}>{task.Description || 'No description provided.'}</Text>
    {task.Status === 'in_progress' && <><div className={`latest-agent-response${agentResponse ? ' latest-agent-response-ready' : ''}`}><Text className="pull-request-label" size="xs" tt="uppercase">Latest agent response</Text>{agentResponse ? <Text className="latest-agent-response-text" size="sm" c="gray.3" mt={5}>{agentResponse}</Text> : <Text size="sm" c="dimmed" mt={5}>Waiting for the agent’s response.</Text>}</div><div className={`pull-request-panel${pullRequests.length > 0 ? ' pull-request-panel-ready' : ''}`}>{pullRequests.length > 0 ? <><Text className="pull-request-label" size="xs" tt="uppercase">Pull request ready</Text><Stack gap={4} mt={5}>{pullRequests.map((pullRequest) => <Anchor key={pullRequest.number} className="pull-request-link" href={pullRequest.url} target="_blank" rel="noreferrer" size="sm">Open PR #{pullRequest.number} <span aria-hidden="true">↗</span></Anchor>)}</Stack></> : <Group gap="xs" wrap="nowrap"><span className="pull-request-pulse" aria-hidden="true" /><Stack gap={1}><Text size="sm" c="gray.3">Waiting for a pull request</Text><Text size="xs" c="dimmed">We’ll check again in a minute.</Text></Stack></Group>}</div></>}
    <Group className="task-card-footer" justify="space-between" align="center" mt="md" pt="sm" gap="sm" wrap="nowrap"><Text className="task-card-meta" size="xs" c="dimmed">Created {new Date(task.DateCreated).toLocaleDateString()}</Text>
      {task.Status !== 'completed' && (
        <Tooltip label="Choose an agent and repository to run this task" withArrow><Button className="run-task-button" radius="m" variant="default" aria-label={`Run task: ${task.Title}`} onClick={() => onRun(task.ID)}>Run task</Button></Tooltip>
      )}
    </Group>
  </Card>
}
