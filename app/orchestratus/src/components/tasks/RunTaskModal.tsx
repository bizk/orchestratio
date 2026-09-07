import { useState, type FormEvent } from 'react'
import { Alert, Button, Group, Modal, Select, Stack, Text } from '@mantine/core'
import { useAgents, useBranches } from '../../queries'
import type { Agent, Repository, Task } from '../../types'

// Default agents first, then agents linked to the project, then the rest.
function sortedAgents(agents: Agent[], projectId: number): Agent[] {
  return [...agents].sort((a, b) => rankAgent(b, projectId) - rankAgent(a, projectId))
}

function rankAgent(agent: Agent, projectId: number): number {
  if (agent.is_default) return 2
  if (agent.project_ids?.includes(projectId)) return 1
  return 0
}

function agentLabel(agent: Agent): string {
  return agent.is_default ? `${agent.name} (default)` : agent.name
}
export function RunTaskModal({ task, projectId, repositories, onSubmit, onClose }: { task: Task; projectId: number; repositories: Repository[]; onSubmit: (opts: { agentId: string; repositoryName: string; branchName: string }) => Promise<void>; onClose: () => void }) {
  const [agentId, setAgentId] = useState(''); const [repositoryName, setRepositoryName] = useState(''); const [branchName, setBranchName] = useState(''); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null)
  const selectedRepo = repositoryName || repositories[0]?.full_name || ''; const { data: agents = [] } = useAgents(); const { data: branches = [] } = useBranches(selectedRepo); const selectedAgentId = agentId || sortedAgents(agents, projectId)[0]?.id || ''; const mainBranch = repositories.find((repository) => repository.full_name === selectedRepo)?.main_branch; const selectedBranchName = branchName || (branches.some((branch) => branch.name === mainBranch) ? mainBranch : branches[0]?.name) || ''
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); setSubmitting(true); setError(null); onSubmit({ agentId: selectedAgentId, repositoryName: selectedRepo, branchName: selectedBranchName.trim() }).catch((err: Error) => { setError(err.message); setSubmitting(false) }) }
  const orderedAgents = sortedAgents(agents, projectId)
  return <Modal opened onClose={onClose} title="Run task" centered><form onSubmit={handleSubmit}><Stack gap="sm"><Text c="dimmed" size="sm">{task.Title}</Text><Select label="Agent" value={selectedAgentId} onChange={(value) => setAgentId(value ?? '')} data={orderedAgents.map((agent) => ({ value: agent.id, label: agentLabel(agent) }))} placeholder="Select an agent" /><Select label="Repository" value={selectedRepo} onChange={(value) => { setRepositoryName(value ?? ''); setBranchName('') }} data={repositories.map((repository) => ({ value: repository.full_name, label: repository.full_name }))} placeholder="Select a repository" /><Select label="Branch" value={selectedBranchName} onChange={(value) => setBranchName(value ?? '')} data={branches.map((branch) => ({ value: branch.name, label: branch.name }))} placeholder={selectedRepo ? 'Select a branch' : 'Choose a repository first'} disabled={!selectedRepo} />{error && <Alert color="red">{error}</Alert>}<Group justify="flex-end"><Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" loading={submitting} disabled={!selectedAgentId || !selectedRepo || !selectedBranchName}>Run</Button></Group></Stack></form></Modal>
}
