const STATUS_LABELS = {
  active: "Ativo",
  inactive: "Inativo",
  current: "Atual",
  historical: "Histórica",
  pending: "Pendente",
  pending_confirmation: "Pendente de confirmação",
  paid: "Pago",
  partially_paid: "Pago parcialmente",
  overdue: "Vencido",
  forecast: "Previsto",
  todo: "A fazer",
  doing: "Em andamento",
  in_progress: "Em andamento",
  waiting_client: "Aguardando cliente",
  waiting_third_party: "Aguardando terceiro",
  blocked: "Bloqueado",
  review: "Em revisão",
  completed: "Concluído",
  cancelled: "Cancelado",
  archived: "Arquivado",
  superseded: "Substituído",
  planned: "Planejado",
  in_production: "Em produção",
  sent: "Enviado",
  approved: "Aprovado",
  adjustment_requested: "Ajuste solicitado",
  operational: "Operacional",
  attention: "Atenção",
  error: "Erro",
  unverified: "Não verificado",
  not_applicable: "Não aplicável",
  classified: "Classificado",
  unclassified: "Não classificado",
  draft: "Rascunho",
  scheduled: "Agendado",
  open: "Aberto",
  resolved: "Resolvido"
};

const SUCCESS = new Set(["active", "current", "paid", "completed", "approved", "operational", "classified", "resolved"]);
const WARNING = new Set(["pending", "pending_confirmation", "partially_paid", "forecast", "todo", "waiting_client", "waiting_third_party", "review", "attention", "adjustment_requested", "unverified"]);
const INFO = new Set(["doing", "in_progress", "planned", "in_production", "sent", "scheduled", "open"]);
const DANGER = new Set(["overdue", "blocked", "error"]);

export function statusLabel(status) {
  if (!status) return "Não informado";
  return STATUS_LABELS[status] || String(status).replaceAll("_", " ");
}

export function statusTone(status) {
  if (SUCCESS.has(status)) return "success";
  if (WARNING.has(status)) return "warning";
  if (INFO.has(status)) return "info";
  if (DANGER.has(status)) return "danger";
  return "neutral";
}

export { STATUS_LABELS };
