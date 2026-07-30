"use client";

import { useState } from "react";
import { TaskDetailsModal } from "@/components/task-details-modal";
import { taskPriorityLabel } from "@/lib/task-labels";
import { isTaskBlockedByDependency } from "@/lib/workflow";

export function WeekTaskList({ tasks }) {
  const [selectedTask, setSelectedTask] = useState(null);

  return <>
    {tasks.map((task) => {
      const blocked = isTaskBlockedByDependency(task);
      return <button
        className={`week-row week-row-button ${blocked ? "blocked" : ""}`}
        type="button"
        key={task.id}
        onClick={() => setSelectedTask(task)}
        aria-label={`Visualizar detalhes da tarefa ${task.title}`}
      >
        <div>
          <b>{task.title}</b>
          <span>{task.projects?.name || "Pessoal"} · {blocked ? `Aguardando ${task.depends_on_task?.title}` : taskPriorityLabel(task.priority)}</span>
        </div>
        <time>{task.due_at ? new Date(task.due_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : "Fila"}</time>
      </button>;
    })}
    {selectedTask && <TaskDetailsModal
      task={selectedTask}
      projectSlug={selectedTask.projects?.slug || ""}
      onClose={() => setSelectedTask(null)}
    />}
  </>;
}
