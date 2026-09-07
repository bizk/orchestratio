import type { Status } from '../types'

export const modalClassNames = {
  content: 'app-modal-content',
  header: 'app-modal-header',
  title: 'app-modal-title',
  body: 'app-modal-body',
  close: 'app-modal-close',
}

export const statusBadgeColors: Record<Status, string> = {
  backlog: 'gray',
  in_progress: 'blue',
  blocked: 'red',
  review: 'grape',
  completed: 'green',
}
