import { Badge, Button, Card, Group, Text } from '@mantine/core'
import type { Agent } from '../../types'

export function AgentCard({ agent, onEdit, onDelete }: { agent: Agent; onEdit: (agent: Agent) => void; onDelete: (agent: Agent) => void }) {
  const color = agent.color || '#8257e6'
  return (
    <Card
      className="agent-card"
      withBorder
      padding="md"
      style={{
        borderLeft: '3px solid transparent',
        borderImage: `linear-gradient(to bottom, ${color}, transparent) 1`,
        backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${color}26 0%, transparent 55%)`,
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Text className="agent-card-title" fw={600} c="gray.0">{agent.name}</Text>
        <Group gap="xs" wrap="nowrap">
          {agent.is_default && <Badge size="sm" variant="light" style={{ color, backgroundColor: `${color}26` }}>Default</Badge>}
          <span className="agent-card-swatch" style={{ background: `linear-gradient(135deg, ${color}, ${color}55)` }} />
        </Group>
      </Group>
      <Text className="agent-card-description" size="sm" c="gray.5" mt={8}>{agent.description}</Text>
      <Group className="agent-card-footer" mt="md" pt="sm" grow>
        <Button radius="xl" variant="default" onClick={() => onEdit(agent)}>Edit agent</Button>
        <Button radius="xl" color="red" variant="light" onClick={() => onDelete(agent)}>Delete</Button>
      </Group>
    </Card>
  )
}
