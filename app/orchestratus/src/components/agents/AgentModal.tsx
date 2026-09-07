import { useState, type FormEvent } from 'react'
import { Alert, Button, Group, Modal, Stack, Textarea, TextInput } from '@mantine/core'
import { modalClassNames } from '../shared'
import type { Agent } from '../../types'

export function AgentModal({ agent, onSubmit, onClose }: { agent: Agent | null; onSubmit: (draft: { name: string; description: string }) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(agent?.name ?? ''); const [description, setDescription] = useState(agent?.description ?? ''); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null)
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitting(true); setError(null); onSubmit({ name: name.trim(), description: description.trim() }).catch((err: Error) => { setError(err.message); setSubmitting(false) }) }
  return <Modal opened onClose={onClose} title={agent ? 'Edit agent' : 'New agent'} centered size="lg" radius="lg" classNames={modalClassNames} overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}><form onSubmit={submit}><Stack gap="sm"><TextInput label="Name" value={name} onChange={(event) => setName(event.currentTarget.value)} required autoFocus /><Textarea label="Description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} minRows={8} autosize required />{error && <Alert color="red">{error}</Alert>}<Group className="app-modal-actions" justify="flex-end" pt="md"><Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" loading={submitting} disabled={!name.trim() || !description.trim()}>{agent ? 'Save changes' : 'Create agent'}</Button></Group></Stack></form></Modal>
}
