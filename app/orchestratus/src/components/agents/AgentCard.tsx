import { Button, Card, Group, Text } from '@mantine/core'
import type { Agent } from '../../types'

export function AgentCard({ agent, onEdit, onDelete }: { agent: Agent; onEdit: (agent: Agent) => void; onDelete: (agent: Agent) => void }) {
  return <Card className="agent-card" withBorder padding="md"><Text className="agent-card-title" fw={600} c="gray.0">{agent.name}</Text><Text className="agent-card-description" size="sm" c="gray.5" mt={8}>{agent.description}</Text><Group className="agent-card-footer" mt="md" pt="sm" grow><Button radius="xl" variant="default" onClick={() => onEdit(agent)}>Edit agent</Button><Button radius="xl" color="red" variant="light" onClick={() => onDelete(agent)}>Delete</Button></Group></Card>
}
