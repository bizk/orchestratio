import { useState, type FormEvent } from 'react'
import { Alert, Button, Checkbox, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { modalClassNames } from '../shared'
import { STATUSES, STATUS_LABELS, type Status, type Task, type TaskDraft } from '../../types'

export function TaskModal({ task, onSubmit, onClose }: { task?: Task; onSubmit: (draft: TaskDraft) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(task?.Title ?? '')
  const [description, setDescription] = useState(task?.Description ?? '')
  const [status, setStatus] = useState<Status>(task?.Status ?? 'backlog')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createAnother, setCreateAnother] = useState(false)
  const isEditing = task !== undefined
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(null)
    onSubmit({ Title: title.trim(), Description: description.trim(), Status: status }).then(() => {
      if (!isEditing && createAnother) {
        setTitle(''); setDescription(''); setStatus('backlog'); setSubmitting(false)
      } else {
        onClose()
      }
    }).catch((err: Error) => { setError(err.message); setSubmitting(false) })
  }
  return <Modal opened onClose={onClose} title={task ? 'Edit task' : 'New ticket'} centered size="lg" radius="lg" classNames={modalClassNames} overlayProps={{ backgroundOpacity: 0.65, blur: 3 }}>
    <form onSubmit={handleSubmit}><Stack gap="sm">
      <TextInput label="Title" value={title} onChange={(event) => setTitle(event.currentTarget.value)} required autoFocus />
      <Textarea label="Description" value={description} onChange={(event) => setDescription(event.currentTarget.value)} minRows={8} autosize />
      <Select label="Status" value={status} onChange={(value) => setStatus((value ?? task?.Status ?? 'backlog') as Status)} data={STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} />
      {error && <Alert color="red">{error}</Alert>}
      <Group className="app-modal-actions" justify="flex-end" pt="md">{!task && <Checkbox label="Create another task" checked={createAnother} onChange={(event) => setCreateAnother(event.currentTarget.checked)} mr="auto" />}<Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" loading={submitting} disabled={!title.trim()}>{task ? 'Save changes' : 'Create task'}</Button></Group>
    </Stack></form>
  </Modal>
}
