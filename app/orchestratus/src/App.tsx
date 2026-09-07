import { useCallback, useState, type ReactNode } from 'react'
import './App.css'
import { AppLayout } from './components/AppLayout'
import { AgentsView } from './components/agents/AgentsView'
import { ProjectsView } from './components/projects/ProjectsView'
import { TasksView } from './components/tasks/TasksView'

type Tab = 'board' | 'projects' | 'agents'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('board')
  const [headerAction, setHeaderAction] = useState<ReactNode>(null)
  const setAction = useCallback((action: ReactNode) => setHeaderAction(action), [])
  const view = activeTab === 'board'
    ? <TasksView onHeaderActionChange={setAction} />
    : activeTab === 'projects'
      ? <ProjectsView onHeaderActionChange={setAction} />
      : <AgentsView onHeaderActionChange={setAction} />
  return <AppLayout activeTab={activeTab} onTabChange={setActiveTab} headerAction={headerAction}>{view}</AppLayout>
}
