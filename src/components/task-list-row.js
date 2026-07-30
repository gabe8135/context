"use client";

import Link from "next/link";
import { CheckCircle2, ChevronDown, GripVertical, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { reorderTaskQueueAction, updateTaskStatusAction } from "@/app/app/tarefas/actions";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { useTaskQueueDrag } from "@/hooks/use-task-queue-drag";
import { TASK_STATUS_LABELS, taskPriorityLabel } from "@/lib/task-labels";
import { isTaskBlockedByDependency } from "@/lib/workflow";

function dateOnly(value) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Sem prazo";
}

export function TaskListRows({ initialTasks, scope }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showCompleted, setShowCompleted] = useState(false);
  const [, startTransition] = useTransition();
  const drag = useTaskQueueDrag({
    tasks,
    setTasks,
    onCommit: (orderedIds) => startTransition(() => reorderTaskQueueAction(orderedIds, scope?.slug || "")),
  });

  function changeStatus(taskId, status) {
    const previous = tasks.find((item) => item.id === taskId)?.status;
    const updated = tasks.map((item) => item.id === taskId
      ? { ...item, status, completed_at: status === "completed" ? new Date().toISOString() : null }
      : item);
    const reopened = ["completed", "cancelled"].includes(previous) && !["completed", "cancelled"].includes(status);
    const next = reopened
      ? [...updated.filter((item) => item.id !== taskId), updated.find((item) => item.id === taskId)]
      : updated;
    setTasks(next);
    startTransition(() => updateTaskStatusAction(taskId, status, scope?.slug || ""));
  }

  const activeTasks = tasks.filter((task) => !["completed", "cancelled", "archived"].includes(task.status));
  const completedTasks = tasks
    .filter((task) => ["completed", "cancelled"].includes(task.status))
    .toSorted((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at));

  return <tbody>{activeTasks.map((task, index) => <TaskListRow
    key={task.id}
    task={task}
    index={index}
    scope={scope}
    dragging={drag.draggedId === task.id}
    dropTarget={drag.dropTargetId === task.id}
    onDragStart={(event) => drag.startDrag(event, task.id)}
    onDragMove={drag.moveDrag}
    onDragEnd={drag.finishDrag}
    onStatusChange={(status) => changeStatus(task.id, status)}
  />)}
  {completedTasks.length > 0 && <tr className="completed-tasks-divider">
    <td colSpan={scope ? 6 : 5}>
      <button type="button" onClick={() => setShowCompleted((value) => !value)} aria-expanded={showCompleted}>
        <CheckCircle2 size={16}/>
        <span>{completedTasks.length} {completedTasks.length === 1 ? "tarefa finalizada" : "tarefas finalizadas"}</span>
        <small>{showCompleted ? "Ocultar histórico" : "Mostrar histórico"}</small>
        <ChevronDown className={showCompleted ? "is-open" : ""} size={17}/>
      </button>
    </td>
  </tr>}
  {showCompleted && completedTasks.map((task, index) => <TaskListRow
    key={task.id}
    task={task}
    index={index}
    scope={scope}
    dragging={false}
    onStatusChange={(status) => changeStatus(task.id, status)}
  />)}
  </tbody>;
}

function TaskListRow({ task, index, scope, dragging, dropTarget, onDragStart, onDragMove, onDragEnd, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const projectSlug = scope?.slug || task.projects?.slug || "";
  const context = task.projects?.name || task.clients?.name || "Pessoal";
  const canReorder = scope && !["completed", "cancelled", "archived"].includes(task.status);
  const dependencyBlocked = isTaskBlockedByDependency(task);

  const openDetails = () => setOpen(true);
  const preventRowClick = (event) => event.stopPropagation();

  return <>
    <tr
      className={`task-list-row ${dragging ? "is-dragging" : ""} ${dropTarget ? "is-drop-target" : ""}`}
      data-task-id={task.id}
      data-status={task.status}
      tabIndex={0}
      role="button"
      aria-label={`Visualizar detalhes de ${task.title}`}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
    >
      {scope && <td data-label="Fila" className="task-queue-column">
        <div className="queue-cell" onClick={preventRowClick}>
          <b>{index + 1}</b>
          {canReorder && <button
            type="button"
            className="task-list-drag-handle"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            aria-label={`Arrastar ${task.title} para outra posição`}
            title="Segure e arraste para reorganizar"
          ><GripVertical size={17}/></button>}
        </div>
      </td>}
      <td data-label="Tarefa" className="task-title-column">
        <button className="task-details-trigger" type="button" onClick={openDetails}>
          <b>{task.title}</b>
          <span className="meta">{dependencyBlocked ? `Aguardando: ${task.depends_on_task?.title}` : taskPriorityLabel(task.priority)}</span>
        </button>
      </td>
      <td data-label="Contexto" className="task-context-column">{context}</td>
      <td data-label="Status" className="task-status-column" onClick={preventRowClick}>
        <select
          className={`badge task-status task-status-select status-${task.status}`}
          value={task.status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label={`Alterar status de ${task.title}`}
          title="Alterar status"
        >
          {Object.entries(TASK_STATUS_LABELS)
            .filter(([value]) => !["doing", "archived"].includes(value))
            .map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </td>
      <td data-label="Prazo" className="task-date-column">{dateOnly(task.due_at)}</td>
      <td data-label="Ações" className="task-actions-column" onClick={preventRowClick}>
        <Link className="btn compact-action" href={`/app/tarefas/${task.id}`} aria-label={`Editar ${task.title}`} title="Editar"><Pencil size={14}/><span>Editar</span></Link>
      </td>
    </tr>
    {open && <TaskDetailsModal task={task} projectSlug={projectSlug} onClose={() => setOpen(false)}/>}
  </>;
}
