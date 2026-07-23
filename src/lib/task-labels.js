export const TASK_STATUS_LABELS = {
  todo: "A fazer",
  in_progress: "Em andamento",
  doing: "Em andamento",
  waiting_client: "Aguardando cliente",
  waiting_third_party: "Aguardando terceiro",
  blocked: "Bloqueada",
  review: "Em revisão",
  completed: "Concluída",
  cancelled: "Cancelada",
  archived: "Arquivada",
};

export const TASK_PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status || "Sem status";
}

export function taskPriorityLabel(priority) {
  return TASK_PRIORITY_LABELS[priority] || priority || "Sem prioridade";
}
