import type { ReactNode } from 'react'
import { AppShell, Group, Tabs, Title } from '@mantine/core'

type Tab = 'board' | 'projects' | 'agents'

interface AppLayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  headerAction?: ReactNode
  children: ReactNode
}

export function AppLayout({ activeTab, onTabChange, headerAction, children }: AppLayoutProps) {
  return (
    <AppShell header={{ height: 68 }} padding={0}>
      <AppShell.Header className="app-shell-header">
        <Group className="app-header" justify="space-between" h="100%">
          <Group gap="xl">
            <Title order={3}>Orchestratus</Title>
            <Tabs value={activeTab} onChange={(tab) => onTabChange((tab ?? 'board') as Tab)}>
              <Tabs.List>
                <Tabs.Tab value="board">Board</Tabs.Tab>
                <Tabs.Tab value="projects">Projects</Tabs.Tab>
                <Tabs.Tab value="agents">Agents</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </Group>
          {headerAction}
        </Group>
      </AppShell.Header>
      <AppShell.Main><div className="page-content">{children}</div></AppShell.Main>
    </AppShell>
  )
}
