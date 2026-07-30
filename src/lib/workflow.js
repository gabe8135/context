const FINAL_TASK_STATUSES = new Set(["completed", "cancelled", "archived"]);

export function isTaskOpen(task) {
  return !task.archived_at && !FINAL_TASK_STATUSES.has(task.status);
}

export function isTaskBlockedByDependency(task) {
  return Boolean(task.depends_on_task_id && task.depends_on_task?.status !== "completed");
}

export async function attachTaskDependencies(supabase, tasks = []) {
  const ids = [...new Set(tasks.map((task) => task.depends_on_task_id).filter(Boolean))];
  if (!ids.length) return tasks;
  const { data, error } = await supabase.from("tasks").select("id,status,title").in("id", ids);
  if (error) throw error;
  const dependencies = new Map((data || []).map((task) => [task.id, task]));
  return tasks.map((task) => ({
    ...task,
    depends_on_task: task.depends_on_task_id ? dependencies.get(task.depends_on_task_id) || null : null,
  }));
}

export function nextRecurringDate(value, rule, interval = 1) {
  if (!value || !["daily", "weekly", "monthly"].includes(rule)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const amount = Math.max(1, Number(interval) || 1);
  if (rule === "daily") date.setDate(date.getDate() + amount);
  if (rule === "weekly") date.setDate(date.getDate() + amount * 7);
  if (rule === "monthly") date.setMonth(date.getMonth() + amount);
  return date;
}

export function taskFocusScore(task, now = new Date()) {
  if (!isTaskOpen(task) || isTaskBlockedByDependency(task)) return Number.NEGATIVE_INFINITY;
  const priority = { urgent: 70, high: 45, medium: 25, low: 10 }[task.priority] || 0;
  const queue = Math.max(0, 20 - Math.floor(Number(task.queue_position || 0) / 1000));
  if (!task.due_at) return priority + queue;
  const hours = (new Date(task.due_at) - now) / 36e5;
  if (hours < 0) return 120 + priority + Math.min(48, Math.abs(hours) / 6);
  if (hours <= 24) return 95 + priority;
  if (hours <= 72) return 65 + priority;
  if (hours <= 168) return 35 + priority;
  return priority + queue;
}

export function chooseCurrentFocus(tasks, now = new Date()) {
  return [...tasks]
    .filter((task) => isTaskOpen(task) && !isTaskBlockedByDependency(task))
    .sort((a, b) => taskFocusScore(b, now) - taskFocusScore(a, now))[0] || null;
}

export function buildNarrativeSummary({ activities = [], tasks = [], from, to }) {
  const start = from ? new Date(from) : new Date(Date.now() - 7 * 864e5);
  const end = to ? new Date(to) : new Date();
  const recent = activities.filter((item) => {
    const date = new Date(item.created_at);
    return date >= start && date <= end;
  });
  const completed = recent.filter((item) => item.type === "task_completed").length;
  const created = recent.filter((item) => item.type === "task_created").length;
  const decisions = recent.filter((item) => item.type?.includes("decision")).length;
  const meetings = recent.filter((item) => item.type?.includes("meeting")).length;
  const pending = tasks.filter(isTaskOpen).length;
  const parts = [];
  if (completed) parts.push(`${completed} tarefa${completed === 1 ? " foi concluída" : "s foram concluídas"}`);
  if (created) parts.push(`${created} nova${created === 1 ? " tarefa entrou" : "s tarefas entraram"} na fila`);
  if (decisions) parts.push(`${decisions} decisão${decisions === 1 ? " foi registrada" : "ões foram registradas"}`);
  if (meetings) parts.push(`${meetings} encontro${meetings === 1 ? " foi registrado" : "s foram registrados"}`);
  if (!parts.length) parts.push("não houve movimentações registradas");
  return `Nesta semana, ${parts.join(", ")}. ${pending ? `${pending === 1 ? "Resta" : "Restam"} ${pending} pendência${pending === 1 ? "" : "s"} em aberto.` : "Não há pendências abertas."}`;
}
