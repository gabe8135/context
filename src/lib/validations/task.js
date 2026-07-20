import { z } from "zod";

export const taskSchema = z.object({
  project_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  title: z.string().trim().min(2, "Informe o título da tarefa.").max(180),
  description: z.string().trim().max(3000).optional(),
  status: z.enum(["inbox", "todo", "in_progress", "waiting_client", "waiting_third_party", "blocked", "review", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  starts_at: z.string().optional(),
  due_at: z.string().optional(),
  next_action: z.string().trim().max(300).optional(),
});

export function taskPayload(formData) {
  const value = taskSchema.parse(Object.fromEntries(formData.entries()));
  return {
    ...value,
    project_id: value.project_id || null,
    starts_at: value.starts_at || null,
    due_at: value.due_at || null,
    completed_at: value.status === "completed" ? new Date().toISOString() : null,
  };
}
