# Split the Page into Feature-Oriented Components

## Summary

Refactor the 750-line `App.tsx` into small feature folders while preserving the existing tab-based UI and behavior. Avoid routing, global state, barrel files, or additional architectural layers.

Proposed structure:

```text
src/
├── App.tsx
├── App.css
├── api.ts
├── queries.ts
├── types.ts
└── components/
    ├── AppLayout.tsx
    ├── shared.ts
    ├── tasks/
    │   ├── TasksView.tsx
    │   ├── TaskBoard.tsx
    │   ├── BoardColumn.tsx
    │   ├── TaskCard.tsx
    │   ├── TaskModal.tsx
    │   ├── RunTaskModal.tsx
    │   └── tasks.css
    ├── projects/
    │   ├── ProjectsView.tsx
    │   ├── ProjectCard.tsx
    │   ├── ProjectModal.tsx
    │   └── projects.css
    └── agents/
        ├── AgentsView.tsx
        ├── AgentCard.tsx
        ├── AgentModal.tsx
        └── agents.css
```

## Implementation Changes

- Reduce `App.tsx` to active-tab state and selection of `TasksView`, `ProjectsView`, or `AgentsView`.
- Add `AppLayout` for the shared Mantine shell, header, tabs, page container, and view-specific header action.
- Make each feature view its coordinator: fetch its data, own mutations, modal state, confirmations, handlers, errors, and toast messages.
- Keep board drag/drop orchestration and task grouping in `TaskBoard`; keep individual dragging and pull-request display in `TaskCard`.
- Replace the duplicated new/edit task dialogs with one `TaskModal` accepting an optional task. Keep combined create/edit behavior in the existing project and agent modals.
- Extract repeated project and agent list markup into `ProjectCard` and `AgentCard`.
- Put shared modal class names and status badge colors in `components/shared.ts`; retain domain models and status labels in `types.ts`.
- Keep `api.ts`, `queries.ts`, `queryClient.ts`, and `types.ts` at the source root.
- Keep only shell and shared modal styling in `App.css`; move task, project, and agent styles into their feature CSS files without changing the visual design.

## Interfaces and Behavior

- Use explicit props for components rather than feature contexts or global state.
- `AppLayout` receives the active tab, tab-change callback, optional header action, and page content.
- Feature cards receive their domain object plus only applicable callbacks such as `onEdit`, `onDelete`, or `onRun`.
- Feature views remain internal UI boundaries; no backend endpoints, API payloads, query keys, or exported domain types change.
- Preserve current loading, error, empty-state, confirmation, toast, polling, task limit, and optimistic drag/drop behavior.

## Test Plan

- Run `npm run lint` and `npm run build`.
- Verify navigation among Board, Projects, and Agents and confirm each header action opens the correct dialog.
- Verify task creation, editing, running, drag/drop status changes, pull-request polling/display, and empty board columns.
- Verify project creation, editing, deletion, selected-project handling, and empty state.
