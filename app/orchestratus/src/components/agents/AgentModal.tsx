import { useState, type FormEvent } from 'react'
import { Alert, Button, Group, Modal, MultiSelect, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core'
import { modalClassNames } from '../shared'
import { COLOR_SWATCHES } from '../colors'
import type { Agent, Project } from '../../types'

export interface AgentFormDraft {
  name: string
  description: string
  color: string
  is_default: boolean
  project_ids: number[]
}

export function AgentModal({ agent, projects, onSubmit, onClose }: { agent: Agent | null; projects: Project[]; onSubmit: (draft: AgentFormDraft) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [color, setColor] = useState(agent?.color ?? '#8257e6')
  const [isDefault, setIsDefault] = useState(agent?.is_default ?? false)
  const [projectIds, setProjectIds] = useState<string[]>(agent?.project_ids.map(String) ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    onSubmit({ name: name.trim(), description: description.trim(), color, is_default: isDefault, project_ids: projectIds.map(Number) }).catch((err: Error) => {
      setError(err.message)
      setSubmitting(false)
    })
  }
  return (
    <Modal opened onClose={onClose} title={agent ? 'Edit agent' : 'New agent'} centered size="lg" radius="lg" classNames={modalClassNames} overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <TextInput label="Name" value={name} onChange={(event) => setName(event.currentTarget.value)} required autoFocus />
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} minRows={8} autosize required />
          <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
            <Text component="label" size="sm" fw={500}>Color</Text>
            <Group gap={6} wrap="nowrap">
              {COLOR_SWATCHES.map((swatch) => (
                <button key={swatch} type="button" className={`app-color-swatch${swatch === color ? ' app-color-swatch-selected' : ''}`} style={{ background: swatch }} onClick={() => setColor(swatch)} aria-label={`Select color ${swatch}`} />
              ))}
            </Group>
          </Group>
          <Switch label="Default agent (available for any project, shown first)" checked={isDefault} onChange={(event) => setIsDefault(event.currentTarget.checked)} />
          <MultiSelect label="Projects" placeholder="Select projects" data={projects.map((project) => ({ value: String(project.ID), label: project.Title }))} value={projectIds} onChange={setProjectIds} clearable />
          {error && <Alert color="red">{error}</Alert>}
          <Group className="app-modal-actions" justify="flex-end" pt="md">
            <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!name.trim() || !description.trim()}>{agent ? 'Save changes' : 'Create agent'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

